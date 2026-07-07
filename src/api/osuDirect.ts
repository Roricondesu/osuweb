// osu.direct API：搜索 / 详情 / .osz 下载
// 公共镜像，无需 API key。yuimusic 中已验证 CORS 与可用性。

import type { BeatmapSet, Beatmap, GameMode } from "@/types";
import { MODE_TO_ID } from "@/types";

const OSU_DIRECT_HOST = "https://osu.direct/api/v2";
const SAYOBOT_MINI = "https://dl.sayobot.cn/beatmaps/download/mini";

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

/** 搜索 beatmapset */
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

/** 获取热门谱面（无关键词） */
export const fetchFeatured = async (
  mode?: GameMode,
  limit = 24,
): Promise<BeatmapSet[]> => {
  // osu.direct 没有"热门"接口，用空查询 + 排序获取最新上架的谱面
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

/** 通过 setId 获取谱面详情 */
export const fetchBeatmapSet = async (setId: number): Promise<BeatmapSet> => {
  const url = `${OSU_DIRECT_HOST}/s/${setId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`osu.direct 详情失败：HTTP ${res.status}`);
  const data = (await res.json()) as OsuDirectBeatmapSet;
  return mapBeatmapSet(data);
};

/** 下载 .osz（sayobot mini 镜像，无视频体积最小）
 *  返回 ArrayBuffer，调用方用 JSZip 解析
 */
export const downloadOsz = async (
  setId: number,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> => {
  const url = `${SAYOBOT_MINI}/${setId}`;
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
  // 合并 chunks 为单个 ArrayBuffer
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return merged.buffer;
};
