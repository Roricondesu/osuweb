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
  downloadOsz as apiDownloadOsz,
  searchSayobot,
  fetchSayobotFeatured,
} from "@/api/osuDirect";
import { extractOsz, extractOszFromFile, extractOsk } from "@/utils/oszLoader";
import { saveDownload, loadAllDownloads, deleteDownload, clearAllDownloads } from "@/utils/indexedDb";
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
  downloadProgress: number; // 0-1
  downloadError: string | null;
  downloadSet: (set: BeatmapSet, force?: boolean, fullPackage?: boolean) => Promise<LoadedBeatmapSet | null>;
  deleteDownload: (setId: number) => Promise<void>;
  clearDownloads: () => Promise<void>;
  loadDownloads: () => Promise<void>;
  importBeatmapFile: (file: File) => Promise<LoadedBeatmapSet | null>;

  // 皮肤
  importSkinFile: (file: File) => Promise<boolean>;

  // 游戏
  runtime: GameRuntime;
  startGame: (set: BeatmapSet, beatmap: Beatmap, mode: GameMode) => void;
  updateRuntime: (patch: Partial<GameRuntime>) => void;
  endGame: () => void;
}

const initSearch = async (
  query: string,
  mode: GameMode | null,
  source: "osu" | "sayobot",
  storyboardOnly: boolean,
  set: (patch: Partial<GameState>) => void,
): Promise<void> => {
  set({ searchLoading: true, searchError: null, searchQuery: query, searchMode: mode });
  try {
    let results: BeatmapSet[];
    const hasQuery = query.trim().length > 0;
    if (source === "sayobot") {
      results = hasQuery
        ? await searchSayobot(query, mode || undefined, 50)
        : await fetchSayobotFeatured(mode || undefined, 50);
    } else {
      results = hasQuery
        ? await apiSearch(query, mode || undefined, 50)
        : await apiFeatured(mode || undefined, 50);
    }
    if (storyboardOnly) {
      results = results.filter((s) => s.hasStoryboard === true);
    }
    set({ searchResults: results, searchLoading: false });
  } catch (e) {
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
        await initSearch(query, m, settings.searchSource, settings.storyboardOnly, set);
      },
      loadFeatured: async (mode) => {
        const m = mode !== undefined ? mode : get().searchMode;
        const { settings } = get();
        await initSearch("", m, settings.searchSource, settings.storyboardOnly, set);
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
      downloadProgress: 0,
      downloadError: null,
      downloadSet: async (set_, force = false, fullPackage?: boolean) => {
        const cached = get().downloaded.get(set_.id);
        if (cached && !force) {
          set({ downloadProgress: 1 });
          return cached;
        }
        set({ downloadProgress: 0, downloadError: null });
        try {
          const full = fullPackage ?? get().settings.downloadFullPackage;
          const title = set_.title_unicode || set_.title;
          const artist = set_.artist_unicode || set_.artist;

          // 歌词与谱面下载并行进行
          const lyricsPromise = fetchLyrics(title, artist).catch(() => []);

          const buf = await apiDownloadOsz(set_.id, full, (r) => set({ downloadProgress: r }));
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
        try {
          const map = await loadAllDownloads();
          set({ downloaded: map });
        } catch (e) {
          // IndexedDB 不可用时不阻断应用
          console.warn("加载本地下载失败", e);
        }
      },
      importBeatmapFile: async (file) => {
        try {
          const buf = await file.arrayBuffer();
          const loaded = await extractOszFromFile(buf);
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
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as GameState),
        // blob URL 不跨会话保留，重载后清空自定义皮肤资源，避免引用失效 URL
        settings: {
          ...DEFAULT_SETTINGS,
          ...(persisted as GameState).settings,
          customSkinAssetUrls: undefined,
          useCustomSkin: false,
        },
      }),
    },
  ),
);
