// osu.direct API：搜索 / 详情 / .osz 下载
// 公共镜像，无需 API key。yuimusic 中已验证 CORS 与可用性。

import type { BeatmapSet, Beatmap, GameMode } from "@/types";
import { MODE_TO_ID } from "@/types";

const OSU_DIRECT_HOST = "https://osu.direct/api/v2";
const SAYOBOT_MINI = "https://dl.sayobot.cn/beatmaps/download/mini";
const SAYOBOT_FULL = "https://dl.sayobot.cn/beatmaps/download/full";
const SAYOBOT_LIST = "https://api.sayobot.cn/beatmaplist";
const SAYOBOT_INFO = "https://api.sayobot.cn/beatmapinfo";
const KITSU_HOST = "https://kitsu.moe/api/d";
const CHIMU_HOST = "https://api.chimu.moe/v1";

interface OsuDirectBeatmap {
  id: number;
  beatmapset_id: number;
  difficulty_rating: number;
  version: string;
  /** osu.direct 实际返回字符串 "osu"/"taiko"/"catch"/"mania"，声明为联合类型 */
  mode: number | string;
  total_length: number;
  hit_length: number;
  bpm?: number;
  countNormal?: number;
  cs?: number;
  ar?: number;
  od?: number;
  hp?: number;
}

/** 将 osu.direct 返回的 mode（可能是字符串或数字）统一转为数字 0-3 */
const normalizeMode = (m: number | string): number => {
  if (typeof m === "number") return m;
  const map: Record<string, number> = { osu: 0, standard: 0, taiko: 1, catch: 2, ctb: 2, mania: 3 };
  return map[m] ?? 0;
};

interface OsuDirectBeatmapSet {
  id: number;
  title: string;
  title_unicode?: string;
  artist: string;
  artist_unicode?: string;
  creator: string;
  status?: string;
  bpm?: number;
  ranked?: number;
  covers: {
    cover?: string;
    "cover@2x"?: string;
    list?: string;
    card?: string;
  };
  beatmaps: OsuDirectBeatmap[];
  /** osu.direct 是否返回 Storyboard 字段 */
  storyboard?: boolean;
  has_storyboard?: boolean;
  /** osu.direct 是否返回 Video 字段 */
  video?: boolean;
  has_video?: boolean;
}

interface SayobotListItem {
  sid: number;
  title: string;
  titleU: string;
  artist: string;
  artistU: string;
  creator: string;
  modes: number;
}

interface SayobotBeatmap {
  bid: number;
  sid: number;
  title: string;
  artist: string;
  titleU: string;
  artistU: string;
  creator: string;
  version: string;
  star: number;
  CS: number;
  AR: number;
  HP: number;
  OD: number;
  mode: number;
  length: number;
  BPM: number;
}

const mapBeatmap = (b: OsuDirectBeatmap): Beatmap => ({
  id: b.id,
  beatmapset_id: b.beatmapset_id,
  difficulty_rating: b.difficulty_rating,
  version: b.version,
  mode: normalizeMode(b.mode),
  total_length: b.total_length,
  hit_length: b.hit_length,
  bpm: b.bpm,
  cs: b.cs,
  ar: b.ar,
  od: b.od,
  hp: b.hp,
});

const mapBeatmapSet = (s: OsuDirectBeatmapSet): BeatmapSet => ({
  id: s.id,
  title: s.title,
  title_unicode: s.title_unicode,
  artist: s.artist,
  artist_unicode: s.artist_unicode,
  creator: s.creator,
  status: s.status,
  bpm: s.bpm,
  ranked: s.ranked,
  covers: s.covers,
  beatmaps: (s.beatmaps || []).map(mapBeatmap),
  hasStoryboard: s.storyboard || s.has_storyboard || undefined,
  hasVideo: s.video || s.has_video || undefined,
});

/** 搜索 beatmapset（osu.direct） */
export const searchBeatmapsets = async (
  query: string,
  mode?: GameMode,
  limit = 24,
): Promise<BeatmapSet[]> => {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  if (mode) params.set("mode", String(MODE_TO_ID[mode]));
  const url = `${OSU_DIRECT_HOST}/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`osu.direct 搜索失败：HTTP ${res.status}`);
  const data = (await res.json()) as OsuDirectBeatmapSet[];
  return data
    .filter((s) => s.id && s.beatmaps?.length)
    .map(mapBeatmapSet);
};

/** 获取热门谱面（无关键词，osu.direct） */
export const fetchFeatured = async (
  mode?: GameMode,
  limit = 24,
): Promise<BeatmapSet[]> => {
  const params = new URLSearchParams({
    q: "",
    limit: String(limit),
  });
  if (mode) params.set("mode", String(MODE_TO_ID[mode]));
  const url = `${OSU_DIRECT_HOST}/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`osu.direct 列表失败：HTTP ${res.status}`);
  const data = (await res.json()) as OsuDirectBeatmapSet[];
  return data
    .filter((s) => s.id && s.beatmaps?.length)
    .map(mapBeatmapSet);
};

/** 通过 setId 获取谱面详情（osu.direct） */
export const fetchBeatmapSet = async (setId: number): Promise<BeatmapSet> => {
  const url = `${OSU_DIRECT_HOST}/s/${setId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`osu.direct 详情失败：HTTP ${res.status}`);
  const data = (await res.json()) as OsuDirectBeatmapSet;
  return mapBeatmapSet(data);
};

/** Sayobot 搜索 */
export const searchSayobot = async (
  query: string,
  mode?: GameMode,
  limit = 30,
): Promise<BeatmapSet[]> => {
  const params = new URLSearchParams({
    "0": String(limit),
    "1": "0",
    "2": "4",
    "3": query,
  });
  const res = await fetch(`${SAYOBOT_LIST}?${params.toString()}`);
  if (!res.ok) throw new Error(`Sayobot 搜索失败：HTTP ${res.status}`);
  const json = (await res.json()) as { data?: SayobotListItem[] };
  const items = json.data || [];
  if (items.length === 0) return [];

  // 并行拉取每个 set 的 beatmap 详情
  const detailed = await Promise.all(
    items.map(async (item) => {
      try {
        const infoRes = await fetch(`${SAYOBOT_INFO}?1=${item.sid}`);
        if (!infoRes.ok) return null;
        const infoJson = (await infoRes.json()) as { data?: SayobotBeatmap[] };
        const bms = infoJson.data || [];
        return { item, bms };
      } catch {
        return null;
      }
    }),
  );

  return detailed
    .filter((d): d is { item: SayobotListItem; bms: SayobotBeatmap[] } => !!d && d.bms.length > 0)
    .map(({ item, bms }) => {
      let beatmaps = bms.map((b): Beatmap => ({
        id: b.bid,
        beatmapset_id: b.sid,
        difficulty_rating: b.star,
        version: b.version,
        mode: b.mode,
        total_length: b.length,
        hit_length: b.length,
        bpm: b.BPM,
        cs: b.CS,
        ar: b.AR,
        od: b.OD,
        hp: b.HP,
      }));
      if (mode !== undefined) {
        const modeId = MODE_TO_ID[mode];
        beatmaps = beatmaps.filter((b) => b.mode === modeId);
      }
      return {
        id: item.sid,
        title: item.title,
        title_unicode: item.titleU || undefined,
        artist: item.artist,
        artist_unicode: item.artistU || undefined,
        creator: item.creator,
        covers: {
          cover: `https://a.sayobot.cn/beatmaps/${item.sid}/covers/cover.jpg`,
          "cover@2x": `https://a.sayobot.cn/beatmaps/${item.sid}/covers/cover@2x.jpg`,
        },
        beatmaps,
      };
    })
    .filter((s) => s.beatmaps.length > 0);
};

/** 获取 Sayobot 热门/默认列表（空查询时返回最新上架） */
export const fetchSayobotFeatured = async (
  mode?: GameMode,
  limit = 30,
): Promise<BeatmapSet[]> => {
  return searchSayobot("", mode, limit);
};

/** 下载 .osz
 * @param full 是否下载完整包（含 Storyboard / 视频），否则用 sayobot mini
 */
export const downloadOsz = async (
  setId: number,
  full = false,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> => {
  const base = full ? SAYOBOT_FULL : SAYOBOT_MINI;
  const url = `${base}/${setId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}`);

  const total = Number(res.headers.get("content-length") || 0);
  if (!total || !res.body || !onProgress) {
    const buf = await res.arrayBuffer();
    onProgress?.(1);
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(0.99, received / total));
    }
  }
  onProgress(1);
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged.buffer;
};

// ===== Kitsu.moe =====

interface KitsuBeatmapSet {
  SetID: number;
  Title: string;
  TitleUnicode?: string;
  Artist: string;
  ArtistUnicode?: string;
  Creator: string;
  RankedStatus?: number;
  BPM?: number;
  HasVideo?: boolean;
  HasStoryboard?: boolean;
  ChildrenBeatmaps: KitsuBeatmap[];
}

interface KitsuBeatmap {
  BeatmapID: number;
  ParentSetID: number;
  DiffName: string;
  Mode: number;
  TotalLength: number;
  HitLength: number;
  BPM?: number;
  CS: number;
  AR: number;
  OD: number;
  HP: number;
  DifficultyRating: number;
}

const mapKitsuSet = (s: KitsuBeatmapSet): BeatmapSet => ({
  id: s.SetID,
  title: s.Title,
  title_unicode: s.TitleUnicode,
  artist: s.Artist,
  artist_unicode: s.ArtistUnicode,
  creator: s.Creator,
  bpm: s.BPM,
  ranked: s.RankedStatus,
  covers: {
    cover: `https://kitsu.moe/api/i/${s.SetID}.jpg`,
  },
  beatmaps: (s.ChildrenBeatmaps || []).map((b): Beatmap => ({
    id: b.BeatmapID,
    beatmapset_id: b.ParentSetID,
    difficulty_rating: b.DifficultyRating,
    version: b.DiffName,
    mode: b.Mode,
    total_length: b.TotalLength,
    hit_length: b.HitLength,
    bpm: b.BPM,
    cs: b.CS,
    ar: b.AR,
    od: b.OD,
    hp: b.HP,
  })),
  hasStoryboard: s.HasStoryboard || undefined,
  hasVideo: s.HasVideo || undefined,
});

/** Kitsu 搜索 */
export const searchKitsu = async (
  query: string,
  mode?: GameMode,
  limit = 50,
): Promise<BeatmapSet[]> => {
  const params = new URLSearchParams({ amount: String(limit) });
  if (query.trim()) params.set("query", query);
  if (mode) params.set("mode", String(MODE_TO_ID[mode]));
  const url = `${KITSU_HOST}/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kitsu 搜索失败：HTTP ${res.status}`);
  const data = (await res.json()) as KitsuBeatmapSet[];
  if (!Array.isArray(data)) return [];
  return data
    .filter((s) => s.SetID && s.ChildrenBeatmaps?.length)
    .map(mapKitsuSet);
};

/** Kitsu 下载 */
export const downloadKitsu = async (
  setId: number,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> => {
  return downloadStream(`${KITSU_HOST}/d/${setId}`, onProgress);
};

// ===== Chimu.moe =====

interface ChimuBeatmapSet {
  SetId: number;
  Title: string;
  TitleUnicode?: string;
  Artist: string;
  ArtistUnicode?: string;
  Creator: string;
  RankedStatus?: number;
  BPM?: number;
  HasVideo?: boolean;
  HasStoryboard?: boolean;
  ChildrenBeatmaps: ChimuBeatmap[];
}

interface ChimuBeatmap {
  BeatmapId: number;
  ParentSetId: number;
  DiffName: string;
  Mode: number;
  TotalLength: number;
  HitLength: number;
  BPM?: number;
  CS: number;
  AR: number;
  OD: number;
  HP: number;
  DifficultyRating: number;
}

const mapChimuSet = (s: ChimuBeatmapSet): BeatmapSet => ({
  id: s.SetId,
  title: s.Title,
  title_unicode: s.TitleUnicode,
  artist: s.Artist,
  artist_unicode: s.ArtistUnicode,
  creator: s.Creator,
  bpm: s.BPM,
  ranked: s.RankedStatus,
  covers: {
    cover: `https://api.chimu.moe/v1/set/${s.SetId}/image`,
  },
  beatmaps: (s.ChildrenBeatmaps || []).map((b): Beatmap => ({
    id: b.BeatmapId,
    beatmapset_id: b.ParentSetId,
    difficulty_rating: b.DifficultyRating,
    version: b.DiffName,
    mode: b.Mode,
    total_length: b.TotalLength,
    hit_length: b.HitLength,
    bpm: b.BPM,
    cs: b.CS,
    ar: b.AR,
    od: b.OD,
    hp: b.HP,
  })),
  hasStoryboard: s.HasStoryboard || undefined,
  hasVideo: s.HasVideo || undefined,
});

/** Chimu 搜索 */
export const searchChimu = async (
  query: string,
  mode?: GameMode,
  limit = 50,
): Promise<BeatmapSet[]> => {
  const params: Record<string, string> = { amount: String(limit) };
  if (query.trim()) params.query = query;
  if (mode) params.mode = String(MODE_TO_ID[mode]);
  const url = `${CHIMU_HOST}/search?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Chimu 搜索失败：HTTP ${res.status}`);
  const data = (await res.json()) as ChimuBeatmapSet[];
  if (!Array.isArray(data)) return [];
  return data
    .filter((s) => s.SetId && s.ChildrenBeatmaps?.length)
    .map(mapChimuSet);
};

/** Chimu 下载 */
export const downloadChimu = async (
  setId: number,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> => {
  return downloadStream(`${CHIMU_HOST}/set/${setId}`, onProgress);
};

// ===== 并行竞速搜索 / 下载 =====

export type SearchSource = "osu" | "sayobot" | "kitsu" | "chimu" | "all";

/** 并行竞速搜索：所有源同时请求，取最先返回且成功的结果，其余丢弃 */
export const searchAllSources = async (
  query: string,
  mode?: GameMode | null,
  limit = 50,
): Promise<BeatmapSet[]> => {
  const hasQuery = query.trim().length > 0;
  const sources: Promise<BeatmapSet[]>[] = [
    hasQuery
      ? searchBeatmapsets(query, mode || undefined, limit)
      : fetchFeatured(mode || undefined, limit),
    hasQuery
      ? searchKitsu(query, mode || undefined, limit)
      : searchKitsu("", mode || undefined, limit),
    hasQuery
      ? searchChimu(query, mode || undefined, limit)
      : searchChimu("", mode || undefined, limit),
  ];

  // 竞速：取第一个成功且非空的结果
  try {
    const first = await Promise.any(
      sources.map((p) =>
        p.then((r) => {
          if (r.length === 0) throw new Error("empty");
          return r;
        }),
      ),
    );
    return first;
  } catch {
    // 全部失败或全部空，尝试 Sayobot 作为兜底（它有独立 API 格式）
    try {
      return hasQuery
        ? await searchSayobot(query, mode || undefined, limit)
        : await fetchSayobotFeatured(mode || undefined, limit);
    } catch {
      return [];
    }
  }
};

/** 并行竞速下载：多个源同时请求，取最先成功的结果 */
export const downloadOszRacing = async (
  setId: number,
  full = false,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> => {
  const sources: Promise<ArrayBuffer>[] = [
    downloadOsz(setId, full, onProgress),
    downloadKitsu(setId, onProgress),
    downloadChimu(setId, onProgress),
  ];

  try {
    return await Promise.any(sources);
  } catch {
    // 全部失败，抛出统一错误
    throw new Error("所有下载源均不可用");
  }
};

/** 通用流式下载（带进度回调） */
async function downloadStream(
  url: string,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败：HTTP ${res.status}`);

  const total = Number(res.headers.get("content-length") || 0);
  if (!total || !res.body || !onProgress) {
    const buf = await res.arrayBuffer();
    onProgress?.(1);
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(0.99, received / total));
    }
  }
  onProgress(1);
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged.buffer;
}
