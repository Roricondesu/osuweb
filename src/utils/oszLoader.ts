/** 解压 .osz（zip）并提取 .osu / 音频 / 背景
 *  返回所有文件的 Blob URL 映射，调用方自行管理生命周期
 */
import JSZip from "jszip";
import { parseOsu } from "./osuParser";
import type { Beatmap, LoadedBeatmapSet, ParsedBeatmap } from "@/types";

export interface ExtractResult {
  beatmaps: Beatmap[]; // 含 parsed
  audioUrl: string;
  backgroundUrl?: string;
}

const AUDIO_EXT = [".mp3", ".ogg", ".m4a", ".wav", ".flac"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

const lowerEndsWith = (name: string, exts: string[]): boolean => {
  const n = name.toLowerCase();
  return exts.some((e) => n.endsWith(e));
};

const blobToUrl = (blob: Blob): string => URL.createObjectURL(blob);

const extractBeatmapSet = async (
  zip: JSZip,
  baseSet: { id: number; title: string; artist: string; cover: string; beatmaps: Beatmap[] },
): Promise<ExtractResult> => {
  const fileNames = Object.keys(zip.files);
  const osuFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".osu"));
  const audioFiles = fileNames.filter((n) => lowerEndsWith(n, AUDIO_EXT));
  const imageFiles = fileNames.filter((n) => lowerEndsWith(n, IMAGE_EXT));

  // 解析所有 .osu 文件
  const parsed: { beatmap: Beatmap; parsed: ParsedBeatmap }[] = [];
  for (const name of osuFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const text = await file.async("text");
      const p = parseOsu(text);
      // 匹配已有的 beatmap（按 version 或 beatmapId）
      const matched =
        baseSet.beatmaps.find((b) => b.id === p.beatmapId) ||
        baseSet.beatmaps.find((b) => b.version === p.title) ||
        baseSet.beatmaps[0];
      if (matched) {
        // 以 .osu 文件内 Mode 字段为准（API 返回的 mode 偶尔不可靠）
        parsed.push({ beatmap: { ...matched, mode: ["standard", "taiko", "catch", "mania"].indexOf(p.mode), parsed: p }, parsed: p });
      } else {
        // 没匹配上，构造一个新的 Beatmap
        parsed.push({
          beatmap: {
            id: p.beatmapId || Math.floor(Math.random() * 1e9),
            beatmapset_id: baseSet.id,
            difficulty_rating: p.od,
            version: p.title || "Difficulty",
            mode: ["standard", "taiko", "catch", "mania"].indexOf(p.mode),
            total_length: 0,
            hit_length: 0,
            cs: p.cs,
            ar: p.ar,
            od: p.od,
            hp: p.hp,
            parsed: p,
          },
          parsed: p,
        });
      }
    } catch {
      // 跳过损坏的 .osu
    }
  }

  // 提取音频
  let audioUrl = "";
  if (audioFiles.length > 0) {
    const file = zip.files[audioFiles[0]];
    if (!file.dir) {
      const blob = await file.async("blob");
      audioUrl = blobToUrl(blob);
    }
  }

  // 提取背景（取第一张图片）
  let backgroundUrl: string | undefined;
  if (imageFiles.length > 0) {
    const file = zip.files[imageFiles[0]];
    if (!file.dir) {
      const blob = await file.async("blob");
      backgroundUrl = blobToUrl(blob);
    }
  }

  // 按时间排序 beatmaps
  const beatmaps = parsed
    .map((p) => p.beatmap)
    .sort((a, b) => (a.parsed?.hitObjects[0]?.time || 0) - (b.parsed?.hitObjects[0]?.time || 0));

  return { beatmaps, audioUrl, backgroundUrl };
};

/** 解压 .osz ArrayBuffer 并构造 LoadedBeatmapSet */
export const extractOsz = async (
  data: ArrayBuffer,
  baseSet: { id: number; title: string; artist: string; cover: string; beatmaps: Beatmap[] },
): Promise<LoadedBeatmapSet> => {
  const zip = await JSZip.loadAsync(data);
  const { beatmaps, audioUrl, backgroundUrl } = await extractBeatmapSet(zip, baseSet);

  return {
    setId: baseSet.id,
    title: baseSet.title,
    artist: baseSet.artist,
    cover: baseSet.cover,
    audioUrl,
    backgroundUrl,
    beatmaps,
    downloadedAt: Date.now(),
  };
};
