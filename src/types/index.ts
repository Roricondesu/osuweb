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
  taiko: "Taiko!",
  catch: "Catch!",
  mania: "Mania!",
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
  /** 是否存在 Storyboard（osu.direct 不一定返回，下载后重新判定） */
  hasStoryboard?: boolean;
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

/** Storyboard 命令缓动函数编号 */
export type StoryboardEasing = number;

export type StoryboardLayer = "Background" | "Fail" | "Pass" | "Foreground" | "Overlay";
export type StoryboardOrigin =
  | "TopLeft"
  | "TopCentre"
  | "TopRight"
  | "CentreLeft"
  | "Centre"
  | "CentreRight"
  | "BottomLeft"
  | "BottomCentre"
  | "BottomRight";

export interface StoryboardCommandBase {
  type: string;
  startTime: number;
  endTime: number;
  easing: StoryboardEasing;
}

export interface StoryboardFadeCommand extends StoryboardCommandBase {
  type: "F";
  startOpacity: number;
  endOpacity: number;
}

export interface StoryboardMoveCommand extends StoryboardCommandBase {
  type: "M";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface StoryboardMoveXCommand extends StoryboardCommandBase {
  type: "MX";
  startX: number;
  endX: number;
}

export interface StoryboardMoveYCommand extends StoryboardCommandBase {
  type: "MY";
  startY: number;
  endY: number;
}

export interface StoryboardScaleCommand extends StoryboardCommandBase {
  type: "S";
  startScale: number;
  endScale: number;
}

export interface StoryboardVectorScaleCommand extends StoryboardCommandBase {
  type: "V";
  startScaleX: number;
  startScaleY: number;
  endScaleX: number;
  endScaleY: number;
}

export interface StoryboardRotateCommand extends StoryboardCommandBase {
  type: "R";
  startRotation: number;
  endRotation: number;
}

export interface StoryboardColorCommand extends StoryboardCommandBase {
  type: "C";
  startR: number;
  startG: number;
  startB: number;
  endR: number;
  endG: number;
  endB: number;
}

export interface StoryboardParameterCommand extends StoryboardCommandBase {
  type: "P";
  parameter: "H" | "V" | "A"; // 水平翻转 / 垂直翻转 / Additive 混合
}

export interface StoryboardLoopCommand extends StoryboardCommandBase {
  type: "L";
  loopCount: number;
  commands: StoryboardCommand[];
}

export interface StoryboardTriggerCommand extends StoryboardCommandBase {
  type: "T";
  triggerName: string;
  startCondition: number;
  endCondition: number;
  groupNumber: number;
  commands: StoryboardCommand[];
}

export type StoryboardCommand =
  | StoryboardFadeCommand
  | StoryboardMoveCommand
  | StoryboardMoveXCommand
  | StoryboardMoveYCommand
  | StoryboardScaleCommand
  | StoryboardVectorScaleCommand
  | StoryboardRotateCommand
  | StoryboardColorCommand
  | StoryboardParameterCommand
  | StoryboardLoopCommand
  | StoryboardTriggerCommand;

export interface StoryboardSprite {
  type: "sprite" | "animation";
  layer: StoryboardLayer;
  origin: StoryboardOrigin;
  fileName: string;
  x: number;
  y: number;
  frameCount?: number;
  frameDelay?: number;
  loopType?: "LoopOnce" | "LoopForever";
  commands: StoryboardCommand[];
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
  /** Events 里指定的背景文件名 */
  backgroundFilename?: string;
  /** Storyboard 物件（.osu Events 或 .osb 合并而来） */
  storyboard: StoryboardSprite[];
}

export interface TimingPoint {
  time: number;
  beatLength: number; // ms per beat（负数表示继承点）
  meter: number;
  sampleSet: number; // 0=auto, 1=normal, 2=soft, 3=drum
  sampleIndex: number; // 0=default, 1=custom1...
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
  /** 谱面包内所有资源文件名 -> Blob URL，用于 Storyboard */
  assetUrls?: Record<string, string>;
  beatmaps: Beatmap[]; // 已填充 parsed
  /** 是否有 Storyboard（.osb 或 .osu Events 动画） */
  hasStoryboard?: boolean;
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

  // 搜索 / 下载
  searchSource: "osu" | "sayobot";
  /** 仅显示有 Storyboard 的谱面（仅对 osu.direct 有效） */
  storyboardOnly: boolean;
  /** 下载完整谱面包（含视频/Storyboard 资源），否则用 sayobot mini */
  downloadFullPackage: boolean;

  // 画面
  showStoryboard: boolean;
  backgroundDim: number; // 0-1，背景变暗强度
  showLyrics: boolean; // 显示网易云歌词

  // 光标 / Auto
  showCursorTrail: boolean; // 显示光标拖尾
  showCursorPress: boolean; // 显示光标按下反馈
  autoCursorSpeed: number; // 0.5-2.0，auto 光标移动速度倍率

  // 音效
  hitSoundVolume: number; // 0-1，谱面按键音音量
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#0a84ff",
  volume: 0.7,
  offset: 0,
  auto: false,
  showCursor: false,
  searchSource: "sayobot",
  storyboardOnly: false,
  downloadFullPackage: false,
  showStoryboard: true,
  backgroundDim: 0.68,
  showLyrics: true,
  showCursorTrail: true,
  showCursorPress: true,
  autoCursorSpeed: 1,
  hitSoundVolume: 0.6,
};
