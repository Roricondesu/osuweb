// === 类型定义 ===

export type GameMode = "standard" | "taiko" | "catch" | "mania";

/** Mod 类型 */
export type ModType = "easy" | "notail" | "halfTime" | "hardRock" | "suddenDeath" | "doubleTime" | "hidden" | "flashlight" | "relax" | "autopilot";

export const MOD_LABEL: Record<ModType, string> = {
  easy: "Easy",
  notail: "No Fail",
  halfTime: "Half Time",
  hardRock: "Hard Rock",
  suddenDeath: "Sudden Death",
  doubleTime: "Double Time",
  hidden: "Hidden",
  flashlight: "Flashlight",
  relax: "Relax",
  autopilot: "Autopilot",
};

export const MOD_COLOR: Record<ModType, string> = {
  easy: "#66cc44",
  notail: "#9966ff",
  halfTime: "#66cc44",
  hardRock: "#ff375f",
  suddenDeath: "#ff375f",
  doubleTime: "#ff9100",
  hidden: "#ffffff",
  flashlight: "#ffffff",
  relax: "#66cc44",
  autopilot: "#66cc44",
};

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
  /** 是否包含视频背景 */
  hasVideo?: boolean;
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
  startX?: number;
  startY?: number;
  endX: number;
  endY: number;
}

export interface StoryboardMoveXCommand extends StoryboardCommandBase {
  type: "MX";
  startX?: number;
  endX: number;
}

export interface StoryboardMoveYCommand extends StoryboardCommandBase {
  type: "MY";
  startY?: number;
  endY: number;
}

export interface StoryboardScaleCommand extends StoryboardCommandBase {
  type: "S";
  startScale?: number;
  endScale: number;
}

export interface StoryboardVectorScaleCommand extends StoryboardCommandBase {
  type: "V";
  startScaleX?: number;
  startScaleY?: number;
  endScaleX: number;
  endScaleY: number;
}

export interface StoryboardRotateCommand extends StoryboardCommandBase {
  type: "R";
  startRotation?: number;
  endRotation: number;
}

export interface StoryboardColorCommand extends StoryboardCommandBase {
  type: "C";
  startR?: number;
  startG?: number;
  startB?: number;
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
  type: "sprite" | "animation" | "video";
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

/** Storyboard Sample 事件：在指定时间播放音效 */
export interface StoryboardSample {
  time: number;
  layer: StoryboardLayer;
  volume: number;
  fileName: string;
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
  /** Events 里指定的视频文件名（Video,0,"video.mp4"） */
  videoFilename?: string;
  /** Storyboard 物件（.osu Events 或 .osb 合并而来） */
  storyboard: StoryboardSprite[];
  /** Storyboard Sample 事件（按时间播放音效） */
  storyboardSamples: StoryboardSample[];
  /** 谱面自定义 combo 颜色（[Colours] 段） */
  comboColors?: string[];
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

export interface ReplayEvent {
  time: number;
  type: "down" | "up" | "keydown" | "keyup" | "move";
  x?: number;
  y?: number;
  key?: string;
}

export interface ReplayScore {
  score: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  health: number;
  counts: Record<Judgement, number>;
}

export interface Replay {
  id: string;
  setId: number;
  beatmapId: number;
  mode: GameMode;
  version: string;
  createdAt: number;
  events: ReplayEvent[];
  score: ReplayScore;
}

/** 单局游玩分数记录（独立于回放，用于历史成绩展示） */
export interface ScoreRecord {
  id: string;
  setId: number;
  beatmapId: number;
  mode: GameMode;
  version: string;
  createdAt: number;
  score: number;
  accuracy: number;
  maxCombo: number;
  counts: Record<Judgement, number>;
  mods: ModType[];
}

/** 已下载并解压的谱面包 */
export interface LoadedBeatmapSet {
  setId: number;
  title: string;
  artist: string;
  cover: string;
  /** 原始在线封面 URL（下载时来自 API），用作 blob 失效时的回退 */
  coverUrl?: string;
  audioUrl: string; // Blob URL
  backgroundUrl?: string; // Blob URL
  videoUrl?: string; // 视频背景 Blob URL
  /** 谱面包内所有资源文件名 -> Blob URL，用于 Storyboard */
  assetUrls?: Record<string, string>;
  beatmaps: Beatmap[]; // 已填充 parsed
  /** 是否有 Storyboard（.osb 或 .osu Events 动画） */
  hasStoryboard?: boolean;
  /** 网易云歌词（下载时预加载） */
  lyrics?: { time: number; text: string }[];
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

/** 键位绑定（小写键名，空格用 " " 表示） */
export interface KeyBindings {
  // standard：两个点击键
  standard: [string, string];
  // taiko：左KAT×2、右DON×2
  taiko: [string, string, string, string];
  // catch：左移、右移
  catch: [string, string];
  // mania：按键数索引的键位方案（1K-10K），运行时按谱面 cs 选取
  mania: Record<number, string[]>;
}

/** 为指定 mania 键数生成默认键位 */
export const defaultManiaKeys = (cols: number): string[] => {
  const presets: Record<number, string[]> = {
    1: [" "],
    2: ["f", "j"],
    3: ["f", " ", "j"],
    4: ["d", "f", "j", "k"],
    5: ["d", "f", " ", "j", "k"],
    6: ["s", "d", "f", "j", "k", "l"],
    7: ["s", "d", "f", " ", "j", "k", "l"],
    8: ["a", "s", "d", "f", "j", "k", "l", ";"],
    9: ["a", "s", "d", "f", " ", "j", "k", "l", ";"],
    10: ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  };
  if (presets[cols]) return [...presets[cols]];
  // 超出预设：从中间向两侧扩展
  const base = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "z", "x", "c", "v", "b", "n", "m"];
  return base.slice(0, Math.max(1, cols));
};

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  standard: ["z", "x"],
  taiko: ["d", "f", "j", "k"],
  catch: ["arrowleft", "arrowright"],
  mania: {
    1: defaultManiaKeys(1),
    2: defaultManiaKeys(2),
    3: defaultManiaKeys(3),
    4: defaultManiaKeys(4),
    5: defaultManiaKeys(5),
    6: defaultManiaKeys(6),
    7: defaultManiaKeys(7),
    8: defaultManiaKeys(8),
    9: defaultManiaKeys(9),
    10: defaultManiaKeys(10),
  },
};

export interface Settings {
  theme: "light" | "dark";
  accent: string;
  volume: number; // 0-1
  offset: number; // ms，判定时间偏移
  auto: boolean; // 自动模式
  showCursor: boolean; // 显示光标

  // 搜索 / 下载
  searchSource: "osu" | "sayobot" | "kitsu" | "chimu" | "all";
  storyboardOnly: boolean;
  videoOnly: boolean;
  downloadFullPackage: boolean;

  // 画面
  showStoryboard: boolean;
  showVideo: boolean; // 播放视频背景
  backgroundDim: number; // 0-1
  backgroundBlur: number; // 0-20，背景高斯模糊半径
  approachMultiplier: number; // 引导线提前倍率 1.0-2.5
  showFollowPoints: boolean; // 显示引导线
  showApproachCircles: boolean; // 显示引导圈
  showComboNumbers: boolean; // 显示连击数字
  showHitEffects: boolean; // 显示击中特效
  showFPS: boolean; // 显示 FPS
  hudScale: number; // 0.8-1.5，HUD 缩放
  forceLandscape: boolean;
  fullscreen: boolean;
  pageScale: number; // 0.5-1.5，整页缩放

  // 光标 / Auto
  showCursorTrail: boolean;
  showCursorPress: boolean;
  cursorSize: number; // 0.5-2.0，光标大小倍率
  autoCursorSpeed: number;
  autoCircleMode: boolean;

  // 歌词
  showLyrics: boolean;
  lyricsEffect: "none" | "fade" | "slide";
  lyricsSize: number;

  // 观赏模式
  spectatorMode: boolean;

  // 音效
  hitSoundVolume: number;
  playbackRate: number; // 0.5-1.5，播放速度
  useHitSamples: boolean; // 是否优先使用谱面/皮肤采样音效
  defaultSampleSet: "normal" | "soft" | "drum"; // 无明确采样集时的默认采样集
  customHitSoundUrls?: Record<string, string>; // 用户自定义音效采样（文件名 -> blob URL）

  // Mod
  mods: ModType[]; // 启用的 Mod 列表

  // 皮肤
  useBeatmapSkin: boolean; // 使用谱面自带皮肤
  useCustomSkin: boolean; // 使用自定义导入皮肤
  customSkinAssetUrls?: Record<string, string>; // 自定义皮肤资源
  // 默认皮肤自定义属性
  customComboColors: string[]; // 自定义 combo 颜色（覆盖默认 8 色）
  useCustomComboColors: boolean; // 是否启用自定义 combo 颜色
  circleBorderWidth: number; // 圆圈边框宽度倍率 0.5-3
  sliderBorderWidth: number; // 滑条边框宽度倍率 0.5-3
  sliderBallScale: number; // 滑条球缩放 0.5-2
  hitCircleScale: number; // 打击圈整体缩放 0.5-2

  // 键位
  keyBindings: KeyBindings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  accent: "#8866ff",
  volume: 0.7,
  offset: 0,
  auto: false,
  showCursor: false,
  searchSource: "all",
  storyboardOnly: false,
  videoOnly: false,
  downloadFullPackage: false,
  showStoryboard: true,
  showVideo: true,
  backgroundDim: 0.68,
  backgroundBlur: 0,
  approachMultiplier: 1.5,
  showFollowPoints: true,
  showApproachCircles: true,
  showComboNumbers: true,
  showHitEffects: true,
  showFPS: true,
  hudScale: 1,
  forceLandscape: false,
  fullscreen: false,
  pageScale: 1,
  showCursorTrail: true,
  showCursorPress: true,
  cursorSize: 1,
  autoCursorSpeed: 1,
  autoCircleMode: false,
  showLyrics: true,
  lyricsEffect: "fade",
  lyricsSize: 18,
  spectatorMode: false,
  hitSoundVolume: 0.6,
  playbackRate: 1,
  useHitSamples: true,
  defaultSampleSet: "normal",
  mods: [],
  useBeatmapSkin: true,
  useCustomSkin: false,
  customComboColors: ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"],
  useCustomComboColors: false,
  circleBorderWidth: 1,
  sliderBorderWidth: 1,
  sliderBallScale: 1,
  hitCircleScale: 1,
  keyBindings: { ...DEFAULT_KEY_BINDINGS },
};
