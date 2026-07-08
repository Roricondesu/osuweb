/** 解压 .osz（zip）并提取 .osu / 音频 / 背景 / Storyboard 资源
 *  返回所有文件的 Blob URL 映射，调用方自行管理生命周期
 */
import JSZip from "jszip";
import { parseOsu, parseStoryboardEvents } from "./osuParser";
import type { Beatmap, LoadedBeatmapSet, ParsedBeatmap } from "@/types";

export interface ExtractResult {
  beatmaps: Beatmap[]; // 含 parsed
  audioUrl: string;
  backgroundUrl?: string;
  assetUrls: Record<string, string>; // 文件名 -> blob URL
  hasStoryboard: boolean;
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

  // 提取所有图片资源（用于背景和 Storyboard）
  const assetUrls: Record<string, string> = {};
  for (const name of imageFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const blob = await file.async("blob");
      assetUrls[name] = blobToUrl(blob);
      // 同时存一份不带路径的文件名，方便 storyboard 引用匹配
      const baseName = name.split("/").pop();
      if (baseName && baseName !== name) {
        assetUrls[baseName] = assetUrls[name];
      }
    } catch {
      // 忽略损坏图片
    }
  }

  // 优先使用 Events 中指定的背景，否则取第一张图片
  let backgroundUrl: string | undefined;
  const firstParsed = parsed[0]?.parsed;
  if (firstParsed?.backgroundFilename && assetUrls[firstParsed.backgroundFilename]) {
    backgroundUrl = assetUrls[firstParsed.backgroundFilename];
  } else if (imageFiles.length > 0) {
    backgroundUrl = assetUrls[imageFiles[0]];
  }

  // 解析 .osb（谱面集级 storyboard）并合并到每个难度的 storyboard
  const osbFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".osb"));
  const osbSprites: import("@/types").StoryboardSprite[] = [];
  for (const name of osbFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const text = await file.async("text");
      osbSprites.push(...parseStoryboardEvents(text));
    } catch {
      // 忽略损坏的 .osb
    }
  }
  if (osbSprites.length > 0) {
    for (const p of parsed) {
      p.parsed.storyboard.push(...osbSprites);
    }
  }

  const hasStoryboard = parsed.some(
    (p) => p.parsed.storyboard && p.parsed.storyboard.length > 0,
  );

  // 按时间排序 beatmaps
  const beatmaps = parsed
    .map((p) => p.beatmap)
    .sort((a, b) => (a.parsed?.hitObjects[0]?.time || 0) - (b.parsed?.hitObjects[0]?.time || 0));

  return { beatmaps, audioUrl, backgroundUrl, assetUrls, hasStoryboard };
};

/** 解压 .osz ArrayBuffer 并构造 LoadedBeatmapSet */
export const extractOsz = async (
  data: ArrayBuffer,
  baseSet: { id: number; title: string; artist: string; cover: string; beatmaps: Beatmap[] },
): Promise<LoadedBeatmapSet> => {
  const zip = await JSZip.loadAsync(data);
  const { beatmaps, audioUrl, backgroundUrl, assetUrls, hasStoryboard } = await extractBeatmapSet(zip, baseSet);

  return {
    setId: baseSet.id,
    title: baseSet.title,
    artist: baseSet.artist,
    cover: baseSet.cover,
    audioUrl,
    backgroundUrl,
    assetUrls,
    beatmaps,
    hasStoryboard,
    downloadedAt: Date.now(),
  };
};
