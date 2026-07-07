// === 类型定义 ===

export type GameMode = "standard" | "taiko" | "catch" | "mania";

/** osu! 数字模式 ID → 字符串模式 */
export const MODE_FROM_ID: Record<number, GameMode> = {
  0: "standard",
  1: "taiko",
  2: "catch",
  3: "mania",
};

export const MODE_TO_ID: Record<GameMode, number> = {
  standard: 0,
  taiko: 1,
  catch: 2,
  mania: 3,
};

export const MODE_LABEL: Record<GameMode, string> = {
  standard: "osu!",
  taiko: "太鼓",
  catch: "接水果",
  mania: "下落式",
};

export const MODE_COLOR: Record<GameMode, string> = {
  standard: "#ff66aa",
  taiko: "#ff9100",
  catch: "#66cc44",
  mania: "#9966ff",
};

/** osu.direct beatmapset（搜索结果） */
export interface BeatmapSet {
  id: number;
  title: string;
  title_unicode?: string;
  artist: string;
  artist_unicode?: string;
  creator: string;
  status?: string;
  bpm?: number;
  ranked?: number; // 排名时间戳
  covers: {
    cover?: string;
    "cover@2x"?: string;
    list?: string;
    card?: string;
  };
  beatmaps: Beatmap[];
}

/** 单个难度 */
export interface Beatmap {
  id: number;
  beatmapset_id: number;
  difficulty_rating: number; // 星级
  version: string; // 难度名
  mode: number; // 0/1/2/3
  total_length: number; // 秒
  hit_length: number;
  bpm?: number;
  cs?: number; // CircleSize
  ar?: number; // ApproachRate
  od?: number; // OverallDifficulty
  hp?: number; // HPDrainRate
  // 解析后的 .osu 数据（下载后填充）
  parsed?: ParsedBeatmap;
}

/** .osu 文件解析结果 */
export interface ParsedBeatmap {
  formatVersion: number;
  audioFilename: string;
  mode: GameMode;
  title: string;
  titleUnicode: string;
  artist: string;
  artistUnicode: string;
  creator: string;
  beatmapId: number;
  beatmapSetId: number;
  hp: number;
  cs: number;
  od: number;
  ar: number;
  sliderMultiplier: number;
  sliderTickRate: number;
  timingPoints: TimingPoint[];
  hitObjects: HitObject[];
}

export interface TimingPoint {
  time: number;
  beatLength: number; // ms per beat（负数表示继承点）
  meter: number;
  volume: number;
  uninherited: boolean; // true = BPM 控制点
  kiai: boolean;
}

export type HitObjectType = "circle" | "slider" | "spinner" | "hold";

export interface HitObject {
  x: number; // 0-512（osu 坐标）
  y: number; // 0-384
  time: number; // ms
  type: HitObjectType;
  newCombo: boolean;
  // slider
  curveType?: "B" | "C" | "L" | "P";
  curvePoints?: { x: number; y: number }[];
  slides?: number;
  length?: number;
  // spinner / hold
  endTime?: number;
  // 打击音效（Taiko 等模式用于颜色判断）
  hitSound?: number;
  // mania 列号（解析时根据 cs 计算）
  column?: number;
  // 运行时状态
  hit?: boolean;
  judged?: boolean;
  judgement?: Judgement | null;
  // 扩展字段
  _comboIndex?: number;
  _comboNumber?: number;
  _sliderHit?: boolean;
}

export type Judgement = "300" | "100" | "50" | "miss";

/** 已下载并解压的谱面包 */
export interface LoadedBeatmapSet {
  setId: number;
  title: string;
  artist: string;
  cover: string;
  audioUrl: string; // Blob URL
  backgroundUrl?: string; // Blob URL
  beatmaps: Beatmap[]; // 已填充 parsed
  downloadedAt: number;
}

/** 游戏运行时状态 */
export interface GameRuntime {
  setId: number;
  beatmap: Beatmap;
  mode: GameMode;
  status: "loading" | "ready" | "playing" | "paused" | "finished";
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  health: number;
  judgements: {
    "300": number;
    "100": number;
    "50": number;
    miss: number;
  };
}

export interface Settings {
  theme: "light" | "dark";
  accent: string;
  volume: number; // 0-1
  offset: number; // ms，判定时间偏移
  auto: boolean; // 自动模式
  showCursor: boolean; // 显示光标
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#0a84ff",
  volume: 0.7,
  offset: 0,
  auto: false,
  showCursor: false,
};
