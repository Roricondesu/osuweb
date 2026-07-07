/** 游戏引擎基类
 *  负责：
 *  - 管理 Canvas / 音频 / 当前时间
 *  - requestAnimationFrame 循环
 *  - 调用子类的 update / render / onInput
 *  - 维护分数状态（通过 Judger）
 */
import type { ParsedBeatmap, HitObject, Judgement } from "@/types";
import {
  createInitialScore,
  applyJudgement,
  windowsForOD,
  judgeByDelta,
  type ScoreState,
  type JudgementWindows,
} from "./Judger";
import type { CanvasContext } from "./renderer/Canvas2D";
import { setupCanvas, clear, drawText, GAME_FONT, clamp } from "./renderer/Canvas2D";

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
}

export interface EngineCallbacks {
  onScoreUpdate?: (score: ScoreState) => void;
  onFinish?: (score: ScoreState) => void;
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

  protected backgroundImage: HTMLImageElement | null = null;
  protected backgroundLoaded = false;
  private lastFrameAt = 0;

  protected activeIndex = 0;
  protected hitEffects: HitEffect[] = [];
  protected judgePopups: JudgePopup[] = [];

  constructor(opts: {
    canvas: HTMLCanvasElement;
    audio: HTMLAudioElement;
    beatmap: ParsedBeatmap;
    offset?: number;
    isLandscape?: boolean;
    callbacks?: EngineCallbacks;
    backgroundUrl?: string;
    auto?: boolean;
    showCursor?: boolean;
  }) {
    this.canvas = opts.canvas;
    this.ctx = setupCanvas(opts.canvas);
    this.audio = opts.audio;
    this.beatmap = opts.beatmap;
    this.offset = opts.offset || 0;
    this.windows = windowsForOD(opts.beatmap.od);
    this.isLandscape = opts.isLandscape ?? this.ctx.width >= this.ctx.height;
    this.callbacks = opts.callbacks || {};
    this.auto = opts.auto ?? false;
    this.showCursor = opts.showCursor ?? false;
    if (opts.backgroundUrl) this.loadBackground(opts.backgroundUrl);
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
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {
      // 自动播放可能被阻拦，等用户首次交互
    });
    this.startTime = performance.now();
    this.audioStartedAt = 0;
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
    this.audio.play().catch(() => {});
    this.lastFrameAt = 0;
    this.loop();
  }

  restart(): void {
    this.score = createInitialScore();
    this.resetState();
    this.audio.currentTime = 0;
    this.status = "playing";
    this.audio.play().catch(() => {});
    this.lastFrameAt = 0;
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
  }

  /** 主循环 */
  protected loop = (): void => {
    if (this.status !== "playing") return;
    const now = performance.now();
    const dt = this.lastFrameAt ? Math.min((now - this.lastFrameAt) / 1000, 0.05) : 0;
    this.lastFrameAt = now;
    const time = this.getCurrentTime();
    this.update(time);
    this.smoothCursor(dt);
    this.render();
    this.drawCursor();
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

  /** 提交一次判定 */
  protected submitJudgement(j: Judgement): void {
    this.score = applyJudgement(this.score, j);
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

  /** 用时间差判定一个对象 */
  protected judgeHit(obj: HitObject, time: number): Judgement {
    const delta = time - obj.time;
    const j = judgeByDelta(delta, this.windows);
    obj.judged = true;
    obj.judgement = j;
    this.submitJudgement(j);
    this.spawnJudgePopup(j, 0, 0, time);
    return j;
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

  /** 添加判定文字（实际坐标由子类传入，这里用相对偏移） */
  protected spawnJudgePopup(judgement: Judgement, x: number, y: number, time: number): void {
    const map: Record<Judgement, { text: string; color: string; scale: number }> = {
      "300": { text: "PERFECT", color: "#66cc44", scale: 1.15 },
      "100": { text: "GREAT", color: "#0a84ff", scale: 1.05 },
      "50": { text: "GOOD", color: "#ff9100", scale: 0.95 },
      miss: { text: "MISS", color: "#ff375f", scale: 0.9 },
    };
    const info = map[judgement];
    this.judgePopups.push({
      text: info.text,
      color: info.color,
      x,
      y,
      time,
      scale: info.scale,
    });
  }

  /** 清理过期命中效果 */
  protected pruneHitEffects(time: number): void {
    this.hitEffects = this.hitEffects.filter((e) => time - e.time < 320);
    this.judgePopups = this.judgePopups.filter((p) => time - p.time < 500);
  }

  /** 绘制命中爆点 */
  protected drawHitEffects(time: number): void {
    const { ctx } = this.ctx;
    for (const e of this.hitEffects) {
      const age = time - e.time;
      const t = age / 320;
      const alpha = 1 - t;
      const r = 16 + t * 24;
      const color = e.judgement === "miss" ? "#ff375f" : "#fff";
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  /** 绘制判定 popup（子类可在 HUD 上方调用） */
  protected drawJudgePopups(time: number): void {
    const { ctx, width } = this.ctx;
    const centerX = width / 2;
    const baseY = this.ctx.height * 0.42;
    for (const p of this.judgePopups) {
      const age = time - p.time;
      const t = Math.min(age / 520, 1);
      const y = baseY - Math.sin(t * Math.PI) * 24;
      const alpha = 1 - t * t;
      const pop = Math.sin(Math.min(t * 6, Math.PI)) * 0.18;
      const scale = p.scale * (1 + pop);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(centerX, y);
      ctx.scale(scale, scale);
      ctx.font = `900 34px ${GAME_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // 外发光
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      // 内高光描边
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.strokeText(p.text, 0, 0);
      ctx.restore();
    }
  }

  /** 统一 HUD（精致现代） */
  protected drawHUD(opts?: { comboColor?: string; modeLabel?: string; modeColor?: string }): void {
    const { ctx, width, height } = this.ctx;
    const s = this.score;
    const comboColor = opts?.comboColor || "#fff";
    const modeColor = opts?.modeColor || "#fff";

    // 顶部毛玻璃条
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.roundRect(12, 10, width - 24, 52, 16);
    ctx.fill();
    // 顶部高光边
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 分数
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    drawText(this.ctx, Math.round(s.score).toLocaleString(), width / 2, 36, {
      font: `900 24px ${GAME_FONT}`,
      fillStyle: "#fff",
      align: "center",
      baseline: "middle",
    });
    ctx.restore();

    // 准确率
    drawText(this.ctx, `${s.accuracy.toFixed(2)}%`, width - 30, 36, {
      font: `700 15px ${GAME_FONT}`,
      fillStyle: "rgba(255,255,255,0.85)",
      align: "right",
      baseline: "middle",
    });

    // combo
    if (s.combo > 0) {
      ctx.save();
      ctx.shadowColor = comboColor;
      ctx.shadowBlur = 12;
      drawText(this.ctx, `${s.combo}x`, 30, 36, {
        font: `900 20px ${GAME_FONT}`,
        fillStyle: comboColor,
        align: "left",
        baseline: "middle",
      });
      ctx.restore();
    }

    // 血条
    const barY = 70;
    const barW = Math.min(220, width * 0.5);
    const barX = (width - barW) / 2;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 6, 3);
    ctx.fill();
    const hp = clamp(s.health / 100, 0, 1);
    const hpColor = hp > 0.5 ? "#4ade80" : hp > 0.25 ? "#facc15" : "#ff375f";
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hp, 6, 3);
    ctx.fill();
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();

    // 判定计数（彩色药丸）
    const j = s.judgements;
    const counts: { label: string; value: number; color: string }[] = [
      { label: "P", value: j["300"], color: "#66cc44" },
      { label: "G", value: j["100"], color: "#0a84ff" },
      { label: "GO", value: j["50"], color: "#ff9100" },
      { label: "X", value: j.miss, color: "#ff375f" },
    ];
    const pillH = 22;
    const pillGap = 8;
    let px = width - 14;
    const py = 92;
    for (let i = counts.length - 1; i >= 0; i--) {
      const item = counts[i];
      ctx.font = `800 11px ${GAME_FONT}`;
      const textW = ctx.measureText(`${item.label} ${item.value}`).width;
      const pillW = textW + 18;
      px -= pillW;
      ctx.save();
      ctx.fillStyle = `${item.color}22`;
      ctx.strokeStyle = `${item.color}66`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, 11);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = item.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${item.label} ${item.value}`, px + pillW / 2, py + pillH / 2 + 1);
      ctx.restore();
      px -= pillGap;
    }

    // 模式标签
    if (opts?.modeLabel) {
      ctx.save();
      ctx.fillStyle = `${modeColor}22`;
      ctx.strokeStyle = `${modeColor}55`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(14, height - 42, 78, 26, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = modeColor;
      ctx.font = `800 12px ${GAME_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opts.modeLabel, 53, height - 29);
      ctx.restore();
    }
  }

  /** 清屏并绘制基础背景 */
  protected clearScreen(): void {
    const { ctx, width, height } = this.ctx;
    if (this.backgroundLoaded && this.backgroundImage && this.backgroundImage.complete && this.backgroundImage.naturalWidth > 0) {
      const img = this.backgroundImage;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = width / height;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (canvasAspect > imgAspect) {
        drawW = width;
        drawH = width / imgAspect;
        drawX = 0;
        drawY = (height - drawH) / 2;
      } else {
        drawH = height;
        drawW = height * imgAspect;
        drawX = (width - drawW) / 2;
        drawY = 0;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.fillStyle = "rgba(0,0,0,0.68)";
      ctx.fillRect(0, 0, width, height);
    } else {
      clear(this.ctx, "#000");
    }
  }

  /** 光标位置更新 */
  public setCursorPos(x: number, y: number): void {
    this.cursorTargetX = x;
    this.cursorTargetY = y;
    if (!this.auto) {
      this.cursorX = x;
      this.cursorY = y;
    }
  }

  /** 自动模式下对光标做平滑插值，避免瞬移 */
  private smoothCursor(dt: number): void {
    if (!this.auto) return;
    if (this.cursorTargetX < 0 || this.cursorTargetY < 0) return;
    const omega = 18; // 约 88ms 时间常数
    const k = 1 - Math.exp(-omega * dt);
    this.cursorX += (this.cursorTargetX - this.cursorX) * k;
    this.cursorY += (this.cursorTargetY - this.cursorY) * k;
  }

  /** 绘制光标 */
  protected drawCursor(): void {
    if (!this.showCursor) return;
    const { ctx } = this.ctx;
    const x = this.cursorX;
    const y = this.cursorY;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // === 抽象方法（子类实现） ===
  protected abstract update(time: number): void;
  protected abstract render(): void;
  public abstract onPointerDown(x: number, y: number): void;
  public abstract onPointerMove?(x: number, y: number): void;
  public abstract onPointerUp?(x: number, y: number): void;
  public abstract onKeyDown(key: string): void;
  public abstract onKeyUp?(key: string): void;

  /** 重启时重置子类内部状态 */
  protected resetState(): void {
    this.activeIndex = 0;
    this.hitEffects = [];
    this.judgePopups = [];
    for (const obj of this.beatmap.hitObjects) {
      obj.judged = false;
      obj.judgement = null;
      obj._sliderHit = false;
    }
    this.cursorX = -100;
    this.cursorY = -100;
    this.cursorTargetX = -100;
    this.cursorTargetY = -100;
  }

  public getScore(): ScoreState {
    return this.score;
  }
  public getStatus(): typeof this.status {
    return this.status;
  }
}
