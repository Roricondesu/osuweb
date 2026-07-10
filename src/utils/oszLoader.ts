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

/** .osk 皮肤中需要提取的资源类型 */
const SKIN_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const SKIN_AUDIO_EXT = [".wav", ".mp3", ".ogg"];
const SKIN_FONT_EXT = [".ttf", ".otf", ".woff", ".woff2"];

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

  // 提取音效资源（按键音）
  for (const name of audioFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const blob = await file.async("blob");
      assetUrls[name] = blobToUrl(blob);
      const baseName = name.split("/").pop();
      if (baseName && baseName !== name) {
        assetUrls[baseName] = assetUrls[name];
      }
    } catch {
      // 忽略损坏音频
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

/** 从 ArrayBuffer 导入 .osz 文件，元数据从 .osu 文件中提取 */
export const extractOszFromFile = async (data: ArrayBuffer): Promise<LoadedBeatmapSet> => {
  const zip = await JSZip.loadAsync(data);
  // 从 .osu 文件提取元数据
  const fileNames = Object.keys(zip.files);
  const osuFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".osu"));

  let title = "导入谱面";
  let artist = "Unknown";
  let setId = Date.now(); // 使用时间戳作为唯一 ID
  let cover = "";

  // 从第一个 .osu 文件提取元数据
  for (const name of osuFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const text = await file.async("text");
      const p = parseOsu(text);
      if (p.title) title = p.titleUnicode || p.title;
      if (p.artist) artist = p.artistUnicode || p.artist;
      if (p.beatmapSetId && p.beatmapSetId > 0) setId = p.beatmapSetId;
      break;
    } catch {
      // 跳过损坏的 .osu
    }
  }

  // 使用空 beatmaps 数组，让 extractBeatmapSet 自行从 .osu 文件构造
  const result = await extractBeatmapSet(zip, {
    id: setId,
    title,
    artist,
    cover,
    beatmaps: [],
  });

  // 如果没有 cover URL，使用 backgroundUrl
  if (!cover && result.backgroundUrl) {
    cover = result.backgroundUrl;
  }

  return {
    setId,
    title,
    artist,
    cover: cover || result.backgroundUrl || "",
    audioUrl: result.audioUrl,
    backgroundUrl: result.backgroundUrl,
    assetUrls: result.assetUrls,
    beatmaps: result.beatmaps,
    hasStoryboard: result.hasStoryboard,
    downloadedAt: Date.now(),
  };
};

/** 解压 .osk（zip）皮肤包，提取所有皮肤纹理与音效为 Blob URL 映射
 *  返回 文件名 -> blob URL 的字典，同时提供不带路径的文件名作为别名
 */
export const extractOsk = async (data: ArrayBuffer): Promise<Record<string, string>> => {
  const zip = await JSZip.loadAsync(data);
  const fileNames = Object.keys(zip.files);
  const assetUrls: Record<string, string> = {};

  for (const name of fileNames) {
    const file = zip.files[name];
    if (file.dir) continue;
    const lower = name.toLowerCase();
    // 跳过 skin.ini 等非资源文件，只提取图片、音效与字体
    if (
      !lowerEndsWith(name, SKIN_IMAGE_EXT) &&
      !lowerEndsWith(name, SKIN_AUDIO_EXT) &&
      !lowerEndsWith(name, SKIN_FONT_EXT)
    ) continue;
    try {
      const blob = await file.async("blob");
      const url = blobToUrl(blob);
      // 保留原始路径
      assetUrls[name] = url;
      // 同时存一份不带路径的文件名，方便按文件名匹配
      const baseName = name.split("/").pop() || name;
      if (baseName && baseName !== name) {
        assetUrls[baseName] = url;
      }
    } catch {
      // 忽略损坏的资源
    }
  }

  if (Object.keys(assetUrls).length === 0) {
    throw new Error("皮肤包内未找到任何可用的图片或音效资源");
  }
  return assetUrls;
};
