import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BeatmapSet,
  Beatmap,
  GameMode,
  GameRuntime,
  LoadedBeatmapSet,
  Settings,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import {
  searchBeatmapsets as apiSearch,
  fetchFeatured as apiFeatured,
  fetchBeatmapSet as apiFetchSet,
  searchSayobot,
  fetchSayobotFeatured,
  searchKitsu,
  searchChimu,
  searchNerinyan,
  searchAllSources,
  downloadOszRacing,
} from "@/api/osuDirect";
import { extractOsz, extractOszFromFile, extractOsk, extractHitSounds } from "@/utils/oszLoader";
import { saveDownload, loadAllDownloads, deleteDownload, clearAllDownloads, saveCustomHitSounds, loadCustomHitSounds, deleteCustomHitSounds, saveCustomSkin, loadCustomSkin, deleteCustomSkin, updateDownloadLyrics } from "@/utils/indexedDb";
import { fetchLyrics } from "@/utils/lyricsProvider";

const EMPTY_RUNTIME: GameRuntime = {
  setId: 0,
  beatmap: {} as Beatmap,
  mode: "standard",
  status: "loading",
  score: 0,
  combo: 0,
  maxCombo: 0,
  accuracy: 100,
  health: 100,
  judgements: { "300": 0, "100": 0, "50": 0, miss: 0 },
};

/** 后台下载任务 */
export interface BgDownloadTask {
  setId: number;
  title: string;
  artist: string;
  progress: number; // 0-1
  status: "downloading" | "extracting" | "done" | "error";
  error?: string;
}

interface GameState {
  // 设置
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setTheme: (theme: "light" | "dark") => void;

  // 搜索 / 列表
  searchQuery: string;
  searchMode: GameMode | null;
  searchResults: BeatmapSet[];
  searchLoading: boolean;
  searchError: string | null;
  search: (query: string, mode?: GameMode | null) => Promise<void>;
  loadFeatured: (mode?: GameMode | null) => Promise<void>;

  // 详情
  detailSet: BeatmapSet | null;
  detailLoading: boolean;
  loadDetail: (setId: number) => Promise<void>;

  // 已下载
  downloaded: Map<number, LoadedBeatmapSet>;
  downloadsReady: boolean;
  downloadProgress: number; // 0-1
  downloadError: string | null;
  downloadSet: (set: BeatmapSet, force?: boolean, fullPackage?: boolean) => Promise<LoadedBeatmapSet | null>;
  deleteDownload: (setId: number) => Promise<void>;
  clearDownloads: () => Promise<void>;
  loadDownloads: () => Promise<void>;
  importBeatmapFile: (file: File) => Promise<LoadedBeatmapSet | null>;
  /** 缓存歌词到下载记录（内存 + IndexedDB），避免重复请求 */
  cacheLyrics: (setId: number, lyrics: { time: number; text: string }[]) => Promise<void>;

  // 后台下载队列
  bgDownloads: BgDownloadTask[];
  bgDownloadSet: (set: BeatmapSet, fullPackage?: boolean) => void;
  cancelBgDownload: (setId: number) => void;

  // 皮肤
  importSkinFile: (file: File) => Promise<boolean>;

  // 音效采样
  importHitSoundsFromFile: (file: File) => Promise<boolean>;
  clearCustomHitSounds: () => Promise<void>;

  // 游戏
  runtime: GameRuntime;
  startGame: (set: BeatmapSet, beatmap: Beatmap, mode: GameMode) => void;
  updateRuntime: (patch: Partial<GameRuntime>) => void;
  endGame: () => void;
}

const initSearch = async (
  query: string,
  mode: GameMode | null,
  source: Settings["searchSource"],
  set: (patch: Partial<GameState>) => void,
): Promise<void> => {
  set({ searchLoading: true, searchError: null, searchQuery: query, searchMode: mode });

  // 整体超时兜底：防止某些设备上 AbortController 失效导致 fetch 永远 pending
  const HARD_TIMEOUT_MS = 25000;
  const hardTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("搜索整体超时")), HARD_TIMEOUT_MS),
  );

  const doSearch = async (): Promise<BeatmapSet[]> => {
    const hasQuery = query.trim().length > 0;
    switch (source) {
      case "sayobot":
        return hasQuery
          ? await searchSayobot(query, mode || undefined, 50)
          : await fetchSayobotFeatured(mode || undefined, 50);
      case "kitsu":
        return await searchKitsu(query, mode || undefined, 50);
      case "chimu":
        return await searchChimu(query, mode || undefined, 50);
      case "nerinyan":
        return await searchNerinyan(query, mode || undefined, 50);
      case "all":
        return await searchAllSources(query, mode, 50);
      default:
        return hasQuery
          ? await apiSearch(query, mode || undefined, 50)
          : await apiFeatured(mode || undefined, 50);
    }
  };

  try {
    const results = await Promise.race([doSearch(), hardTimeout]);
    set({ searchResults: results, searchLoading: false });
  } catch (e) {
    // 单源失败时（如 osu.direct 超时），自动 fallback 到竞速搜索
    if (source !== "all") {
      try {
        const fallback = await Promise.race([
          searchAllSources(query, mode, 50),
          hardTimeout,
        ]);
        if (fallback.length > 0) {
          set({ searchResults: fallback, searchLoading: false });
          return;
        }
      } catch {
        // 竞速也失败，继续报原始错误
      }
    }
    set({
      searchLoading: false,
      searchError: e instanceof Error ? e.message : "搜索失败",
      searchResults: [],
    });
  }
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSetting: (key, value) =>
        set((s) => ({ settings: { ...s.settings, [key]: value } })),
      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),

      searchQuery: "",
      searchMode: null,
      searchResults: [],
      searchLoading: false,
      searchError: null,
      search: async (query, mode) => {
        const m = mode !== undefined ? mode : get().searchMode;
        const { settings } = get();
        await initSearch(query, m, settings.searchSource, set);
      },
      loadFeatured: async (mode) => {
        const m = mode !== undefined ? mode : get().searchMode;
        const { settings } = get();
        await initSearch("", m, settings.searchSource, set);
      },

      detailSet: null,
      detailLoading: false,
      loadDetail: async (setId) => {
        // 优先用已下载的
        const cached = get().downloaded.get(setId);
        if (cached) {
          set({
            detailSet: {
              id: cached.setId,
              title: cached.title,
              artist: cached.artist,
              creator: "",
              covers: { cover: cached.cover },
              beatmaps: cached.beatmaps,
              hasStoryboard: cached.hasStoryboard,
            },
            detailLoading: false,
          });
          return;
        }
        set({ detailLoading: true });
        try {
          const set_ = await apiFetchSet(setId);
          set({ detailSet: set_, detailLoading: false });
        } catch (e) {
          set({
            detailLoading: false,
            detailSet: null,
            searchError: e instanceof Error ? e.message : "加载失败",
          });
        }
      },

      downloaded: new Map(),
      downloadsReady: false,
      downloadProgress: 0,
      downloadError: null,
      bgDownloads: [],
      downloadSet: async (set_, force = false, fullPackage?: boolean) => {
        const cached = get().downloaded.get(set_.id);
        const full = fullPackage ?? get().settings.downloadFullPackage;
        // 缓存命中时仍需检查是否需要重新下载：
        // 用户请求 full 包但缓存无视频，且谱面声明有视频 → 视为缓存不完整，强制重新下载
        if (cached && !force) {
          const needsVideo = full && !cached.videoUrl && (cached.beatmaps || []).some(
            (b) => b.parsed?.videoFilename,
          );
          if (!needsVideo) {
            set({ downloadProgress: 1 });
            return cached;
          }
          // 缓存不完整，继续重新下载
        }
        set({ downloadProgress: 0, downloadError: null });
        try {
          const title = set_.title_unicode || set_.title;
          const artist = set_.artist_unicode || set_.artist;

          // 歌词与谱面下载并行进行
          const lyricsPromise = fetchLyrics(title, artist).catch(() => []);

          // 竞速下载：多个源同时请求，取最先成功的结果
          const buf = await downloadOszRacing(set_.id, full, (r) => set({ downloadProgress: r }));
          const loaded = await extractOsz(buf, {
            id: set_.id,
            title,
            artist,
            cover: set_.covers?.["cover@2x"] || set_.covers?.cover || "",
            beatmaps: set_.beatmaps,
          });
          loaded.lyrics = await lyricsPromise;

          set((s) => ({
            downloaded: new Map(s.downloaded).set(set_.id, loaded),
            downloadProgress: 1,
          }));
          await saveDownload(loaded);
          return loaded;
        } catch (e) {
          set({
            downloadError: e instanceof Error ? e.message : "下载失败",
            downloadProgress: 0,
          });
          return null;
        }
      },
      deleteDownload: async (setId) => {
        await deleteDownload(setId);
        set((s) => {
          const next = new Map(s.downloaded);
          next.delete(setId);
          return { downloaded: next };
        });
      },
      clearDownloads: async () => {
        await clearAllDownloads();
        set({ downloaded: new Map() });
      },
      loadDownloads: async () => {
        if (get().downloadsReady) return;
        try {
          const map = await loadAllDownloads();
          set({ downloaded: map });
        } catch (e) {
          // IndexedDB 不可用时不阻断应用
          console.warn("加载本地下载失败", e);
        }
        try {
          const urls = await loadCustomHitSounds();
          if (Object.keys(urls).length > 0) {
            set((s) => ({ settings: { ...s.settings, customHitSoundUrls: urls } }));
          }
        } catch (e) {
          console.warn("加载自定义音效失败", e);
        }
        try {
          const skinUrls = await loadCustomSkin();
          if (Object.keys(skinUrls).length > 0) {
            set((s) => ({ settings: { ...s.settings, customSkinAssetUrls: skinUrls, useCustomSkin: true } }));
          }
        } catch (e) {
          console.warn("加载自定义皮肤失败", e);
        }
        set({ downloadsReady: true });
      },
      importBeatmapFile: async (file) => {
        try {
          const buf = await file.arrayBuffer();
          const loaded = await extractOszFromFile(buf);
          // 获取歌词（与下载流程一致）
          loaded.lyrics = await fetchLyrics(loaded.title, loaded.artist).catch(() => []);
          // 如果已存在同 ID 的谱面，用新导入的覆盖
          set((s) => ({
            downloaded: new Map(s.downloaded).set(loaded.setId, loaded),
          }));
          await saveDownload(loaded);
          return loaded;
        } catch (e) {
          console.error("导入谱面失败", e);
          return null;
        }
      },
      cacheLyrics: async (setId, lyrics) => {
        set((s) => {
          const existing = s.downloaded.get(setId);
          if (!existing) return {};
          const next = new Map(s.downloaded);
          next.set(setId, { ...existing, lyrics });
          return { downloaded: next };
        });
        try {
          await updateDownloadLyrics(setId, lyrics);
        } catch (e) {
          console.warn("持久化歌词失败", e);
        }
      },

      bgDownloadSet: (set_, fullPackage) => {
        const full = fullPackage ?? get().settings.downloadFullPackage;
        // 已下载且无需补视频 → 直接跳过
        const cached = get().downloaded.get(set_.id);
        if (cached) {
          const needsVideo = full && !cached.videoUrl &&
            (cached.beatmaps || []).some((b) => b.parsed?.videoFilename);
          if (!needsVideo) return;
        }
        // 已在队列中 → 跳过
        if (get().bgDownloads.some((t) => t.setId === set_.id)) return;

        const title = set_.title_unicode || set_.title;
        const artist = set_.artist_unicode || set_.artist;
        const task: BgDownloadTask = {
          setId: set_.id,
          title,
          artist,
          progress: 0,
          status: "downloading",
        };
        set((s) => ({ bgDownloads: [...s.bgDownloads, task] }));

        const patchTask = (patch: Partial<BgDownloadTask>) =>
          set((s) => ({
            bgDownloads: s.bgDownloads.map((t) =>
              t.setId === set_.id ? { ...t, ...patch } : t,
            ),
          }));

        // 歌词与下载并行
        const lyricsPromise = fetchLyrics(title, artist).catch(() => []);

        downloadOszRacing(set_.id, full, (r) => patchTask({ progress: r }))
          .then(async (buf) => {
            patchTask({ status: "extracting", progress: 1 });
            const loaded = await extractOsz(buf, {
              id: set_.id,
              title,
              artist,
              cover: set_.covers?.["cover@2x"] || set_.covers?.cover || "",
              beatmaps: set_.beatmaps,
            });
            loaded.lyrics = await lyricsPromise;
            set((s) => ({
              downloaded: new Map(s.downloaded).set(set_.id, loaded),
            }));
            await saveDownload(loaded);
            patchTask({ status: "done" });
            // 3 秒后从队列移除已完成的任务
            setTimeout(() => {
              set((s) => ({
                bgDownloads: s.bgDownloads.filter((t) => t.setId !== set_.id),
              }));
            }, 3000);
          })
          .catch((e) => {
            patchTask({
              status: "error",
              error: e instanceof Error ? e.message : "下载失败",
            });
          });
      },

      cancelBgDownload: (setId) => {
        set((s) => ({
          bgDownloads: s.bgDownloads.filter((t) => t.setId !== setId),
        }));
      },

      importSkinFile: async (file) => {
        try {
          const buf = await file.arrayBuffer();
          const assetUrls = await extractOsk(buf);
          // 释放旧的自定义皮肤 Blob URL，避免内存泄漏
          const oldUrls = get().settings.customSkinAssetUrls;
          if (oldUrls) {
            for (const url of Object.values(oldUrls)) {
              try { URL.revokeObjectURL(url); } catch { /* 忽略 */ }
            }
          }
          // 持久化到 IndexedDB，使刷新后可恢复（Blob URL 本身不跨会话）
          await saveCustomSkin(assetUrls);
          set((s) => ({
            settings: {
              ...s.settings,
              customSkinAssetUrls: assetUrls,
              useCustomSkin: true,
            },
          }));
          return true;
        } catch (e) {
          console.error("导入皮肤失败", e);
          return false;
        }
      },

      importHitSoundsFromFile: async (file) => {
        try {
          const buf = await file.arrayBuffer();
          const assetUrls = await extractHitSounds(buf);
          // 释放旧的自定义音效 Blob URL
          const oldUrls = get().settings.customHitSoundUrls;
          if (oldUrls) {
            for (const url of Object.values(oldUrls)) {
              try { URL.revokeObjectURL(url); } catch { /* 忽略 */ }
            }
          }
          await saveCustomHitSounds(assetUrls);
          set((s) => ({
            settings: {
              ...s.settings,
              customHitSoundUrls: assetUrls,
              useHitSamples: true,
            },
          }));
          return true;
        } catch (e) {
          console.error("导入音效失败", e);
          return false;
        }
      },

      clearCustomHitSounds: async () => {
        const oldUrls = get().settings.customHitSoundUrls;
        if (oldUrls) {
          for (const url of Object.values(oldUrls)) {
            try { URL.revokeObjectURL(url); } catch { /* 忽略 */ }
          }
        }
        await deleteCustomHitSounds();
        set((s) => ({
          settings: {
            ...s.settings,
            customHitSoundUrls: undefined,
          },
        }));
      },

      runtime: EMPTY_RUNTIME,
      startGame: (set_, beatmap, mode) => {
        set({
          runtime: {
            ...EMPTY_RUNTIME,
            setId: set_.id,
            beatmap,
            mode,
            status: "ready",
          },
        });
      },
      updateRuntime: (patch) =>
        set((s) => ({ runtime: { ...s.runtime, ...patch } })),
      endGame: () =>
        set((s) => ({ runtime: { ...s.runtime, status: "finished" } })),
    }),
    {
      name: "osu-game-settings",
      // 只持久化 settings
      partialize: (s) => ({ settings: s.settings }) as unknown as GameState,
      merge: (persisted, current) => {
        const persistedSettings = (persisted as GameState)?.settings as unknown as Record<string, unknown> | undefined;
        // 旧版 KeyBindings 含 mania4/mania7 字段，需迁移到 mania: Record<number, string[]>
        let maniaKeys = { ...DEFAULT_SETTINGS.keyBindings.mania };
        if (persistedSettings) {
          const oldKb = persistedSettings.keyBindings as Record<string, unknown> | undefined;
          if (oldKb) {
            if (Array.isArray(oldKb.mania4)) maniaKeys[4] = oldKb.mania4 as string[];
            if (Array.isArray(oldKb.mania7)) maniaKeys[7] = oldKb.mania7 as string[];
            if (oldKb.mania && typeof oldKb.mania === "object") {
              maniaKeys = { ...maniaKeys, ...(oldKb.mania as Record<number, string[]>) };
            }
          }
        }
        return {
          ...current,
          ...(persisted as GameState),
          // blob URL 不跨会话保留，重载后清空自定义皮肤 / 音效资源，避免引用失效 URL
          settings: {
            ...DEFAULT_SETTINGS,
            ...(persisted as GameState).settings,
            keyBindings: {
              ...DEFAULT_SETTINGS.keyBindings,
              ...((persisted as GameState).settings as unknown as { keyBindings?: Record<string, unknown> } | undefined)?.keyBindings,
              mania: maniaKeys,
            },
            customSkinAssetUrls: undefined, // Blob URL 不跨会话，由 initialize 从 IndexedDB 恢复
            customHitSoundUrls: undefined,
          },
        };
      },
    },
  ),
);
