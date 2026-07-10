/** 游戏引擎基类
 *  负责：
 *  - 管理 Canvas / 音频 / 当前时间
 *  - requestAnimationFrame 循环
 *  - 调用子类的 update / render / onInput
 *  - 维护分数状态（通过 Judger）
 */
import type { ParsedBeatmap, HitObject, Judgement, StoryboardSprite, StoryboardCommand, Replay, ReplayEvent, ReplayScore, ModType } from "@/types";
import { MOD_LABEL, MOD_COLOR } from "@/types";
import type { LyricLine } from "@/utils/lrclibLyrics";
import {
  createInitialScore,
  applyJudgement,
  windowsForOD,
  judgeByDelta,
  type ScoreState,
  type JudgementWindows,
} from "./Judger";
import type { CanvasContext } from "./renderer/Canvas2D";
import { setupCanvas, clear, GAME_FONT, clamp } from "./renderer/Canvas2D";
import { getCurrentLyric } from "@/utils/lrclibLyrics";

interface HitEffect {
  x: number;
  y: number;
  judgement: Judgement;
  time: number;
}

interface JudgePopup {
  text: string;
  color: string;
  x: number;
  y: number;
  time: number;
  scale: number;
  judgement: Judgement;
}

export interface EngineCallbacks {
  onScoreUpdate?: (score: ScoreState) => void;
  onFinish?: (score: ScoreState) => void;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  audio: HTMLAudioElement;
  beatmap: ParsedBeatmap;
  offset?: number;
  isLandscape?: boolean;
  callbacks?: EngineCallbacks;
  backgroundUrl?: string;
  assetUrls?: Record<string, string>;
  auto?: boolean;
  showCursor?: boolean;
  showStoryboard?: boolean;
  backgroundDim?: number;
  showLyrics?: boolean;
  lyrics?: LyricLine[];
  showCursorTrail?: boolean;
  showCursorPress?: boolean;
  autoCursorSpeed?: number;
  autoCircleMode?: boolean;
  hitSoundVolume?: number;
  approachMultiplier?: number;
  backgroundBlur?: number;
  showFollowPoints?: boolean;
  showApproachCircles?: boolean;
  showComboNumbers?: boolean;
  showHitEffects?: boolean;
  showFPS?: boolean;
  hudScale?: number;
  cursorSize?: number;
  playbackRate?: number;
  replay?: Replay;
  mods?: ModType[];
  useBeatmapSkin?: boolean;
  customSkinAssetUrls?: Record<string, string>;
}

export abstract class GameEngine {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasContext;
  protected audio: HTMLAudioElement;
  protected beatmap: ParsedBeatmap;
  protected offset: number; // ms，玩家可调
  protected windows: JudgementWindows;

  protected score: ScoreState = createInitialScore();
  protected rafId: number | null = null;
  protected status: "idle" | "playing" | "paused" | "finished" = "idle";
  protected startTime = 0; // performance.now() 起点
  protected audioStartedAt = 0; // audio.currentTime 起点
  protected callbacks: EngineCallbacks;

  protected isLandscape = false;
  protected auto = false;
  protected showCursor = false;
  protected cursorX = -100;
  protected cursorY = -100;
  protected cursorTargetX = -100;
  protected cursorTargetY = -100;
  protected cursorVelocityX = 0;
  protected cursorVelocityY = 0;
  protected cursorTrail: { x: number; y: number; time: number }[] = [];
  protected cursorPressed = false;
  protected cursorPressTime = 0;
  protected showCursorTrail = true;
  protected showCursorPress = true;
  protected autoCursorSpeed = 1;
  protected autoCircleMode = false;
  // auto 光标贝塞尔移动参数
  protected cursorMoveStartTime = 0;
  protected cursorMoveDuration = 0;
  protected cursorMoveStartX = -100;
  protected cursorMoveStartY = -100;
  protected cursorLastTargetX = -100;
  protected cursorLastTargetY = -100;
  protected cursorNextTargetX = -100;
  protected cursorNextTargetY = -100;

  protected hitSoundVolume = 0.6;
  protected hitSoundAudios: Map<string, HTMLAudioElement> = new Map();
  protected hitSoundUrlCache: Map<string, string | null> = new Map();
  protected audioCtx: AudioContext | null = null;

  // 回放
  protected isReplay = false;
  protected replayEvents: ReplayEvent[] = [];
  protected replayIndex = 0;
  // 每个 URL 保留少量音频实例，避免连续播放同一音效时互相中断
  protected hitSoundAudioPool: Map<string, HTMLAudioElement[]> = new Map();
  protected hitSoundPoolIndex: Map<string, number> = new Map();
  protected maxHitSoundPoolSize = 4;

  protected backgroundImage: HTMLImageElement | null = null;
  protected backgroundLoaded = false;
  protected assetUrls: Record<string, string> = {};
  // 谱面自带皮肤纹理
  protected skinTextures: Map<string, HTMLImageElement> = new Map();
  protected skinLoaded = false;
  protected storyboardImages: Map<string, HTMLImageElement> = new Map();
  protected storyboardLoaded = false;
  protected storyboardFlat = new Map<
    StoryboardSprite,
    {
      all: StoryboardCommand[];
      byType: Partial<Record<StoryboardCommand["type"], StoryboardCommand[]>>;
      triggers: import("@/types").StoryboardTriggerCommand[];
      firstFadeTime: number;
      hasFadeCommand: boolean;
      hideUntilMove: boolean;
      firstMoveTime: number;
      lifetimeEnd: number;
    }
  >();
  protected showStoryboard = true;
  protected backgroundDim = 0.68;
  protected approachMultiplier = 1.5;
  protected backgroundBlur = 0;
  protected showFollowPoints = true;
  protected showApproachCircles = true;
  protected showComboNumbers = true;
  protected showHitEffects = true;
  protected showFPS = true;
  protected hudScale = 1;
  protected cursorSize = 1;
  protected playbackRate = 1;
  protected mods: ModType[] = [];
  protected useBeatmapSkin = true;
  protected customSkinAssetUrls: Record<string, string> = {};
  // 自定义皮肤纹理（优先于谱面皮肤）
  protected customSkinTextures: Map<string, HTMLImageElement> = new Map();
  // Mod 调整后的有效难度值
  protected effectiveAR = 0;
  protected effectiveCS = 0;
  protected effectiveOD = 0;
  protected effectiveHP = 0;
  protected modHidden = false;
  protected modFlashlight = false;
  protected modNoFail = false;
  protected modSuddenDeath = false;
  protected modDT = false;
  protected modHT = false;
  protected modRelax = false;
  protected modAutopilot = false;
  protected showLyrics = true;
  protected lyrics: LyricLine[] = [];
  private lastFrameAt = 0;
  private fpsFrameCount = 0;
  private fpsLastUpdate = 0;
  protected fps = 0;
  // Storyboard 颜色着色用离屏 canvas（避免透明像素被背景/其他物件染色）
  private storyboardColorCanvas: HTMLCanvasElement | null = null;

  protected activeIndex = 0;
  protected hitEffects: HitEffect[] = [];
  protected judgePopups: JudgePopup[] = [];

  constructor(opts: EngineOptions) {
    this.canvas = opts.canvas;
    this.ctx = setupCanvas(opts.canvas);
    this.audio = opts.audio;
    this.beatmap = opts.beatmap;
    this.offset = opts.offset || 0;
    this.mods = opts.mods ?? [];
    this.computeModEffects(opts.beatmap);
    this.windows = windowsForOD(this.effectiveOD);
    this.isLandscape = opts.isLandscape ?? this.ctx.width >= this.ctx.height;
    this.callbacks = opts.callbacks || {};
    this.auto = opts.auto ?? false;
    this.showCursor = opts.showCursor ?? false;
    this.showStoryboard = opts.showStoryboard ?? true;
    this.backgroundDim = opts.backgroundDim ?? 0.68;
    this.approachMultiplier = opts.approachMultiplier ?? 1.5;
    this.backgroundBlur = opts.backgroundBlur ?? 0;
    this.showFollowPoints = opts.showFollowPoints ?? true;
    this.showApproachCircles = opts.showApproachCircles ?? true;
    this.showComboNumbers = opts.showComboNumbers ?? true;
    this.showHitEffects = opts.showHitEffects ?? true;
    this.showFPS = opts.showFPS ?? true;
    this.hudScale = opts.hudScale ?? 1;
    this.cursorSize = opts.cursorSize ?? 1;
    this.playbackRate = opts.playbackRate ?? 1;
    // DT/HT 在用户播放速度基础上叠加倍率
    if (this.modDT) this.playbackRate *= 1.5;
    if (this.modHT) this.playbackRate *= 0.75;
    this.useBeatmapSkin = opts.useBeatmapSkin ?? true;
    if (opts.customSkinAssetUrls) {
      this.customSkinAssetUrls = opts.customSkinAssetUrls;
      this.loadCustomSkinTextures();
    }
    this.showLyrics = opts.showLyrics ?? true;
    this.showCursorTrail = opts.showCursorTrail ?? true;
    this.showCursorPress = opts.showCursorPress ?? true;
    this.autoCursorSpeed = opts.autoCursorSpeed ?? 1;
    this.autoCircleMode = opts.autoCircleMode ?? false;
    this.hitSoundVolume = opts.hitSoundVolume ?? 0.6;
    if (opts.replay) {
      this.isReplay = true;
      this.replayEvents = [...opts.replay.events].sort((a, b) => a.time - b.time);
      this.replayIndex = 0;
    }
    if (opts.lyrics) this.lyrics = opts.lyrics;
    if (opts.backgroundUrl) this.loadBackground(opts.backgroundUrl);
    if (opts.assetUrls) {
      this.assetUrls = opts.assetUrls;
      this.loadStoryboardImages();
      this.loadSkinTextures();
    }
    this.prepareStoryboardCommands();
  }

  /** 判断是否启用了某个 Mod */
  protected hasMod(mod: ModType): boolean {
    return this.mods.includes(mod);
  }

  /** 根据启用的 Mod 计算有效难度与行为标志 */
  private computeModEffects(beatmap: ParsedBeatmap): void {
    const m = new Set(this.mods);
    this.modNoFail = m.has("notail");
    this.modSuddenDeath = m.has("suddenDeath");
    this.modHidden = m.has("hidden");
    this.modFlashlight = m.has("flashlight");
    this.modDT = m.has("doubleTime");
    this.modHT = m.has("halfTime");
    this.modRelax = m.has("relax");
    this.modAutopilot = m.has("autopilot");

    let ar = beatmap.ar;
    let cs = beatmap.cs;
    let od = beatmap.od;
    let hp = beatmap.hp;
    // HardRock：整体上调，封顶 10
    if (m.has("hardRock")) {
      ar = Math.min(10, ar * 1.4);
      cs = Math.min(10, cs * 1.3);
      od = Math.min(10, od * 1.4);
      hp = Math.min(10, hp * 1.4);
    }
    // Easy：整体下调
    if (m.has("easy")) {
      ar *= 0.5;
      cs *= 0.5;
      od *= 0.5;
      hp *= 0.5;
    }
    this.effectiveAR = ar;
    this.effectiveCS = cs;
    this.effectiveOD = od;
    this.effectiveHP = hp;
  }

  /** 预先展开并排序 storyboard 命令，避免每帧重复计算；触发器保留运行时处理 */
  private prepareStoryboardCommands(): void {
    for (const s of this.beatmap.storyboard || []) {
      const all = this.flattenStoryboardCommands(s.commands);
      const triggers: import("@/types").StoryboardTriggerCommand[] = [];
      const normal: StoryboardCommand[] = [];
      for (const c of all) {
        if (c.type === "T") triggers.push(c);
        else normal.push(c);
      }
      normal.sort((a, b) => a.startTime - b.startTime);
      const byType: Partial<Record<StoryboardCommand["type"], StoryboardCommand[]>> = {};
      for (const c of normal) {
        const arr = byType[c.type] || [];
        arr.push(c);
        byType[c.type] = arr;
      }
      // 统计所有 F 命令（含触发器内）的最早开始时间；存在 F 命令的元素默认隐藏
      let firstFadeTime = Infinity;
      const collectFade = (commands: StoryboardCommand[]) => {
        for (const c of commands) {
          if (c.type === "F") {
            firstFadeTime = Math.min(firstFadeTime, c.startTime);
          } else if (c.type === "T") {
            collectFade(c.commands);
          }
        }
      };
      collectFade(s.commands);
      this.storyboardFlat.set(s, {
        all: normal,
        byType,
        triggers,
        firstFadeTime,
        hasFadeCommand: firstFadeTime !== Infinity,
        // 启发式：没有 F 命令但有移动命令的元素，常因作者未写初始隐藏而在开局堆叠
        hideUntilMove: firstFadeTime === Infinity,
        firstMoveTime:
          firstFadeTime === Infinity ? this.findFirstMoveTime(s.commands) : Infinity,
        // 元素生命周期：所有命令（含触发器、循环展开后）的最大结束时间；超过后强制隐藏
        lifetimeEnd: this.computeStoryboardLifetimeEnd(s.commands),
      });
    }
  }

  private loadBackground(url: string): void {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.backgroundImage = img;
      this.backgroundLoaded = true;
    };
    img.onerror = () => {
      this.backgroundLoaded = false;
    };
    img.src = url;
  }

  private loadStoryboardImages(): void {
    const sprites = this.beatmap.storyboard || [];
    const needed = new Set<string>();
    for (const s of sprites) {
      for (const url of this.collectStoryboardImageUrls(s)) {
        needed.add(url);
      }
    }
    if (needed.size === 0) {
      this.storyboardLoaded = true;
      return;
    }
    let loaded = 0;
    for (const url of needed) {
      const img = new Image();
      // blob URL 不需要跨域；http(s) URL 需要
      if (!url.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        loaded++;
        if (loaded >= needed.size) this.storyboardLoaded = true;
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= needed.size) this.storyboardLoaded = true;
      };
      img.src = url;
      this.storyboardImages.set(url, img);
    }
  }

  /** 加载谱面自带的皮肤纹理 */
  private loadSkinTextures(): void {
    if (!this.useBeatmapSkin) {
      this.skinLoaded = true;
      return;
    }
    const skinFiles = [
      "hitcircle.png",
      "hitcircleoverlay.png",
      "approachcircle.png",
      "hit300.png",
      "hit300g.png",
      "hit100.png",
      "hit100k.png",
      "hit50.png",
      "hit50k.png",
      "hit0.png",
      "hit0k.png",
      "sliderb0.png",
      "sliderfollowcircle.png",
      "slidertrack.png",
      "sliderborder.png",
      "sliderscorepoint.png",
      "reversearrow.png",
      "followpoint.png",
    ];
    let loaded = 0;
    let needed = 0;
    for (const name of skinFiles) {
      const url = this.findAssetUrl(name);
      if (!url) continue;
      needed++;
      const img = new Image();
      if (!url.startsWith("blob:")) img.crossOrigin = "anonymous";
      img.onload = () => {
        this.skinTextures.set(name.toLowerCase(), img);
        loaded++;
        if (loaded >= needed) this.skinLoaded = true;
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= needed) this.skinLoaded = true;
      };
      img.src = url;
    }
    if (needed === 0) this.skinLoaded = true;
  }

  /** 获取皮肤纹理，自定义皮肤优先，其次谱面皮肤，不存在返回 null */
  protected getSkinTexture(name: string): HTMLImageElement | null {
    const key = name.toLowerCase();
    return this.customSkinTextures.get(key) || this.skinTextures.get(key) || null;
  }

  /**
   * 将白色皮肤纹理按 combo 颜色着色后绘制。
   * 原理：先用 source-over 画一层颜色矩形（source-atop 裁剪到纹理 alpha），
   * 再用 multiply 叠加纹理本身。等价于把白色纹理 tint 成指定颜色。
   * 适用于 sliderb0 / slidertrack 等本应跟随 combo 颜色的元素。
   */
  protected drawTintedTexture(
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    tint: string,
  ): void {
    const { ctx } = this.ctx;
    ctx.save();
    // 离屏画到临时 canvas 再合成会精确但开销大；这里用 source-atop 近似：
    // 1. 先画纹理（source-over）
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img, x, y, w, h);
    // 2. 在纹理 alpha 范围内叠加颜色（source-atop 保持透明区域）
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = tint;
    ctx.fillRect(x, y, w, h);
    // 3. 再叠加一次纹理用 multiply 增强细节（保留纹理明暗）
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  /** 加载自定义皮肤纹理 */
  private loadCustomSkinTextures(): void {
    const skinFiles = [
      "hitcircle.png", "hitcircleoverlay.png", "approachcircle.png",
      "hit300.png", "hit300g.png", "hit100.png", "hit100k.png",
      "hit50.png", "hit50k.png", "hit0.png", "hit0k.png",
      "sliderb0.png", "sliderfollowcircle.png",
      "slidertrack.png", "sliderborder.png", "sliderscorepoint.png",
      "reversearrow.png", "followpoint.png",
      "cursor.png", "cursortrail.png", "cursormiddle.png",
    ];
    const findCustomUrl = (name: string): string | undefined => {
      const norm = name.replace(/\\/g, "/");
      const base = norm.split("/").pop() || norm;
      if (this.customSkinAssetUrls[norm]) return this.customSkinAssetUrls[norm];
      if (this.customSkinAssetUrls[base]) return this.customSkinAssetUrls[base];
      const lowerBase = base.toLowerCase();
      for (const [k, v] of Object.entries(this.customSkinAssetUrls)) {
        if (k.replace(/\\/g, "/").toLowerCase() === lowerBase) return v;
      }
      return undefined;
    };
    for (const name of skinFiles) {
      const url = findCustomUrl(name);
      if (!url) continue;
      const img = new Image();
      if (!url.startsWith("blob:")) img.crossOrigin = "anonymous";
      img.onload = () => { this.customSkinTextures.set(name.toLowerCase(), img); };
      img.onerror = () => {};
      img.src = url;
    }
  }

  private collectStoryboardImageUrls(sprite: StoryboardSprite): string[] {
    const urls: string[] = [];
    const normalizePath = (name: string) => name.replace(/\\/g, "/");
    const findUrl = (name: string): string | undefined => {
      const norm = normalizePath(name);
      const base = norm.split("/").pop() || norm;
      // 优先精确匹配，再匹配文件名
      if (this.assetUrls[norm]) return this.assetUrls[norm];
      if (this.assetUrls[base]) return this.assetUrls[base];
      // 大小写不敏感兜底
      const lowerNorm = norm.toLowerCase();
      const lowerBase = base.toLowerCase();
      for (const [k, v] of Object.entries(this.assetUrls)) {
        const kk = normalizePath(k).toLowerCase();
        if (kk === lowerNorm || kk === lowerBase) return v;
      }
      return undefined;
    };
    const add = (name: string) => {
      const url = findUrl(name);
      if (url) urls.push(url);
    };
    add(sprite.fileName);
    if (sprite.type === "animation" && sprite.frameCount && sprite.frameDelay) {
      const normFile = normalizePath(sprite.fileName);
      const extMatch = normFile.match(/(\.[^.]+)$/);
      const base = extMatch ? normFile.slice(0, -extMatch[1].length) : normFile;
      const ext = extMatch ? extMatch[1].toLowerCase() : "";
      const exts = ext ? [ext] : [".png", ".jpg", ".jpeg", ".webp"];
      const baseName = base.split("/").pop() || base;
      for (let i = 0; i < sprite.frameCount; i++) {
        for (const e of exts) {
          add(`${base}${i}${e}`);
          add(`${baseName}${i}${e}`);
        }
      }
    }
    return urls;
  }

  /** 横竖屏切换 */
  setOrientation(isLandscape: boolean): void {
    this.isLandscape = isLandscape;
    this.ctx = setupCanvas(this.canvas);
    this.onLayoutChange();
  }

  protected onLayoutChange(): void {
    // 子类重写
  }

  /** 当前游戏时间（毫秒，基于音频播放时间） */
  getCurrentTime(): number {
    if (this.status === "playing") {
      return this.audio.currentTime * 1000 + this.offset;
    }
    if (this.status === "paused") {
      return this.audio.currentTime * 1000 + this.offset;
    }
    return 0;
  }

  /** 启动游戏 */
  start(): void {
    if (this.status !== "idle") return;
    this.status = "playing";
    this.audio.volume = 1;
    this.audio.playbackRate = this.playbackRate;
    try {
      this.audio.currentTime = 0;
    } catch {
      // 音频未加载完成时设置 currentTime 可能抛错
    }
    this.audio.play().catch(() => {
      // 自动播放可能被阻拦，等用户首次交互
    });
    this.startTime = performance.now();
    this.audioStartedAt = 0;
    this.initCursorPosition();
    this.loop();
  }

  pause(): void {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.audio.pause();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.audio.playbackRate = this.playbackRate;
    this.audio.play().catch(() => {});
    this.lastFrameAt = 0;
    this.fpsFrameCount = 0;
    this.fpsLastUpdate = 0;
    this.loop();
  }

  restart(): void {
    this.score = createInitialScore();
    this.resetState();
    try {
      this.audio.currentTime = 0;
    } catch {
      // 忽略音频未就绪时的设置异常
    }
    this.status = "playing";
    this.audio.playbackRate = this.playbackRate;
    this.audio.play().catch(() => {});
    this.lastFrameAt = 0;
    this.fpsFrameCount = 0;
    this.fpsLastUpdate = 0;
    this.initCursorPosition();
    this.loop();
  }

  protected get currentTime(): number {
    return this.getCurrentTime();
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.status = "finished";
    this.audio.pause();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  /** 主循环 */
  protected loop = (): void => {
    if (this.status !== "playing") return;
    const now = performance.now();
    const dt = this.lastFrameAt ? Math.min((now - this.lastFrameAt) / 1000, 0.05) : 0;
    this.lastFrameAt = now;

    // FPS 统计：每 500ms 刷新一次；暂停后间隔过大则重置
    const fpsGap = now - this.fpsLastUpdate;
    if (fpsGap >= 500) {
      this.fps = fpsGap > 2000 ? 0 : Math.round((this.fpsFrameCount * 1000) / fpsGap);
      this.fpsFrameCount = 0;
      this.fpsLastUpdate = now;
    }
    this.fpsFrameCount++;

    const time = this.getCurrentTime();

    // 回放模式：按时间注入已录制的输入事件
    if (this.isReplay) {
      while (
        this.replayIndex < this.replayEvents.length &&
        this.replayEvents[this.replayIndex].time <= time
      ) {
        this.applyReplayEvent(this.replayEvents[this.replayIndex]);
        this.replayIndex++;
      }
    }

    this.update(time);
    this.smoothCursor(dt, time);

    // 失败判定：血量归零且未启用 NoFail → 直接结束（失败）
    if (this.score.health <= 0 && !this.modNoFail) {
      this.finish();
      return;
    }

    this.render();
    this.drawLyrics(time);
    this.updateCursorTrail(time);
    this.drawCursor(time);
    this.drawFPS();
    this.callbacks.onScoreUpdate?.(this.score);

    // 检查是否结束（所有 hitObjects 已处理 + 音频结束）
    if (this.isFinished(time)) {
      this.finish();
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  protected finish(): void {
    this.status = "finished";
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.callbacks.onFinish?.(this.score);
  }

  /** 是否所有对象都已处理完 */
  protected isFinished(time: number): boolean {
    const lastObj = this.beatmap.hitObjects[this.beatmap.hitObjects.length - 1];
    if (!lastObj) return true;
    const lastTime = lastObj.endTime || lastObj.time;
    if (time < lastTime + 2000) return false;
    // 还要等音频播完
    if (!this.audio.ended && this.audio.currentTime < (lastTime + 2000) / 1000) return false;
    return true;
  }

  /** 提交一次判定（应用 NoFail / SuddenDeath Mod） */
  protected submitJudgement(j: Judgement): void {
    this.score = applyJudgement(this.score, j, 1, this.effectiveHP);
    // NoFail：miss 不扣血，回补 applyJudgement 扣除的血量
    if (this.modNoFail && j === "miss") {
      this.score = { ...this.score, health: Math.min(100, this.score.health + this.missHpDrain()) };
    }
    // SuddenDeath：任何 miss 直接清零血量
    if (this.modSuddenDeath && j === "miss") {
      this.score = { ...this.score, health: 0 };
    }
  }

  /** miss 扣血量（基于 effectiveHP） */
  private missHpDrain(): number {
    return Math.max(3, 4 + this.effectiveHP * 0.6);
  }

  /** 超时未点击 → miss（子类可调用） */
  protected checkMiss(time: number, obj: HitObject): boolean {
    if (obj.judged) return false;
    const delta = time - obj.time;
    if (delta > this.windows["50"]) {
      obj.judged = true;
      obj.judgement = "miss";
      this.submitJudgement("miss");
      return true;
    }
    return false;
  }

  /** 用时间差判定一个对象（x/y 为判定文字显示位置） */
  protected judgeHit(obj: HitObject, time: number, x = 0, y = 0): Judgement {
    const delta = time - obj.time;
    const j = judgeByDelta(delta, this.windows);
    const alreadyJudged = obj.judged;
    obj.judged = true;
    obj.judgement = j;
    if (!alreadyJudged) {
      this.submitJudgement(j);
      this.spawnJudgePopup(j, x, y, time);
    }
    if (j !== "miss") this.playHitSound(obj);
    return j;
  }

  /** 获取指定时间的 sampleSet / sampleIndex（二分查找，避免大量 timing point 时线性扫描） */
  private getSampleAt(time: number): { set: number; index: number } {
    const tps = this.beatmap.timingPoints;
    if (tps.length === 0) return { set: 1, index: 0 };

    let lo = 0;
    let hi = tps.length - 1;
    let idx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (tps[mid].time <= time) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    let current: import("@/types").TimingPoint | null = tps[idx];
    let lastUninherited: import("@/types").TimingPoint | null = null;
    for (let i = idx; i >= 0; i--) {
      if (tps[i].uninherited) {
        lastUninherited = tps[i];
        break;
      }
    }
    const base = current || lastUninherited;
    if (!base) return { set: 1, index: 0 };
    let set = base.sampleSet || 0;
    const index = base.sampleIndex || 0;
    if (!base.uninherited && set === 0 && lastUninherited) {
      set = lastUninherited.sampleSet || 1;
    }
    if (set === 0) set = 1;
    return { set, index };
  }

  /** 解析按键音 URL（带缓存，避免每次遍历 assetUrls） */
  private resolveHitSoundUrl(setName: string, sound: string, indexSuffix: string): string | undefined {
    const baseName = `${setName}-hit${sound}${indexSuffix}`;
    const cached = this.hitSoundUrlCache.get(baseName);
    if (cached !== undefined) return cached || undefined;

    const exts = [".wav", ".mp3", ".ogg"];
    let url: string | undefined;
    for (const ext of exts) {
      const key = baseName + ext;
      if (this.assetUrls[key]) {
        url = this.assetUrls[key];
        break;
      }
    }
    if (!url) {
      const lowerBase = baseName.toLowerCase();
      for (const [k, v] of Object.entries(this.assetUrls)) {
        const base = k.split("/").pop()?.toLowerCase() || "";
        if (base === lowerBase + ".wav" || base === lowerBase + ".mp3" || base === lowerBase + ".ogg") {
          url = v;
          break;
        }
      }
    }
    if (!url && indexSuffix) {
      // 自定义 index 不存在时回退到默认
      url = this.resolveHitSoundUrl(setName, sound, "");
    }
    this.hitSoundUrlCache.set(baseName, url || null);
    return url;
  }

  /** 获取（懒创建并恢复）Web Audio 上下文，用于合成默认击打音效 */
  private getAudioCtx(): AudioContext | null {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /** 播放内置默认击打音效（Web Audio 合成，零延迟） */
  protected playDefaultHitSound(isBlue: boolean = false): void {
    if (this.hitSoundVolume <= 0) return;
    const ctx = this.getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isBlue) {
      // "ka" - 高音边缘音
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      osc.type = "triangle";
      gain.gain.setValueAtTime(this.hitSoundVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    } else {
      // "don" - 低音鼓
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      osc.type = "sine";
      gain.gain.setValueAtTime(this.hitSoundVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** 播放物件的按键音（谱面自带音效） */
  protected playHitSound(obj: HitObject): void {
    if (this.hitSoundVolume <= 0) return;
    const { set, index } = this.getSampleAt(obj.time);
    const setName = ["", "normal", "soft", "drum"][set] || "normal";
    const indexSuffix = index > 0 ? `-${index}` : "";
    const flags = obj.hitSound || 0;
    const sounds: string[] = [];
    if (flags & 1) sounds.push("normal");
    if (flags & 2) sounds.push("whistle");
    if (flags & 4) sounds.push("finish");
    if (flags & 8) sounds.push("clap");
    if (sounds.length === 0) sounds.push("normal");

    // 检查是否有可用的谱面自带音效
    let hasAnyUrl = false;
    for (const sound of sounds) {
      const url = this.resolveHitSoundUrl(setName, sound, indexSuffix);
      if (url) { hasAnyUrl = true; break; }
    }

    // 没有谱面自带音效时，使用内置合成音效
    if (!hasAnyUrl) {
      this.playDefaultHitSound(!!(flags & 2)); // whistle = ka (blue)
      return;
    }

    for (const sound of sounds) {
      const url = this.resolveHitSoundUrl(setName, sound, indexSuffix);
      if (!url) continue;

      // 从对象池取一个可用实例，避免连续播放时互相中断
      let pool = this.hitSoundAudioPool.get(url);
      if (!pool) {
        pool = [];
        this.hitSoundAudioPool.set(url, pool);
      }
      let idx = this.hitSoundPoolIndex.get(url) ?? 0;
      let audio = pool[idx];
      if (!audio) {
        try {
          audio = new Audio(url);
        } catch {
          continue;
        }
        audio.preload = "auto";
        pool.push(audio);
      }
      idx = (idx + 1) % this.maxHitSoundPoolSize;
      this.hitSoundPoolIndex.set(url, idx);

      audio.volume = this.hitSoundVolume;

      const play = () => {
        try {
          audio.currentTime = 0;
        } catch {
          // 忽略未加载完成时的设置异常
        }
        audio.play().catch(() => {
          // 忽略自动播放限制等错误
        });
      };

      if (audio.readyState >= 2) {
        play();
      } else {
        const onCanPlay = () => {
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("error", onError);
          play();
        };
        const onError = () => {
          audio.removeEventListener("canplaythrough", onCanPlay);
          audio.removeEventListener("error", onError);
        };
        audio.addEventListener("canplaythrough", onCanPlay);
        audio.addEventListener("error", onError);
      }
    }
  }

  /** 通用：推进活动物件指针 */
  protected advanceActiveIndex(time: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    while (this.activeIndex < len) {
      const obj = objs[this.activeIndex];
      if (!obj.judged && time - (obj.endTime || obj.time) < this.windows["50"] + 200) break;
      this.activeIndex++;
    }
  }

  /** 通用：查找最近的命中目标 */
  protected findHitTarget(
    time: number,
    filter: (obj: HitObject) => boolean,
    scoreFn: (obj: HitObject) => number,
  ): HitObject | null {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    let best: HitObject | null = null;
    let bestScore = Infinity;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      if (!filter(obj)) continue;
      const score = scoreFn(obj);
      if (score < bestScore) {
        bestScore = score;
        best = obj;
      }
      // 超过窗口太多就停止
      if (obj.time - time > this.windows["50"] + 200) break;
    }
    return best;
  }

  /** 添加命中爆点 */
  protected spawnHitEffect(x: number, y: number, judgement: Judgement, time: number): void {
    this.hitEffects.push({ x, y, judgement, time });
  }

  /** 添加判定文字（实际坐标由子类传入） */
  protected spawnJudgePopup(judgement: Judgement, x: number, y: number, time: number): void {
    const map: Record<Judgement, { text: string; color: string; scale: number }> = {
      "300": { text: "PERFECT", color: "#facc15", scale: 0.9 },
      "100": { text: "GREAT", color: "#38bdf8", scale: 0.85 },
      "50": { text: "GOOD", color: "#4ade80", scale: 0.8 },
      miss: { text: "MISS", color: "#ff375f", scale: 0.75 },
    };
    const info = map[judgement];
    this.judgePopups.push({
      text: info.text,
      color: info.color,
      x,
      y,
      time,
      scale: info.scale,
      judgement,
    });
  }

  /** 清理过期命中效果 */
  protected pruneHitEffects(time: number): void {
    this.hitEffects = this.hitEffects.filter((e) => time - e.time < 420);
    this.judgePopups = this.judgePopups.filter((p) => time - p.time < 600);
  }

  /** 绘制命中爆点 - 空心渐变圆环 */
  protected drawHitEffects(time: number): void {
    if (!this.showHitEffects) return;
    const { ctx } = this.ctx;
    const colorMap: Record<Judgement, string> = {
      "300": "#ff9ecf",
      "100": "#38bdf8",
      "50": "#4ade80",
      miss: "#ff375f",
    };
    for (const e of this.hitEffects) {
      const age = time - e.time;
      if (age > 420) continue;
      const t = age / 420;
      const alpha = 1 - t;
      const r = 16 + t * 60;
      const color = colorMap[e.judgement];
      ctx.save();
      ctx.globalAlpha = alpha;

      // 外环 - 空心
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, 10 * (1 - t));
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // 内环残影
      ctx.globalAlpha = alpha * 0.45;
      ctx.lineWidth = Math.max(1, 4 * (1 - t));
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      // 中心微光点
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 4 * (1 - t), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /** 绘制判定文字（在传入位置弹出，向上漂移） */
  protected drawJudgePopups(time: number): void {
    const { ctx } = this.ctx;
    const skinMap: Record<Judgement, string> = {
      "300": "hit300.png",
      "100": "hit100.png",
      "50": "hit50.png",
      miss: "hit0.png",
    };
    for (const p of this.judgePopups) {
      const age = time - p.time;
      const t = age / 600;
      const alpha = 1 - t;
      const drift = -t * 40;
      const scale = p.scale * (1 + Math.sin(t * Math.PI) * 0.15);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y + drift);
      ctx.scale(scale, scale);
      const skin = this.getSkinTexture(skinMap[p.judgement]);
      if (skin) {
        const size = 48;
        ctx.drawImage(skin, -size / 2, -size / 2, size, size);
      } else {
        ctx.font = `bold 24px ${GAME_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, 0, 0);
      }
      ctx.restore();
    }
  }

  /** 绘制背景图 */
  protected drawBackgroundImage(): void {
    const { ctx, width, height } = this.ctx;
    if (this.backgroundImage && this.backgroundLoaded) {
      ctx.save();
      ctx.globalAlpha = 1 - this.backgroundDim;
      if (this.backgroundBlur > 0) {
        ctx.filter = `blur(${this.backgroundBlur}px)`;
      }
      const img = this.backgroundImage;
      const scale = Math.max(width / img.width, height / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
      ctx.filter = "none";
      ctx.restore();
    }
  }

  /** 绘制整体变暗遮罩（覆盖在 Storyboard 之上） */
  protected drawDimOverlay(): void {
    const { ctx, width, height } = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${this.backgroundDim})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** 绘制 Break 提示与倒计时条 */
  protected drawBreakOverlay(time: number): void {
    const { ctx, width, height } = this.ctx;
    const objs = this.beatmap.hitObjects;
    if (objs.length < 2) return;
    for (let i = 0; i < objs.length - 1; i++) {
      const end = objs[i].endTime || objs[i].time;
      const nextStart = objs[i + 1].time;
      if (nextStart - end < 2000) continue;
      const breakStart = end + 500;
      const breakEnd = nextStart - 500;
      if (time >= breakStart && time <= breakEnd) {
        const inBreak = time - breakStart;
        const alpha = Math.min(1, inBreak / 300) * Math.min(1, (breakEnd - time) / 300);
        const totalBreak = breakEnd - breakStart;
        const remaining = breakEnd - time;
        const ratio = totalBreak > 0 ? remaining / totalBreak : 0;
        ctx.save();
        ctx.globalAlpha = alpha;

        // BREAK 文字
        ctx.font = `bold 36px ${GAME_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "#fff";
        ctx.fillText("BREAK", width / 2, height / 2 - 14);

        // 倒计时条
        const barW = Math.min(320, width * 0.6);
        const barH = 6;
        const barX = (width - barW) / 2;
        const barY = height / 2 + 2;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, barH / 2);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * ratio, barH, barH / 2);
        ctx.fill();

        // 剩余时间
        const sec = Math.max(0, remaining / 1000).toFixed(1);
        ctx.font = `bold 18px ${GAME_FONT}`;
        ctx.textBaseline = "top";
        ctx.fillText(`${sec}s`, width / 2, barY + barH + 10);

        ctx.restore();
        break;
      }
    }
  }

  /** 绘制歌词，固定在屏幕底部 */
  protected drawLyrics(time: number): void {
    if (!this.showLyrics || this.lyrics.length === 0) return;
    const current = getCurrentLyric(this.lyrics, time);
    if (!current || !current.text) return;
    const { ctx, width, height } = this.ctx;

    ctx.save();
    ctx.font = `600 18px ${GAME_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.fillText(current.text, width / 2, height - 34);
    ctx.restore();
  }

  /** 更新光标拖尾历史 */
  protected updateCursorTrail(time: number): void {
    if (!this.auto && !this.showCursor) return;
    this.cursorTrail.push({ x: this.cursorX, y: this.cursorY, time });
    if (this.showCursorTrail) {
      // 保留最近 120ms 的历史
      while (this.cursorTrail.length > 0 && time - this.cursorTrail[0].time > 120) {
        this.cursorTrail.shift();
      }
      // 限制最大点数
      if (this.cursorTrail.length > 12) {
        this.cursorTrail.shift();
      }
    } else {
      // 不显示拖尾时只保留当前点
      this.cursorTrail = [{ x: this.cursorX, y: this.cursorY, time }];
    }
  }

  /** 触发光标按下反馈 */
  public pressCursor(time: number): void {
    this.cursorPressed = true;
    this.cursorPressTime = time;
  }

  /** 绘制光标（auto 模式下） */
  protected drawCursor(time: number): void {
    if (!this.auto && !this.showCursor) return;
    const { ctx } = this.ctx;
    const x = this.cursorX;
    const y = this.cursorY;

    // 按下效果衰减
    const pressElapsed = time - this.cursorPressTime;
    const rawPressStrength = this.cursorPressed ? Math.max(0, 1 - pressElapsed / 180) : 0;
    const pressStrength = this.showCursorPress ? rawPressStrength : 0;
    if (rawPressStrength <= 0) this.cursorPressed = false;

    ctx.save();

    // 拖尾：用线段连接历史位置，越旧越透明、越细
    if (this.cursorTrail.length >= 2) {
      for (let i = 1; i < this.cursorTrail.length; i++) {
        const prev = this.cursorTrail[i - 1];
        const cur = this.cursorTrail[i];
        const age = (time - cur.time) / 120;
        const alpha = (1 - age) * 0.35;
        const width = (1 - age) * 3 + 0.5;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(cur.x, cur.y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    const pulse = 1 + Math.sin(performance.now() / 150) * 0.12;
    const pressScale = 1 + pressStrength * 0.5;
    const cs = this.cursorSize;

    // 尝试使用皮肤光标
    const cursorSkin = this.getSkinTexture("cursor.png");
    const cursorMidSkin = this.getSkinTexture("cursormiddle.png");
    if (cursorSkin) {
      const size = 40 * cs * pulse * pressScale;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(cursorSkin, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
      if (cursorMidSkin) {
        const ms = 12 * cs * pressScale;
        ctx.drawImage(cursorMidSkin, x - ms / 2, y - ms / 2, ms, ms);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 3 * cs * pressScale, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "rgba(255,255,255,0.9)";
        ctx.shadowBlur = 10 + pressStrength * 14;
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // 外圈脉冲环（按下时放大）
    ctx.beginPath();
    ctx.arc(x, y, 10 * cs * pulse * pressScale, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + pressStrength * 0.35})`;
    ctx.lineWidth = 1.5 + pressStrength * 1.5;
    ctx.stroke();

    // 按下时额外发光环
    if (pressStrength > 0) {
      ctx.beginPath();
      ctx.arc(x, y, 16 * cs * pressScale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${pressStrength * 0.22})`;
      ctx.fill();
    }

    // 中间半透明环
    ctx.beginPath();
    ctx.arc(x, y, 6 * cs * pressScale, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.25 + pressStrength * 0.35})`;
    ctx.fill();

    // 中心实心点
    ctx.beginPath();
    ctx.arc(x, y, 3 * cs * pressScale, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 10 + pressStrength * 14;
    ctx.fill();

    ctx.restore();
  }

  /** Cubic Bezier easing: (0,0), (x1,y1), (x2,y2), (1,1) */
  private cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
    // 使用 Newton-Raphson 根据 x 反解 t，再求 y
    let ct = t;
    for (let i = 0; i < 6; i++) {
      const x = 3 * x1 * (1 - ct) * (1 - ct) * ct + 3 * x2 * (1 - ct) * ct * ct + ct * ct * ct - t;
      const dx = 3 * x1 * (1 - ct) * (1 - 3 * ct) + 3 * x2 * ct * (2 - 3 * ct) + 3 * ct * ct;
      if (Math.abs(dx) < 1e-6) break;
      ct -= x / dx;
    }
    return 3 * y1 * (1 - ct) * (1 - ct) * ct + 3 * y2 * (1 - ct) * ct * ct + ct * ct * ct;
  }

  /** 计算二次贝塞尔曲线上的点：A -> C -> B */
  private quadBezier(a: number, c: number, b: number, t: number): number {
    const m = 1 - t;
    return m * m * a + 2 * m * t * c + t * t * b;
  }

  /** 计算三次贝塞尔曲线上的点：P0 -> P1 -> P2 -> P3 */
  private cubicBezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const m = 1 - t;
    return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
  }

  /** 根据弧长系数 K 反解圆心角 theta，满足 L = d*K = d*theta/(2*sin(theta/2)) */
  private solveThetaForArc(K: number, maxTheta: number): number {
    if (K <= 1) return 0;
    let lo = 0;
    let hi = maxTheta;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const val = mid / (2 * Math.sin(mid / 2));
      if (val < K) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /** Auto 匀速圆周移动：光标沿固定大弧匀速滑动到目标，中间不停顿 */
  private applyCircularCursor(rawT: number, dt: number, time: number): void {
    const p0x = this.cursorMoveStartX;
    const p0y = this.cursorMoveStartY;
    const p1x = this.cursorTargetX;
    const p1y = this.cursorTargetY;

    const dx = p1x - p0x;
    const dy = p1y - p0y;
    const d = Math.hypot(dx, dy);

    const oldX = this.cursorX;
    const oldY = this.cursorY;

    if (d < 1 || rawT >= 1) {
      this.cursorX = p1x;
      this.cursorY = p1y;
      if (rawT >= 1) {
        // 到达目标后保持轻微环绕，避免完全停顿
        const idleT = (time % 600) / 600;
        const radius = 2.5;
        this.cursorX += Math.cos(idleT * Math.PI * 2) * radius;
        this.cursorY += Math.sin(idleT * Math.PI * 2) * radius;
      }
    } else {
      const durationSec = this.cursorMoveDuration / 1000;
      const maxSpeed = 2200 * this.autoCursorSpeed; // px/s
      const maxArcLen = Math.max(d, maxSpeed * durationSec);

      // 默认圆心角 240°，使路程约为直线距离的 2.4 倍
      const theta0 = (4 * Math.PI) / 3;
      const baseR = d / (2 * Math.sin(theta0 / 2));
      const baseArcLen = baseR * theta0;
      const desiredSpeed = baseArcLen / durationSec;

      let theta = theta0;
      if (desiredSpeed > maxSpeed) {
        // 速度超限则缩短圆心角，保证匀速且不超速
        theta = this.solveThetaForArc(maxArcLen / d, theta0);
      }

      if (theta < 0.01) {
        // 退化为直线插值
        const t = this.cubicBezier(rawT, 0.12, 0.9, 0.25, 1);
        this.cursorX = p0x + dx * t;
        this.cursorY = p0y + dy * t;
      } else {
        const r = d / (2 * Math.sin(theta / 2));
        const h = r * Math.cos(theta / 2);
        const midX = (p0x + p1x) / 2;
        const midY = (p0y + p1y) / 2;
        // 取垂直于弦的方向作为圆心方向
        const perpX = -dy / d;
        const perpY = dx / d;
        const cx = midX + perpX * h;
        const cy = midY + perpY * h;

        const v0x = (p0x - cx) / r;
        const v0y = (p0y - cy) / r;
        const v1x = (p1x - cx) / r;
        const v1y = (p1y - cy) / r;

        // 匀速圆周：参数与经过的弧长成正比
        const u = rawT;
        const sinTheta = Math.sin(theta);
        const s0 = Math.sin((1 - u) * theta);
        const s1 = Math.sin(u * theta);
        const vx = sinTheta === 0 ? v0x : (s0 * v0x + s1 * v1x) / sinTheta;
        const vy = sinTheta === 0 ? v0y : (s0 * v0y + s1 * v1y) / sinTheta;

        this.cursorX = cx + r * vx;
        this.cursorY = cy + r * vy;
      }
    }

    if (dt > 0) {
      const rawVx = (this.cursorX - oldX) / dt;
      const rawVy = (this.cursorY - oldY) / dt;
      const alpha = 0.25;
      this.cursorVelocityX = this.cursorVelocityX * (1 - alpha) + rawVx * alpha;
      this.cursorVelocityY = this.cursorVelocityY * (1 - alpha) + rawVy * alpha;
      const maxVel = 2500;
      const vMag = Math.hypot(this.cursorVelocityX, this.cursorVelocityY);
      if (vMag > maxVel) {
        const s = maxVel / vMag;
        this.cursorVelocityX *= s;
        this.cursorVelocityY *= s;
      }
    }
  }

  /** 光标平滑跟随：auto 使用空间 Cubic Bezier + 时间 Cubic Bezier；手动模式使用柔和弹簧 */
  protected smoothCursor(dt: number, time: number): void {
    if (!this.auto && !this.showCursor) return;

    if (this.auto && this.cursorMoveDuration > 0) {
      const elapsed = time - this.cursorMoveStartTime;
      const rawT = clamp(elapsed / this.cursorMoveDuration, 0, 1);

      // Auto 匀速圆周模式：通过圆弧增加路程，使光标在打击点平滑到达
      if (this.autoCircleMode) {
        this.applyCircularCursor(rawT, dt, time);
        return;
      }

      // 时间轴 ease-out：起步快、收尾柔
      const t = this.cubicBezier(rawT, 0.12, 0.9, 0.25, 1);

      const p0x = this.cursorMoveStartX;
      const p0y = this.cursorMoveStartY;
      const p3x = this.cursorTargetX;
      const p3y = this.cursorTargetY;

      // P1：延续当前速度，保证曲线切线连续
      // cursorMoveDuration 是 ms，velocity 是 px/s，需要 /1000 统一成秒
      const durationSec = this.cursorMoveDuration / 1000;
      let p1x = p0x + this.cursorVelocityX * (durationSec / 3);
      let p1y = p0y + this.cursorVelocityY * (durationSec / 3);

      // 限制 P1 偏移不超过当前段长度的 60%，防止速度过大时光标飞出
      const p1Dist = Math.hypot(p1x - p0x, p1y - p0y);
      const targetDist = Math.hypot(p3x - p0x, p3y - p0y);
      const maxP1Dist = Math.max(targetDist * 0.6, 20);
      if (p1Dist > maxP1Dist) {
        const s = maxP1Dist / p1Dist;
        p1x = p0x + (p1x - p0x) * s;
        p1y = p0y + (p1y - p0y) * s;
      }

      // P2：朝向下一个目标的进入方向；没有 lookahead 时沿当前方向平滑进入
      let p2x: number, p2y: number;
      const hasNext =
        (this.cursorNextTargetX !== -100 || this.cursorNextTargetY !== -100) &&
        (this.cursorNextTargetX !== p3x || this.cursorNextTargetY !== p3y);
      const nextDx = hasNext ? this.cursorNextTargetX - p3x : 0;
      const nextDy = hasNext ? this.cursorNextTargetY - p3y : 0;
      const nextDist = Math.hypot(nextDx, nextDy);
      if (nextDist > 10) {
        const incomingLen = Math.min(nextDist, targetDist) * 0.35;
        p2x = p3x + (nextDx / nextDist) * incomingLen;
        p2y = p3y + (nextDy / nextDist) * incomingLen;
      } else {
        const dx = p3x - p0x;
        const dy = p3y - p0y;
        p2x = p3x - dx * 0.2;
        p2y = p3y - dy * 0.2;
      }

      const oldX = this.cursorX;
      const oldY = this.cursorY;

      this.cursorX = this.cubicBezierPoint(p0x, p1x, p2x, p3x, t);
      this.cursorY = this.cubicBezierPoint(p0y, p1y, p2y, p3y, t);

      // 更新速度并平滑+限幅，防止数值爆炸
      if (dt > 0) {
        const rawVx = (this.cursorX - oldX) / dt;
        const rawVy = (this.cursorY - oldY) / dt;
        const alpha = 0.25;
        this.cursorVelocityX = this.cursorVelocityX * (1 - alpha) + rawVx * alpha;
        this.cursorVelocityY = this.cursorVelocityY * (1 - alpha) + rawVy * alpha;
        const maxVel = 2000;
        const vMag = Math.hypot(this.cursorVelocityX, this.cursorVelocityY);
        if (vMag > maxVel) {
          const s = maxVel / vMag;
          this.cursorVelocityX *= s;
          this.cursorVelocityY *= s;
        }
      }

      // 到达目标后仍保持轻微环绕，避免完全停顿
      if (rawT >= 1) {
        const idleT = (time % 600) / 600;
        const radius = 2.5;
        this.cursorX += Math.cos(idleT * Math.PI * 2) * radius;
        this.cursorY += Math.sin(idleT * Math.PI * 2) * radius;
      }
      return;
    }

    // 手动模式：柔和弹簧
    dt = Math.min(dt, 0.05);
    const dx = this.cursorTargetX - this.cursorX;
    const dy = this.cursorTargetY - this.cursorY;
    const dist = Math.hypot(dx, dy);
    const k = 120;
    const c = 12;
    const ax = dx * k - this.cursorVelocityX * c;
    const ay = dy * k - this.cursorVelocityY * c;
    this.cursorVelocityX += ax * dt;
    this.cursorVelocityY += ay * dt;
    const speed = Math.hypot(this.cursorVelocityX, this.cursorVelocityY);
    const maxSpeed = 900;
    if (speed > maxSpeed && speed > 0) {
      const s = maxSpeed / speed;
      this.cursorVelocityX *= s;
      this.cursorVelocityY *= s;
    }
    this.cursorX += this.cursorVelocityX * dt;
    this.cursorY += this.cursorVelocityY * dt;
    if (dist < 2 && speed < 30) {
      this.cursorX = this.cursorTargetX;
      this.cursorY = this.cursorTargetY;
      this.cursorVelocityX = 0;
      this.cursorVelocityY = 0;
    }
  }

  /** 默认坐标转换（子类可重写） */
  protected toCanvas(x: number, y: number): { x: number; y: number } {
    return { x, y };
  }

  /** 初始化光标位置到第一个目标，避免开场瞬移；子类可重写 */
  protected initCursorPosition(): void {
    const objs = this.beatmap.hitObjects;
    for (const obj of objs) {
      if (obj.type === "spinner") continue;
      const p = this.toCanvas(obj.x, obj.y);
      this.cursorX = p.x;
      this.cursorY = p.y;
      this.cursorTargetX = p.x;
      this.cursorTargetY = p.y;
      return;
    }
  }

  /** 子类实现：每帧逻辑更新 */
  protected abstract update(time: number): void;

  /** 子类实现：绘制游戏物件 */
  protected abstract render(): void;

  /** 子类可重写：重置状态（restart 时调用） */
  protected resetState(): void {
    this.activeIndex = 0;
    this.hitEffects = [];
    this.judgePopups = [];
    if (!this.isReplay) {
      this.replayEvents = [];
    }
    this.replayIndex = 0;
    this.cursorX = -100;
    this.cursorY = -100;
    this.cursorTargetX = -100;
    this.cursorTargetY = -100;
    this.cursorNextTargetX = -100;
    this.cursorNextTargetY = -100;
    this.cursorVelocityX = 0;
    this.cursorVelocityY = 0;
    this.cursorTrail = [];
    this.cursorPressed = false;
    this.cursorPressTime = 0;
    this.cursorMoveStartTime = 0;
    this.cursorMoveDuration = 0;
    this.cursorMoveStartX = -100;
    this.cursorMoveStartY = -100;
    this.cursorLastTargetX = -100;
    this.cursorLastTargetY = -100;
  }

  /** 输入：设置光标位置（子类可重写） */
  public setCursorPos(x: number, y: number): void {
    this.cursorX = x;
    this.cursorY = y;
    // 非 Auto 模式下让光标目标与输入位置保持一致，避免弹簧把光标拉回旧目标导致反弹
    if (!this.auto) {
      this.cursorTargetX = x;
      this.cursorTargetY = y;
      this.cursorVelocityX = 0;
      this.cursorVelocityY = 0;
    }
  }

  /** 回放相关 */
  public getIsReplay(): boolean {
    return this.isReplay;
  }

  public recordReplayEvent(ev: ReplayEvent): void {
    if (!this.isReplay) {
      this.replayEvents.push(ev);
    }
  }

  public getReplayEvents(): ReplayEvent[] {
    return [...this.replayEvents];
  }

  public buildReplayScore(): ReplayScore {
    return {
      score: this.score.score,
      accuracy: this.score.accuracy,
      combo: this.score.combo,
      maxCombo: this.score.maxCombo,
      health: this.score.health,
      counts: { ...this.score.judgements },
    };
  }

  private applyReplayEvent(ev: ReplayEvent): void {
    switch (ev.type) {
      case "down":
        this.handlePointerDown(ev.x ?? 0, ev.y ?? 0);
        break;
      case "up":
        this.handlePointerUp(ev.x ?? 0, ev.y ?? 0);
        break;
      case "keydown":
        this.handleKeyDown(ev.key ?? "");
        break;
      case "keyup":
        this.handleKeyUp(ev.key ?? "");
        break;
    }
  }

  /** 输入：按下（子类必须实现） */
  public onPointerDown(x: number, y: number): void {
    if (this.isReplay) return;
    this.recordReplayEvent({ time: this.currentTime, type: "down", x, y });
    this.handlePointerDown(x, y);
  }

  protected abstract handlePointerDown(x: number, y: number): void;

  /** 输入：移动（子类可选实现） */
  public onPointerMove(x: number, y: number): void {
    if (this.isReplay) return;
    this.handlePointerMove(x, y);
  }

  protected handlePointerMove(_x: number, _y: number): void {
    this.setCursorPos(_x, _y);
  }

  /** 输入：抬起（子类可选实现） */
  public onPointerUp(x: number, y: number): void {
    if (this.isReplay) return;
    this.recordReplayEvent({ time: this.currentTime, type: "up", x, y });
    this.handlePointerUp(x, y);
  }

  protected handlePointerUp(_x: number, _y: number): void {}

  /** 输入：按键（子类可选实现） */
  public onKeyDown(key: string): void {
    if (this.isReplay) return;
    this.recordReplayEvent({ time: this.currentTime, type: "keydown", key });
    this.handleKeyDown(key);
  }

  protected handleKeyDown(_key: string): void {}

  /** 输入：抬键（子类可选实现） */
  public onKeyUp(key: string): void {
    if (this.isReplay) return;
    this.recordReplayEvent({ time: this.currentTime, type: "keyup", key });
    this.handleKeyUp(key);
  }

  protected handleKeyUp(_key: string): void {}

  // ===== Storyboard 渲染 =====

  /** 递归查找最早的移动命令开始时间（含触发器内） */
  private findFirstMoveTime(commands: StoryboardCommand[]): number {
    let t = Infinity;
    for (const c of commands) {
      if (c.type === "M" || c.type === "MX" || c.type === "MY") {
        t = Math.min(t, c.startTime);
      } else if (c.type === "T") {
        t = Math.min(t, this.findFirstMoveTime(c.commands));
      } else if (c.type === "L") {
        t = Math.min(t, c.startTime + this.findFirstMoveTime(c.commands));
      }
    }
    return t;
  }

  /** 计算元素整体生命周期结束时间（含触发器、循环展开后的最大 endTime） */
  private computeStoryboardLifetimeEnd(commands: StoryboardCommand[]): number {
    let end = -Infinity;
    for (const c of commands) {
      if (c.type === "T") {
        // 触发器命令的时间为绝对时间，其内部命令相对于触发器 startTime
        const innerEnd = this.computeStoryboardLifetimeEnd(c.commands);
        if (Number.isFinite(innerEnd)) {
          end = Math.max(end, c.startTime + innerEnd);
        }
        end = Math.max(end, c.endTime);
      } else if (c.type === "L") {
        const loopDuration =
          c.commands.length > 0
            ? Math.max(1, ...c.commands.map((cmd) => Math.max(cmd.endTime, cmd.startTime)))
            : 1;
        const loopEnd = c.startTime + c.loopCount * loopDuration;
        end = Math.max(end, loopEnd);
      } else {
        end = Math.max(end, c.endTime);
      }
    }
    return end;
  }

  /** 把循环/触发器命令再展开（parser 已展开顶层循环，这里兜底触发器内的循环） */
  private flattenStoryboardCommands(commands: StoryboardCommand[]): StoryboardCommand[] {
    const out: StoryboardCommand[] = [];
    for (const c of commands) {
      if (c.type === "L") {
        const loopDuration =
          c.commands.length > 0
            ? Math.max(1, ...c.commands.map((cmd) => Math.max(cmd.endTime, cmd.startTime)))
            : 1;
        for (let i = 0; i < c.loopCount; i++) {
          const base = i * loopDuration;
          out.push(
            ...this.flattenStoryboardCommands(
              c.commands.map((cmd) => ({
                ...cmd,
                startTime: base + cmd.startTime,
                endTime: base + cmd.endTime,
              })),
            ),
          );
        }
      } else if (c.type === "T") {
        // 保留触发器结构，运行时根据血量判断
        out.push(c);
      } else {
        out.push(c);
      }
    }
    return out;
  }

  /** 根据当前血量判断触发器是否生效（支持 Passing / Failing） */
  private isTriggerActive(trigger: import("@/types").StoryboardTriggerCommand, health: number): boolean {
    const name = trigger.triggerName.trim().toLowerCase();
    if (name === "passing") return health > 0;
    if (name === "failing") return health <= 0;
    // 其他触发器（如 HitSound）暂不支持，默认不触发以避免错误显示
    return false;
  }

  /** 获取当前血量下生效的命令列表（含触发器内命令） */
  private getActiveStoryboardCommands(
    sprite: StoryboardSprite,
    health: number,
    time: number,
  ): {
    all: StoryboardCommand[];
    byType: Partial<Record<StoryboardCommand["type"], StoryboardCommand[]>>;
  } {
    const cached = this.storyboardFlat.get(sprite);
    if (!cached) return { all: [], byType: {} };
    const activeTriggers = cached.triggers.filter(
      (t) => this.isTriggerActive(t, health) && time >= t.startTime && time <= t.endTime,
    );
    if (activeTriggers.length === 0) return cached;

    const triggerCommands: StoryboardCommand[] = [];
    for (const t of activeTriggers) {
      // 触发器内命令时间是相对于触发器 startTime 的，需要平移；同时展开内部循环
      const base = t.startTime;
      const flattened = this.flattenStoryboardCommands(t.commands);
      for (const c of flattened) {
        triggerCommands.push({
          ...c,
          startTime: base + c.startTime,
          endTime: base + c.endTime,
        });
      }
    }
    const all = [...cached.all, ...triggerCommands].sort((a, b) => a.startTime - b.startTime);
    const byType: Partial<Record<StoryboardCommand["type"], StoryboardCommand[]>> = {};
    for (const c of all) {
      const arr = byType[c.type] || [];
      arr.push(c);
      byType[c.type] = arr;
    }
    return { all, byType };
  }

  private lastCommandBefore<T extends StoryboardCommand["type"]>(
    list: (StoryboardCommand & { startTime: number; endTime: number })[] | undefined,
    time: number,
  ): (Extract<StoryboardCommand, { type: T }> & { startTime: number; endTime: number }) | null {
    if (!list || list.length === 0) return null;
    let lo = 0;
    let hi = list.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].startTime <= time) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (ans < 0) return null;
    return list[ans] as Extract<StoryboardCommand, { type: T }> & { startTime: number; endTime: number };
  }

  private ease(t: number, easing: number): number {
    const clamped = clamp(t, 0, 1);
    switch (easing) {
      case 0: // linear
        return clamped;
      case 1: // easeOutQuad
        return 1 - Math.pow(1 - clamped, 2);
      case 2: // easeInQuad
        return clamped * clamped;
      case 3: // easeInOutQuad
        return clamped < 0.5 ? 2 * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
      case 4: // easeOutCubic
        return 1 - Math.pow(1 - clamped, 3);
      case 5: // easeInCubic
        return clamped * clamped * clamped;
      case 6: // easeInOutCubic
        return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
      case 7: // easeOutQuart
        return 1 - Math.pow(1 - clamped, 4);
      case 8: // easeInQuart
        return clamped * clamped * clamped * clamped;
      case 9: // easeInOutQuart
        return clamped < 0.5 ? 8 * clamped * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 4) / 2;
      case 10: // easeOutQuint
        return 1 - Math.pow(1 - clamped, 5);
      case 11: // easeInQuint
        return clamped * clamped * clamped * clamped * clamped;
      case 12: // easeInOutQuint
        return clamped < 0.5 ? 16 * Math.pow(clamped, 5) : 1 - Math.pow(-2 * clamped + 2, 5) / 2;
      case 13: // easeOutSine
        return Math.sin((clamped * Math.PI) / 2);
      case 14: // easeInSine
        return 1 - Math.cos((clamped * Math.PI) / 2);
      case 15: // easeInOutSine
        return -(Math.cos(Math.PI * clamped) - 1) / 2;
      case 16: // easeOutExpo
        return clamped === 1 ? 1 : 1 - Math.pow(2, -10 * clamped);
      case 17: // easeInExpo
        return clamped === 0 ? 0 : Math.pow(2, 10 * clamped - 10);
      case 18: // easeInOutExpo
        return clamped === 0 ? 0 : clamped === 1 ? 1 : clamped < 0.5 ? Math.pow(2, 20 * clamped - 10) / 2 : (2 - Math.pow(2, -20 * clamped + 10)) / 2;
      case 19: // easeOutCirc
        return Math.sqrt(1 - Math.pow(clamped - 1, 2));
      case 20: // easeInCirc
        return 1 - Math.sqrt(1 - Math.pow(clamped, 2));
      case 21: // easeInOutCirc
        return clamped < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * clamped, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * clamped + 2, 2)) + 1) / 2;
      case 22: // easeOutElastic
        return clamped === 0 ? 0 : clamped === 1 ? 1 : Math.pow(2, -10 * clamped) * Math.sin((clamped * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
      case 23: // easeInElastic
        return clamped === 0 ? 0 : clamped === 1 ? 1 : -Math.pow(2, 10 * clamped - 10) * Math.sin((clamped * 10 - 10.75) * (2 * Math.PI) / 3);
      case 24: // easeInOutElastic
        return clamped === 0 ? 0 : clamped === 1 ? 1 : clamped < 0.5 ? -Math.pow(2, 20 * clamped - 10) * Math.sin((20 * clamped - 11.125) * (2 * Math.PI) / 4.5) / 2 : Math.pow(2, -20 * clamped + 10) * Math.sin((20 * clamped - 11.125) * (2 * Math.PI) / 4.5) / 2 + 1;
      case 25: { // easeOutBack
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
      }
      case 26: { // easeInBack
        const c1b = 1.70158, c3b = c1b + 1;
        return c3b * clamped * clamped * clamped - c1b * clamped * clamped;
      }
      case 27: { // easeInOutBack
        const c1c = 1.70158, c2c = c1c * 1.525;
        return clamped < 0.5 ? (Math.pow(2 * clamped, 2) * ((c2c + 1) * 2 * clamped - c2c)) / 2 : (Math.pow(2 * clamped - 2, 2) * ((c2c + 1) * (clamped * 2 - 2) + c2c) + 2) / 2;
      }
      case 28: { // easeOutBounce
        const n1 = 7.5625, d1 = 2.75;
        let b = clamped;
        if (b < 1 / d1) return n1 * b * b;
        else if (b < 2 / d1) { b -= 1.5 / d1; return n1 * b * b + 0.75; }
        else if (b < 2.5 / d1) { b -= 2.25 / d1; return n1 * b * b + 0.9375; }
        else { b -= 2.625 / d1; return n1 * b * b + 0.984375; }
      }
      case 29: // easeInBounce
        return 1 - this.ease(1 - clamped, 28);
      case 30: // easeInOutBounce
        return clamped < 0.5 ? (1 - this.ease(1 - 2 * clamped, 28)) / 2 : (1 + this.ease(2 * clamped - 1, 28)) / 2;
      default:
        return clamped;
    }
  }

  private evaluateStoryboardSprite(
    sprite: StoryboardSprite,
    time: number,
    health: number,
  ): {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    alpha: number;
    colorR: number;
    colorG: number;
    colorB: number;
    flipH: boolean;
    flipV: boolean;
    additive: boolean;
  } {
    const flat = this.storyboardFlat.get(sprite);
    const cached = this.getActiveStoryboardCommands(sprite, health, time);
    // 仅当 sprite 完全由触发器控制且当前触发器未生效时才隐藏；有普通命令时按普通命令走
    const hasTriggers = (flat?.triggers.length ?? 0) > 0;
    const triggerOnly = (flat?.all.length ?? 0) === 0;
    const activeTriggers = (flat?.triggers ?? []).filter(
      (t) => this.isTriggerActive(t, health) && time >= t.startTime && time <= t.endTime,
    );
    const triggersHidden = hasTriggers && triggerOnly && activeTriggers.length === 0;

    // 超过元素生命周期后强制隐藏，防止命令结束后仍残留
    const lifetimeEnd = flat?.lifetimeEnd ?? -Infinity;
    const expired = Number.isFinite(lifetimeEnd) && time > lifetimeEnd;

    if (cached.all.length === 0) {
      return {
        x: sprite.x,
        y: sprite.y,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        alpha: expired || triggersHidden ? 0 : flat?.hasFadeCommand ? 0 : 1,
        colorR: 255,
        colorG: 255,
        colorB: 255,
        flipH: false,
        flipV: false,
        additive: false,
      };
    }
    const { byType } = cached;

    const lastCmd = <T extends StoryboardCommand["type"]>(type: T): Extract<StoryboardCommand, { type: T }> | null => {
      const list = byType[type] as (StoryboardCommand & { startTime: number; endTime: number })[] | undefined;
      return this.lastCommandBefore(list, time);
    };

    const firstCmdStart = (type: StoryboardCommand["type"]): number => {
      const list = byType[type] as (StoryboardCommand & { startTime: number })[] | undefined;
      return list && list.length > 0 ? list[0].startTime : Infinity;
    };

    // 仅 Fade 命令决定可见性；存在 F 命令或触发器未激活的元素默认隐藏
    const spriteFirstFade = flat?.firstFadeTime ?? Infinity;
    const activeFirstFade = firstCmdStart("F");
    const firstFadeTime = Math.min(spriteFirstFade, activeFirstFade);

    // 启发式：没有 F 命令但有移动命令的元素，在首个移动命令前隐藏，避免开局堆叠
    const moveHidden =
      flat?.hideUntilMove && Number.isFinite(flat.firstMoveTime) && time < flat.firstMoveTime;

    const state = {
      x: sprite.x,
      y: sprite.y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      alpha: firstFadeTime === Infinity || time >= firstFadeTime ? 1 : 0,
      colorR: 255,
      colorG: 255,
      colorB: 255,
      flipH: false,
      flipV: false,
      additive: false,
    };

    if (triggersHidden || moveHidden || expired) {
      state.alpha = 0;
    }

    const mx = lastCmd("MX");
    if (mx) {
      const dur = mx.endTime - mx.startTime;
      const sx = mx.startX ?? state.x;
      state.x = dur <= 0 ? mx.endX : sx + (mx.endX - sx) * this.ease((time - mx.startTime) / dur, mx.easing);
    }

    const my = lastCmd("MY");
    if (my) {
      const dur = my.endTime - my.startTime;
      const sy = my.startY ?? state.y;
      state.y = dur <= 0 ? my.endY : sy + (my.endY - sy) * this.ease((time - my.startTime) / dur, my.easing);
    }

    // M 优先级高于 MX/MY
    const mv = lastCmd("M");
    if (mv) {
      const dur = mv.endTime - mv.startTime;
      const sx = mv.startX ?? state.x;
      const sy = mv.startY ?? state.y;
      if (dur <= 0) {
        state.x = mv.endX;
        state.y = mv.endY;
      } else {
        const t = this.ease((time - mv.startTime) / dur, mv.easing);
        state.x = sx + (mv.endX - sx) * t;
        state.y = sy + (mv.endY - sy) * t;
      }
    }

    const fade = lastCmd("F");
    if (fade) {
      const dur = fade.endTime - fade.startTime;
      state.alpha = dur <= 0 ? fade.endOpacity : fade.startOpacity + (fade.endOpacity - fade.startOpacity) * this.ease((time - fade.startTime) / dur, fade.easing);
    }

    const scale = lastCmd("S");
    if (scale) {
      const dur = scale.endTime - scale.startTime;
      const ss = scale.startScale ?? state.scaleX;
      const s = dur <= 0 ? scale.endScale : ss + (scale.endScale - ss) * this.ease((time - scale.startTime) / dur, scale.easing);
      state.scaleX = s;
      state.scaleY = s;
    }

    const vScale = lastCmd("V");
    if (vScale) {
      const dur = vScale.endTime - vScale.startTime;
      const sx = vScale.startScaleX ?? state.scaleX;
      const sy = vScale.startScaleY ?? state.scaleY;
      state.scaleX = dur <= 0 ? vScale.endScaleX : sx + (vScale.endScaleX - sx) * this.ease((time - vScale.startTime) / dur, vScale.easing);
      state.scaleY = dur <= 0 ? vScale.endScaleY : sy + (vScale.endScaleY - sy) * this.ease((time - vScale.startTime) / dur, vScale.easing);
    }

    const rot = lastCmd("R");
    if (rot) {
      const dur = rot.endTime - rot.startTime;
      const sr = rot.startRotation ?? state.rotation;
      state.rotation = dur <= 0 ? rot.endRotation : sr + (rot.endRotation - sr) * this.ease((time - rot.startTime) / dur, rot.easing);
    }

    const color = lastCmd("C");
    if (color) {
      const dur = color.endTime - color.startTime;
      const sr = color.startR ?? state.colorR;
      const sg = color.startG ?? state.colorG;
      const sb = color.startB ?? state.colorB;
      if (dur <= 0) {
        state.colorR = color.endR;
        state.colorG = color.endG;
        state.colorB = color.endB;
      } else {
        const t = this.ease((time - color.startTime) / dur, color.easing);
        state.colorR = sr + (color.endR - sr) * t;
        state.colorG = sg + (color.endG - sg) * t;
        state.colorB = sb + (color.endB - sb) * t;
      }
    }

    const pList = byType["P"] as (StoryboardCommand & { parameter: "H" | "V" | "A" })[] | undefined;
    if (pList) {
      let h = 0, v = 0, a = 0;
      for (const pc of pList) {
        if (pc.startTime > time) break;
        if (pc.parameter === "H") h++;
        else if (pc.parameter === "V") v++;
        else if (pc.parameter === "A") a++;
      }
      state.flipH = h % 2 === 1;
      state.flipV = v % 2 === 1;
      state.additive = a % 2 === 1;
    }

    return state;
  }

  private originOffset(origin: string, w: number, h: number): { x: number; y: number } {
    switch (origin) {
      case "TopLeft": return { x: 0, y: 0 };
      case "TopCentre": return { x: -w / 2, y: 0 };
      case "TopRight": return { x: -w, y: 0 };
      case "CentreLeft": return { x: 0, y: -h / 2 };
      case "Centre": return { x: -w / 2, y: -h / 2 };
      case "CentreRight": return { x: -w, y: -h / 2 };
      case "BottomLeft": return { x: 0, y: -h };
      case "BottomCentre": return { x: -w / 2, y: -h };
      case "BottomRight": return { x: -w, y: -h };
      default: return { x: 0, y: 0 };
    }
  }

  private getStoryboardColorCanvas(w: number, h: number): HTMLCanvasElement {
    if (!this.storyboardColorCanvas) {
      this.storyboardColorCanvas = document.createElement("canvas");
    }
    const c = this.storyboardColorCanvas;
    const cw = Math.ceil(w);
    const ch = Math.ceil(h);
    // 只扩容不缩容，避免每帧重新分配 canvas 内存
    if (c.width < cw || c.height < ch) {
      c.width = Math.max(c.width, cw);
      c.height = Math.max(c.height, ch);
    }
    return c;
  }

  private findAssetUrl(name: string): string | undefined {
    const norm = name.replace(/\\/g, "/");
    const base = norm.split("/").pop() || norm;
    if (this.assetUrls[norm]) return this.assetUrls[norm];
    if (this.assetUrls[base]) return this.assetUrls[base];
    const lowerNorm = norm.toLowerCase();
    const lowerBase = base.toLowerCase();
    for (const [k, v] of Object.entries(this.assetUrls)) {
      const kk = k.replace(/\\/g, "/").toLowerCase();
      if (kk === lowerNorm || kk === lowerBase) return v;
    }
    return undefined;
  }

  private getStoryboardImage(sprite: StoryboardSprite, time: number): HTMLImageElement | null {
    let name = sprite.fileName;
    if (sprite.type === "animation" && sprite.frameCount && sprite.frameDelay) {
      const cycle = sprite.frameCount * sprite.frameDelay;
      let frame = 0;
      if (cycle > 0) {
        frame = Math.floor((time % cycle) / sprite.frameDelay) % sprite.frameCount;
      }
      const normFile = name.replace(/\\/g, "/");
      const extMatch = normFile.match(/(\.[^.]+)$/);
      const base = extMatch ? normFile.slice(0, -extMatch[1].length) : normFile;
      const ext = extMatch ? extMatch[1] : "";
      name = `${base}${frame}${ext}`;
    }
    const url = this.findAssetUrl(name);
    return url ? this.storyboardImages.get(url) || null : null;
  }

  private drawStoryboardLayer(time: number, layers: string[]): void {
    if (!this.showStoryboard) return;
    if (!this.storyboardLoaded) return;
    const sprites = this.beatmap.storyboard || [];
    if (sprites.length === 0) return;

    const { ctx } = this.ctx;
    const { width, height } = this.ctx;
    // 固定逻辑分辨率 640x480，按短边等比缩放并居中（保持 Storyboard 原始比例）
    const SB_W = 640;
    const SB_H = 480;
    const scale = Math.min(width / SB_W, height / SB_H);
    const offsetX = (width - SB_W * scale) / 2;
    const offsetY = (height - SB_H * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (const sprite of sprites) {
      if (!layers.includes(sprite.layer)) continue;
      const state = this.evaluateStoryboardSprite(sprite, time, this.score.health);
      if (state.alpha <= 0.001) continue;
      const img = this.getStoryboardImage(sprite, time);
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      // 逻辑尺寸，最终由 ctx.scale 统一缩放到屏幕
      const w = img.naturalWidth * state.scaleX;
      const h = img.naturalHeight * state.scaleY;
      const origin = this.originOffset(sprite.origin, w, h);
      const x = state.x + origin.x;
      const y = state.y + origin.y;

      ctx.save();
      ctx.globalAlpha = clamp(state.alpha, 0, 1);
      if (state.additive) {
        ctx.globalCompositeOperation = "lighter";
      }
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
      // 颜色着色：在离屏 canvas 上先画原图，再用 source-atop 叠色，
      // 这样透明像素不会被背景/其他物件染色
      const hasColor = state.colorR !== 255 || state.colorG !== 255 || state.colorB !== 255;
      if (hasColor) {
        const cw = Math.ceil(w);
        const ch = Math.ceil(h);
        const c = this.getStoryboardColorCanvas(w, h);
        const cctx = c.getContext("2d");
        if (cctx) {
          // 清理实际使用区域（canvas 可能因复用而比当前需要的大）
          cctx.clearRect(0, 0, cw, ch);
          cctx.drawImage(img, 0, 0, w, h);
          cctx.globalCompositeOperation = "source-atop";
          cctx.fillStyle = `rgb(${state.colorR},${state.colorG},${state.colorB})`;
          cctx.fillRect(0, 0, cw, ch);
          cctx.globalCompositeOperation = "source-over";
          // 只绘制 (0,0,w,h) 区域，避免复用 canvas 的残留内容被拉伸
          ctx.drawImage(c, 0, 0, cw, ch, -w / 2, -h / 2, w, h);
        } else {
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      } else {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /** 绘制 Storyboard 所有层，统一放在游戏内容下方 */
  protected drawStoryboardAll(time: number): void {
    const isPass = this.score.health > 0;
    this.drawStoryboardLayer(time, ["Background"]);
    this.drawStoryboardLayer(time, isPass ? ["Pass"] : ["Fail"]);
    this.drawStoryboardLayer(time, ["Foreground", "Overlay"]);
  }

  /** 标准背景+Storyboard流程，子类 render() 应先调用此方法 */
  protected renderBackground(time: number): void {
    clear(this.ctx);
    // 背景图在最底层，Storyboard 在背景图之上、暗化遮罩之下
    this.drawBackgroundImage();
    this.drawStoryboardAll(time);
    this.drawDimOverlay();
  }

  /** 标准前景流程，子类 render() 末尾应调用此方法 */
  protected renderForeground(time: number): void {
    this.drawBreakOverlay(time);
    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawFlashlightOverlay();
  }

  /** Flashlight Mod：屏幕整体变暗，仅光标周围可见 */
  protected drawFlashlightOverlay(): void {
    if (!this.modFlashlight) return;
    const { ctx, width, height } = this.ctx;
    const radius = 120;
    const x = this.auto || this.showCursor ? this.cursorX : width / 2;
    const y = this.auto || this.showCursor ? this.cursorY : height / 2;
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.5)");
    grad.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** 清空画布（兼容旧子类） */
  protected clearScreen(): void {
    clear(this.ctx);
  }

  /** 右下角 FPS 显示 */
  protected drawFPS(): void {
    if (!this.showFPS) return;
    const { ctx, width, height } = this.ctx;
    ctx.save();
    ctx.font = `700 12px ${GAME_FONT}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(`${this.fps} FPS`, width - 12, height - 12);
    ctx.restore();
  }

  /** 绘制 HUD（兼容旧子类） */
  protected drawHUD(opts: { comboColor: string; modeLabel: string; modeColor: string }): void {
    const { ctx } = this.ctx;
    const top = 16;
    const left = 16;

    // 模式标签
    ctx.save();
    ctx.font = `700 12px ${GAME_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = opts.modeColor;
    ctx.fillText(opts.modeLabel, left, top);
    ctx.restore();

    // 分数 / combo / acc
    const scoreText = Math.floor(this.score.score).toLocaleString();
    const comboText = `${this.score.combo}x`;
    const accText = `${this.score.accuracy.toFixed(2)}%`;

    ctx.save();
    ctx.font = `700 20px ${GAME_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(scoreText, left, top + 18);
    ctx.font = `700 14px ${GAME_FONT}`;
    ctx.fillStyle = opts.comboColor;
    ctx.fillText(comboText, left, top + 42);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(accText, left + 64, top + 42);
    ctx.restore();

    // 血量条
    const barW = 160;
    const barH = 5;
    const barX = left;
    const barY = top + 66;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();
    const hpRatio = clamp(this.score.health / 100, 0, 1);
    const hpColor = hpRatio > 0.5 ? "#4ade80" : hpRatio > 0.25 ? "#facc15" : "#ff375f";
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpRatio, barH, 3);
    ctx.fill();
    ctx.restore();

    // Mod 标识（在左上角模块下方）
    if (this.mods.length > 0) {
      const modY = barY + barH + 10;
      let modX = left;
      ctx.save();
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.font = `700 11px ${GAME_FONT}`;
      for (const mod of this.mods) {
        const label = MOD_LABEL[mod];
        const w = ctx.measureText(label).width + 16;
        // 背景胶囊
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.roundRect(modX, modY, w, 20, 6);
        ctx.fill();
        // 文字（Mod 专属颜色）
        ctx.fillStyle = MOD_COLOR[mod];
        ctx.fillText(label, modX + 8, modY + 4);
        modX += w + 5;
        // 超出画块宽度则换行
        if (modX > left + 300) {
          modX = left;
          break;
        }
      }
      ctx.restore();
    }
  }
}
