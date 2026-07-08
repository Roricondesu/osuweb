// osu.direct API：搜索 / 详情 / .osz 下载
// 公共镜像，无需 API key。yuimusic 中已验证 CORS 与可用性。

import type { BeatmapSet, Beatmap, GameMode } from "@/types";
import { MODE_TO_ID } from "@/types";

const OSU_DIRECT_HOST = "https://osu.direct/api/v2";
const SAYOBOT_MINI = "https://dl.sayobot.cn/beatmaps/download/mini";
const SAYOBOT_FULL = "https://dl.sayobot.cn/beatmaps/download/full";
const SAYOBOT_LIST = "https://api.sayobot.cn/beatmaplist";
const SAYOBOT_INFO = "https://api.sayobot.cn/beatmapinfo";

interface OsuDirectBeatmap {
  id: number;
  beatmapset_id: number;
  difficulty_rating: number;
  version: string;
  mode: number;
  total_length: number;
  hit_length: number;
  bpm?: number;
  countNormal?: number;
  cs?: number;
  ar?: number;
  od?: number;
  hp?: number;
}

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
  mode: b.mode,
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
