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
  videoUrl?: string;
  assetUrls: Record<string, string>; // 文件名 -> blob URL
  hasStoryboard: boolean;
}

const AUDIO_EXT = [".mp3", ".ogg", ".m4a", ".wav", ".flac"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const VIDEO_EXT = [".mp4", ".webm", ".avi", ".mov", ".mkv", ".m4v"];

/** .osk 皮肤中需要提取的资源类型 */
const SKIN_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const SKIN_AUDIO_EXT = [".wav", ".mp3", ".ogg"];
const SKIN_FONT_EXT = [".ttf", ".otf", ".woff", ".woff2"];

const lowerEndsWith = (name: string, exts: string[]): boolean => {
  const n = name.toLowerCase();
  return exts.some((e) => n.endsWith(e));
};

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  flac: "audio/flac",
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  m4v: "video/mp4",
};

const mimeTypeFor = (name: string): string | undefined => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext ? MIME_MAP[ext] : undefined;
};

const blobToUrl = (blob: Blob, name?: string): string => {
  const type = mimeTypeFor(name || "") || blob.type;
  if (!type || blob.type === type) return URL.createObjectURL(blob);
  return URL.createObjectURL(new Blob([blob], { type }));
};

const extractBeatmapSet = async (
  zip: JSZip,
  baseSet: { id: number; title: string; artist: string; cover: string; beatmaps: Beatmap[] },
): Promise<ExtractResult> => {
  const fileNames = Object.keys(zip.files);
  const osuFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".osu"));
  const audioFiles = fileNames.filter((n) => lowerEndsWith(n, AUDIO_EXT));
  const imageFiles = fileNames.filter((n) => lowerEndsWith(n, IMAGE_EXT));
  const videoFiles = fileNames.filter((n) => lowerEndsWith(n, VIDEO_EXT));

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

  // 提取音频：优先使用 .osu 文件中 AudioFilename 指定的主音频，避免误用音效文件
  let audioUrl = "";
  const firstParsed = parsed[0]?.parsed;
  const audioName = firstParsed?.audioFilename;
  if (audioName) {
    const norm = audioName.replace(/\\/g, "/");
    const base = norm.split("/").pop() || norm;
    const matched = audioFiles.find((n) => {
      const nn = n.replace(/\\/g, "/");
      return nn === norm || nn === base || (nn.split("/").pop() || "") === base;
    });
    if (matched) {
      const file = zip.files[matched];
      if (file && !file.dir) {
        const blob = await file.async("blob");
        audioUrl = blobToUrl(blob, matched);
      }
    }
  }
  if (!audioUrl && audioFiles.length > 0) {
    // 回退：跳过明显的音效文件（hit/soft/normal/drum/sliderslide/sliderwhistle 前缀）
    const mainAudio = audioFiles.find((n) => {
      const bn = (n.split("/").pop() || n).toLowerCase();
      return !/^(hit|soft|normal|drum|sliderslide|sliderwhistle|taiko)/.test(bn.replace(/\.[^.]+$/, ""));
    });
    const fallback = mainAudio || audioFiles[0];
    const file = zip.files[fallback];
    if (file && !file.dir) {
      const blob = await file.async("blob");
      audioUrl = blobToUrl(blob, fallback);
    }
  }

  // 提取所有图片资源（用于背景和 Storyboard）
  const assetUrls: Record<string, string> = {};
  for (const name of imageFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const blob = await file.async("blob");
      assetUrls[name] = blobToUrl(blob, name);
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
      assetUrls[name] = blobToUrl(blob, name);
      const baseName = name.split("/").pop();
      if (baseName && baseName !== name) {
        assetUrls[baseName] = assetUrls[name];
      }
    } catch {
      // 忽略损坏音频
    }
  }

  // 提取视频资源（背景视频 / Storyboard 视频精灵）
  for (const name of videoFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const blob = await file.async("blob");
      assetUrls[name] = blobToUrl(blob, name);
      const baseName = name.split("/").pop();
      if (baseName && baseName !== name) {
        assetUrls[baseName] = assetUrls[name];
      }
    } catch {
      // 忽略损坏视频
    }
  }

  // 优先使用 Events 中指定的背景，否则取第一张图片
  let backgroundUrl: string | undefined;
  if (firstParsed?.backgroundFilename && assetUrls[firstParsed.backgroundFilename]) {
    backgroundUrl = assetUrls[firstParsed.backgroundFilename];
  } else if (imageFiles.length > 0) {
    backgroundUrl = assetUrls[imageFiles[0]];
  }

  // 提取视频文件（Events 中 Video 事件指定的文件优先，再回退到第一个视频文件）
  let videoUrl: string | undefined;
  const videoName = firstParsed?.videoFilename;
  // 大小写不敏感查找 zip 中的文件
  const findInZip = (name: string): string | undefined => {
    if (!name) return undefined;
    const norm = name.replace(/\\/g, "/");
    const base = norm.split("/").pop() || norm;
    const lowerNorm = norm.toLowerCase();
    const lowerBase = base.toLowerCase();
    for (const k of Object.keys(zip.files)) {
      const kk = k.replace(/\\/g, "/").toLowerCase();
      if (kk === lowerNorm || kk === lowerBase || (kk.split("/").pop() || "") === lowerBase) {
        return k;
      }
    }
    return undefined;
  };
  if (videoName) {
    const norm = videoName.replace(/\\/g, "/");
    const base = norm.split("/").pop() || norm;
    videoUrl = assetUrls[norm] || assetUrls[base] || assetUrls[videoName];
  }
  if (!videoUrl && videoName) {
    // 从 zip 中按候选名大小写不敏感查找并提取
    const matchedKey = findInZip(videoName);
    if (matchedKey) {
      const file = zip.files[matchedKey];
      if (file && !file.dir) {
        try {
          const blob = await file.async("blob");
          videoUrl = blobToUrl(blob, matchedKey);
          // 同步注册到 assetUrls（用实际文件名和原始引用名），方便 storyboard 视频精灵引用
          assetUrls[matchedKey] = videoUrl;
          const bn = matchedKey.split("/").pop();
          if (bn && bn !== matchedKey) assetUrls[bn] = videoUrl;
          // 同时用 .osu 中声明的文件名注册一份（大小写不敏感查找时能命中）
          assetUrls[videoName] = videoUrl;
        } catch {
          // 忽略
        }
      }
    }
  }
  if (!videoUrl && videoFiles.length > 0) {
    const name = videoFiles[0];
    const file = zip.files[name];
    if (file && !file.dir) {
      try {
        const blob = await file.async("blob");
        videoUrl = blobToUrl(blob, name);
        assetUrls[name] = videoUrl;
        const bn = name.split("/").pop();
        if (bn && bn !== name) assetUrls[bn] = videoUrl;
      } catch {
        // 忽略损坏视频
      }
    }
  }

  // 解析 .osb（谱面集级 storyboard）并合并到每个难度的 storyboard
  const osbFiles = fileNames.filter((n) => n.toLowerCase().endsWith(".osb"));
  const osbSprites: import("@/types").StoryboardSprite[] = [];
  const osbSamples: import("@/types").StoryboardSample[] = [];
  for (const name of osbFiles) {
    const file = zip.files[name];
    if (file.dir) continue;
    try {
      const text = await file.async("text");
      const { sprites, samples } = parseStoryboardEvents(text);
      osbSprites.push(...sprites);
      osbSamples.push(...samples);
    } catch {
      // 忽略损坏的 .osb
    }
  }
  if (osbSprites.length > 0) {
    for (const p of parsed) {
      p.parsed.storyboard.push(...osbSprites);
    }
  }
  if (osbSamples.length > 0) {
    for (const p of parsed) {
      p.parsed.storyboardSamples.push(...osbSamples);
    }
  }

  const hasStoryboard = parsed.some(
    (p) => p.parsed.storyboard && p.parsed.storyboard.length > 0,
  );

  // 按时间排序 beatmaps
  const beatmaps = parsed
    .map((p) => p.beatmap)
    .sort((a, b) => (a.parsed?.hitObjects[0]?.time || 0) - (b.parsed?.hitObjects[0]?.time || 0));

  return { beatmaps, audioUrl, backgroundUrl, videoUrl, assetUrls, hasStoryboard };
};

/** 解压 .osz ArrayBuffer 并构造 LoadedBeatmapSet */
export const extractOsz = async (
  data: ArrayBuffer,
  baseSet: { id: number; title: string; artist: string; cover: string; beatmaps: Beatmap[] },
): Promise<LoadedBeatmapSet> => {
  const zip = await JSZip.loadAsync(data);
  const { beatmaps, audioUrl, backgroundUrl, videoUrl, assetUrls, hasStoryboard } = await extractBeatmapSet(zip, baseSet);

  // 优先使用本地解压的背景图作为封面，避免在线 cover URL 失效/跨域导致碎图
  const cover = backgroundUrl || baseSet.cover;

  return {
    setId: baseSet.id,
    title: baseSet.title,
    artist: baseSet.artist,
    cover,
    coverUrl: baseSet.cover,
    audioUrl,
    backgroundUrl,
    videoUrl,
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
    coverUrl: cover,
    audioUrl: result.audioUrl,
    backgroundUrl: result.backgroundUrl,
    videoUrl: result.videoUrl,
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
    // 跳过 skin.ini 等非资源文件，只提取图片、音效与字体
    if (
      !lowerEndsWith(name, SKIN_IMAGE_EXT) &&
      !lowerEndsWith(name, SKIN_AUDIO_EXT) &&
      !lowerEndsWith(name, SKIN_FONT_EXT)
    ) continue;
    try {
      const blob = await file.async("blob");
      const url = blobToUrl(blob, name);
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

/** 从任意 zip（.osz / .osk / .zip）中提取音效采样文件为 Blob URL 映射
 *  只保留 .wav / .mp3 / .ogg，同时提供不带路径的文件名作为别名
 */
export const extractHitSounds = async (data: ArrayBuffer): Promise<Record<string, string>> => {
  const zip = await JSZip.loadAsync(data);
  const fileNames = Object.keys(zip.files);
  const assetUrls: Record<string, string> = {};

  for (const name of fileNames) {
    const file = zip.files[name];
    if (file.dir) continue;
    if (!lowerEndsWith(name, SKIN_AUDIO_EXT)) continue;
    try {
      const blob = await file.async("blob");
      const url = blobToUrl(blob, name);
      assetUrls[name] = url;
      const baseName = name.split("/").pop() || name;
      if (baseName && baseName !== name) {
        assetUrls[baseName] = url;
      }
    } catch {
      // 忽略损坏音频
    }
  }

  if (Object.keys(assetUrls).length === 0) {
    throw new Error("未找到任何音效采样文件（.wav / .mp3 / .ogg）");
  }
  return assetUrls;
};
