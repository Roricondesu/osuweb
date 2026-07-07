/** osu!standard 引擎 - 扁平现代视觉
 *  - 圆圈：纯色填充 + 白色边框 + combo 数字
 *  - 滑条：纯色轨道 + 移动小球（真实插值）
 *  - 转盘：纯色圆环 + 旋转指针
 *  - 性能：预计算 combo、活动物件指针
 */
import type { HitObject, ParsedBeatmap, Judgement } from "@/types";
import { GameEngine } from "../GameEngine";
import { drawCircle, drawRing, drawText, drawRect, drawGlassCircle, clamp, lerp, GAME_FONT, hexToRgba } from "../renderer/Canvas2D";

const OSU_W = 512;
const OSU_H = 384;
const CIRCLE_BASE_R = 34;

const COMBO_COLORS = ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"];
const MODE_COLOR = "#f472b6";

const GLASS_ALPHA = 0.45;

const arToPreempt = (ar: number): number => {
  if (ar < 5) return 1200 + 600 * (5 - ar) / 5;
  if (ar === 5) return 1200;
  return 1200 - 750 * (ar - 5) / 5;
};
const csToRadius = (cs: number): number => CIRCLE_BASE_R - 4 * cs / 10;

interface CachedObj {
  comboColor: string;
  comboNumber: number;
  canvasPoints: { x: number; y: number }[];
  sliderDuration: number;
}

type SliderEvalResult = { x: number; y: number; segmentIndex: number; segmentT: number };

export class StandardEngine extends GameEngine {
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private preempt = 1200;
  private r = CIRCLE_BASE_R;
  private spinnerRotation = 0;
  private lastPointer: { x: number; y: number } | null = null;
  private cached: CachedObj[] = [];

  constructor(opts: {
    canvas: HTMLCanvasElement;
    audio: HTMLAudioElement;
    beatmap: ParsedBeatmap;
    offset?: number;
    isLandscape?: boolean;
    callbacks?: import("../GameEngine").EngineCallbacks;
    backgroundUrl?: string;
    auto?: boolean;
    showCursor?: boolean;
  }) {
    super(opts);
    this.preempt = arToPreempt(opts.beatmap.ar);
    this.r = csToRadius(opts.beatmap.cs);
    this.precomputeObjects();
    this.onLayoutChange();
  }

  private precomputeObjects(): void {
    const objs = this.beatmap.hitObjects;
    this.cached = new Array(objs.length);
    let ci = 0, cn = 1;
    let currentColor = COMBO_COLORS[0];
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      if (obj.newCombo) { ci = (ci + 1) % COMBO_COLORS.length; cn = 1; currentColor = COMBO_COLORS[ci]; }
      obj._comboIndex = ci;
      obj._comboNumber = cn;
      const cache: CachedObj = {
        comboColor: currentColor,
        comboNumber: cn,
        canvasPoints: [],
        sliderDuration: 0,
      };
      if (obj.type === "slider") {
        obj.endTime = obj.time + this.sliderDuration(obj);
        cache.sliderDuration = obj.endTime - obj.time;
        if (obj.curvePoints?.length) {
          cache.canvasPoints = [{ x: obj.x, y: obj.y }, ...obj.curvePoints];
        }
      }
      this.cached[i] = cache;
      cn++;
    }
  }

  private sliderDuration(obj: HitObject): number {
    const pixelLength = obj.length || 0;
    const slides = obj.slides || 1;
    const sliderMultiplier = this.beatmap.sliderMultiplier || 1.4;
    if (pixelLength <= 0 || slides <= 0) return 0;
    const beatDuration = this.getBeatDurationAt(obj.time);
    return (pixelLength * beatDuration * slides) / (100 * sliderMultiplier);
  }

  private getBeatDurationAt(time: number): number {
    const tps = this.beatmap.timingPoints;
    let current = tps.find((tp) => tp.uninherited) || tps[0];
    for (const tp of tps) {
      if (tp.time > time) break;
      if (tp.uninherited && tp.beatLength > 0) current = tp;
    }
    return current?.beatLength || 500;
  }

  protected onLayoutChange(): void {
    this.computeLayout();
    // 重新映射预计算点到 canvas 坐标
    for (let i = 0; i < this.beatmap.hitObjects.length; i++) {
      const obj = this.beatmap.hitObjects[i];
      const c = this.cached[i];
      if (obj.type === "slider" && obj.curvePoints?.length) {
        c.canvasPoints = [{ x: obj.x, y: obj.y }, ...obj.curvePoints].map((p) => this.toCanvas(p.x, p.y));
      }
    }
  }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    const padTop = 110, padBottom = 24, padX = 18;
    if (this.isLandscape) {
      this.scale = Math.min((width - padX * 2) / OSU_W, (height - padTop - padBottom) / OSU_H);
      this.offsetX = (width - OSU_W * this.scale) / 2;
      this.offsetY = padTop + (height - padTop - padBottom - OSU_H * this.scale) / 2;
    } else {
      this.scale = Math.min((width - padX * 2) / OSU_H, (height - padTop - padBottom) / OSU_W);
      this.offsetX = (width - OSU_H * this.scale) / 2;
      this.offsetY = padTop + (height - padTop - padBottom - OSU_W * this.scale) / 2;
    }
  }

  private toCanvas(x: number, y: number): { x: number; y: number } {
    if (this.isLandscape) return { x: this.offsetX + x * this.scale, y: this.offsetY + y * this.scale };
    return { x: this.offsetX + y * this.scale, y: this.offsetY + (OSU_W - x) * this.scale };
  }

  private get radius(): number { return this.r * this.scale; }

  protected update(time: number): void {
    this.advanceActiveIndex(time);
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged && !(obj.type === "slider" && obj._sliderHit)) continue;
      const endTime = obj.endTime || obj.time;
      if (time > endTime + this.windows["50"]) {
        if (obj.type === "slider" && obj._sliderHit) {
          obj.judged = true;
          obj.judgement = "300";
          this.submitJudgement("300");
          const p = this.toCanvas(obj.x, obj.y);
          this.spawnHitEffect(p.x, p.y, "300", time);
        } else {
          obj.judged = true;
          obj.judgement = "miss";
          this.submitJudgement("miss");
        }
      } else {
        break; // 后面的物件时间更晚
      }
    }
    if (this.auto) this.autoPlay(time);
    this.pruneHitEffects(time);
  }

  private autoPlay(time: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    const win300 = this.windows["300"];
    let targetX = this.cursorTargetX;
    let targetY = this.cursorTargetY;

    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      const delta = time - obj.time;
      if (delta < -win300 && obj.type !== "slider") break;

      if (obj.type === "spinner") {
        const cx = this.ctx.width / 2, cy = this.ctx.height / 2;
        this.spinnerRotation += 0.6;
        if (this.spinnerRotation > 10) {
          this.judgeHit(obj, time);
          this.spawnHitEffect(cx, cy, "300", time);
          this.spinnerRotation = 0;
        }
        targetX = cx + Math.cos(time / 80) * 60;
        targetY = cy + Math.sin(time / 80) * 60;
        break;
      }

      const p = this.toCanvas(obj.x, obj.y);
      targetX = p.x;
      targetY = p.y;

      if (obj.type === "slider") {
        const c = this.cached[i];
        const pts = c.canvasPoints;
        if (time >= obj.time && time <= (obj.endTime || obj.time) && pts.length >= 2) {
          // auto 跟随滑条球
          const sd = c.sliderDuration || 1;
          const slides = obj.slides || 1;
          const progressRaw = (time - obj.time) / sd;
          const slideIdx = Math.floor(progressRaw * slides);
          if (slideIdx < slides) {
            const localT = (progressRaw * slides) % 1;
            const t = slideIdx % 2 === 0 ? localT : 1 - localT;
            const pos = this.evalSliderPos(pts, t);
            targetX = pos.x;
            targetY = pos.y;
          }
        }
        if (!obj._sliderHit && delta >= -win300 && delta <= win300) {
          obj._sliderHit = true;
          obj.judged = false;
          this.spawnHitEffect(p.x, p.y, "300", time);
        }
        break;
      }

      if (delta <= win300) {
        this.judgeHit(obj, time);
        this.spawnHitEffect(p.x, p.y, "300", time);
      }
      break;
    }
    this.cursorTargetX = targetX;
    this.cursorTargetY = targetY;
  }


  protected render(): void {
    this.clearScreen();
    const time = this.currentTime;
    this.drawPlayfield();

    const objs = this.beatmap.hitObjects;
    for (let i = objs.length - 1; i >= this.activeIndex; i--) {
      const obj = objs[i];
      if (obj.judged && obj.judgement !== "miss" && !(obj.type === "slider" && obj._sliderHit)) continue;
      const timeUntil = obj.time - time;
      if (timeUntil > this.preempt) continue;
      const endTime = obj.endTime || obj.time;
      if (obj.judged && time > endTime + 220) continue;

      if (obj.type === "circle") this.drawCircle(obj, i, time);
      else if (obj.type === "slider") this.drawSlider(obj, i, time);
      else if (obj.type === "spinner") this.drawSpinner(obj, time);
    }

    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!standard", modeColor: MODE_COLOR });
  }

  private drawPlayfield(): void {
    const tl = this.toCanvas(0, 0);
    const br = this.toCanvas(OSU_W, OSU_H);
    const minX = Math.min(tl.x, br.x), maxX = Math.max(tl.x, br.x);
    const minY = Math.min(tl.y, br.y), maxY = Math.max(tl.y, br.y);
    drawRect(this.ctx, minX, minY, maxX - minX, maxY - minY, "rgba(255,255,255,0.018)", 12);
    this.ctx.ctx.strokeStyle = "rgba(255,255,255,0.08)";
    this.ctx.ctx.lineWidth = 1;
    this.ctx.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  }

  private drawCircle(obj: HitObject, idx: number, time: number): void {
    const c = this.cached[idx];
    const p = this.toCanvas(obj.x, obj.y);
    const r = this.radius;
    const timeUntil = obj.time - time;
    const approachT = clamp(1 - timeUntil / this.preempt, 0, 1);
    const color = c.comboColor;

    // approach circle
    if (approachT < 1) {
      const ar = r * (4 - 3 * approachT);
      drawRing(this.ctx, p.x, p.y, ar, hexToRgba(color, 0.65), 2);
    }

    // 主体圆 - 半透明毛玻璃感
    drawGlassCircle(this.ctx, p.x, p.y, r, hexToRgba(color, GLASS_ALPHA), "rgba(255,255,255,0.7)", 2);
    // 内圈
    drawCircle(this.ctx, p.x, p.y, r * 0.55, hexToRgba(color, 0.7));
    // 中心点
    drawCircle(this.ctx, p.x, p.y, r * 0.12, "rgba(255,255,255,0.9)");

    // combo 数字
    drawText(this.ctx, String(c.comboNumber), p.x, p.y - 1, {
      font: `800 ${Math.max(12, Math.round(r * 0.9))}px ${GAME_FONT}`,
      fillStyle: "rgba(255,255,255,0.95)",
      align: "center",
      baseline: "middle",
    });
  }

  private drawSlider(obj: HitObject, idx: number, time: number): void {
    const c = this.cached[idx];
    const color = c.comboColor;
    const pts = c.canvasPoints;
    const r = this.radius;
    const timeUntil = obj.time - time;
    const started = time >= obj.time;
    const ended = time > (obj.endTime || obj.time);

    if (pts.length < 2) {
      // 退化成普通圆
      this.drawCircle(obj, idx, time);
      return;
    }

    const { ctx } = this.ctx;
    const sd = c.sliderDuration || 1;
    const slides = obj.slides || 1;
    let ballPos: SliderEvalResult | null = null;
    if (started && !ended) {
      const progressRaw = (time - obj.time) / sd;
      const slideIdx = Math.floor(progressRaw * slides);
      if (slideIdx < slides) {
        const localT = (progressRaw * slides) % 1;
        const t = slideIdx % 2 === 0 ? localT : 1 - localT;
        ballPos = this.evalSliderPos(pts, t);
      }
    }

    // 绘制整条路径（闭路复用）
    const drawPath = (lineWidth: number, strokeStyle: string, shadow = false) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      if (shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
      }
      ctx.stroke();
      ctx.restore();
    };

    // 外阴影轨道
    drawPath(r * 2.35, "rgba(0,0,0,0.35)", true);
    // 底色轨道
    drawPath(r * 2.0, hexToRgba(color, 0.22));
    // 内芯轨道
    drawPath(r * 1.55, hexToRgba(color, 0.55));

    // 已滑过部分高亮（沿实际路径）
    if (ballPos) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= ballPos.segmentIndex + 1; i++) {
        if (i >= pts.length) break;
        if (i === ballPos.segmentIndex + 1) {
          const a = pts[i - 1];
          const b = pts[i];
          const k = ballPos.segmentT;
          ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
        } else {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      ctx.lineWidth = r * 1.25;
      ctx.strokeStyle = hexToRgba("#fff", 0.5);
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }

    // 头部圆
    drawGlassCircle(this.ctx, pts[0].x, pts[0].y, r, hexToRgba(color, GLASS_ALPHA), "rgba(255,255,255,0.85)", 2);
    drawCircle(this.ctx, pts[0].x, pts[0].y, r * 0.55, hexToRgba(color, 0.55));
    drawCircle(this.ctx, pts[0].x, pts[0].y, r * 0.12, "rgba(255,255,255,0.95)");
    drawText(this.ctx, String(c.comboNumber), pts[0].x, pts[0].y - 1, {
      font: `800 ${Math.max(12, Math.round(r * 0.8))}px ${GAME_FONT}`,
      fillStyle: "rgba(255,255,255,0.95)",
      align: "center",
      baseline: "middle",
    });

    // 尾部圆
    const tail = pts[pts.length - 1];
    drawGlassCircle(this.ctx, tail.x, tail.y, r * 0.82, hexToRgba(color, 0.28), "rgba(255,255,255,0.45)", 1.5);

    // 反向箭头（多 slide 时在尾部）
    if (slides > 1 && !ended) {
      this.drawReverseArrow(tail, pts[pts.length - 2] || pts[0], r, color, time);
    }

    // approach circle
    if (timeUntil > 0) {
      const approachT = clamp(1 - timeUntil / this.preempt, 0, 1);
      if (approachT < 1) {
        const ar = r * (3.8 - 2.8 * approachT);
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        drawRing(this.ctx, pts[0].x, pts[0].y, ar, hexToRgba(color, 0.7), 2.5);
        ctx.restore();
      }
    }

    // 滑条球 + 拖尾
    if (ballPos) {
      const { x: bx, y: by } = ballPos;
      // 外发光
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, r * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, 0.28);
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.restore();
      // 主体
      drawCircle(this.ctx, bx, by, r * 0.48, "rgba(255,255,255,0.95)", color, 2.5);
      // 核心
      drawCircle(this.ctx, bx, by, r * 0.22, "#fff");
    }
  }

  private drawReverseArrow(tail: { x: number; y: number }, prev: { x: number; y: number }, r: number, color: string, time: number): void {
    const { ctx } = this.ctx;
    const dx = tail.x - prev.x;
    const dy = tail.y - prev.y;
    const angle = Math.atan2(dy, dx);
    const size = r * 0.7;
    const pulse = 1 + Math.sin(time / 80) * 0.08;
    ctx.save();
    ctx.translate(tail.x, tail.y);
    ctx.rotate(angle);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.5);
    ctx.lineTo(size * 0.5, 0);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, 0.85);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private evalSliderPos(pts: { x: number; y: number }[], t: number): SliderEvalResult {
    if (pts.length === 1) return { ...pts[0], segmentIndex: 0, segmentT: 0 };
    const totalLen = pts.reduce((sum, p, i) => i === 0 ? 0 : sum + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y), 0);
    if (totalLen === 0) return { ...pts[0], segmentIndex: 0, segmentT: 0 };
    let target = totalLen * clamp(t, 0, 1);
    for (let i = 1; i < pts.length; i++) {
      const segLen = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      if (target <= segLen) {
        const k = segLen === 0 ? 0 : target / segLen;
        return {
          x: pts[i-1].x + (pts[i].x - pts[i-1].x) * k,
          y: pts[i-1].y + (pts[i].y - pts[i-1].y) * k,
          segmentIndex: i - 1,
          segmentT: k,
        };
      }
      target -= segLen;
    }
    return { ...pts[pts.length - 1], segmentIndex: pts.length - 2, segmentT: 1 };
  }

  private drawSpinner(obj: HitObject, time: number): void {
    const cx = this.ctx.width / 2;
    const cy = this.offsetY + OSU_H * this.scale / 2;
    const r = Math.min(this.ctx.width, this.ctx.height) * 0.3;
    drawRing(this.ctx, cx, cy, r, "rgba(255,255,255,0.18)", 6);
    drawRing(this.ctx, cx, cy, r * 0.7, "rgba(255,255,255,0.12)", 3);

    const start = obj.time;
    const end = obj.endTime || obj.time;
    if (time >= start && time <= end) {
      const progress = (time - start) / (end - start);
      const angle = progress * Math.PI * 10 + (this.auto ? time / 40 : 0);
      const { ctx } = this.ctx;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = MODE_COLOR;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      ctx.restore();
    }

    drawText(this.ctx, "SPIN", cx, cy, {
      font: `900 20px ${GAME_FONT}`,
      fillStyle: "rgba(255,255,255,0.55)",
      align: "center",
      baseline: "middle",
    });
  }

  public onPointerDown(x: number, y: number): void {
    if (this.status !== "playing") return;
    const time = this.currentTime;
    let best: HitObject | null = null;
    let bestScore = Infinity;
    const len = this.beatmap.hitObjects.length;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = this.beatmap.hitObjects[i];
      if (obj.judged || obj.type === "spinner") continue;
      const p = this.toCanvas(obj.x, obj.y);
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist > this.radius * 1.35) continue;
      const delta = Math.abs(time - obj.time);
      if (delta > this.windows["50"]) continue;
      const score = dist + delta * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = obj;
      }
      if (obj.time - time > this.preempt) break;
    }
    if (best) {
      if (best.type === "slider") {
        best._sliderHit = true;
        // 不立即判定，滑条尾超时再判定
        return;
      }
      const j = this.judgeHit(best, time);
      const p = this.toCanvas(best.x, best.y);
      this.spawnHitEffect(p.x, p.y, j, time);
    }
  }

  public onPointerMove = (x: number, y: number): void => {
    this.lastPointer = { x, y };
  };

  public onPointerUp = (): void => {
    this.lastPointer = null;
  };

  public onKeyDown(key: string): void {
    if (key === "x" || key === "X" || key === "z" || key === "Z" || key === " ") {
      if (this.lastPointer) this.onPointerDown(this.lastPointer.x, this.lastPointer.y);
      else this.onPointerDown(this.ctx.width / 2, this.ctx.height / 2);
    }
  }

  public onKeyUp = (): void => {};
}
