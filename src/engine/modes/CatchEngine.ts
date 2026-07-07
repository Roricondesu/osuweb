/** osu!catch 引擎 - 扁平现代视觉
 *  - 水果：纯色几何图形（圆/三角/菱形）
 *  - 盘子：扁平弧形托盘
 *  - 命中爆点
 *  - 横屏：左右飞，盘子上下移动
 *  - 竖屏：上下落，盘子左右移动
 *  - 性能：活动物件指针
 */
import type { HitObject, ParsedBeatmap, Judgement } from "@/types";
import { GameEngine } from "../GameEngine";
import { drawCircle, drawRect, drawText, clamp, GAME_FONT } from "../renderer/Canvas2D";

const APPROACH_TIME = 1500;
const FRUIT_R = 22;
const PLATE_HALF = 54;
const MODE_COLOR = "#4ade80";

const FRUIT_COLORS = ["#f472b6", "#fbbf24", "#4ade80", "#38bdf8", "#a78bfa"];
const FRUIT_SHAPES = ["circle", "triangle", "diamond", "drop"] as const;

interface CachedFruit {
  shape: typeof FRUIT_SHAPES[number];
  color: string;
}

export class CatchEngine extends GameEngine {
  private judgeAxis = 0;
  private platePos = 0;
  private targetPos = 0;
  private pointerDown = false;
  private leftHeld = false;
  private rightHeld = false;
  private lastTime = 0;
  private cached: CachedFruit[] = [];

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
    this.precomputeFruits();
    this.computeLayout();
  }

  protected onLayoutChange(): void { this.computeLayout(); }

  private precomputeFruits(): void {
    const objs = this.beatmap.hitObjects;
    this.cached = new Array(objs.length);
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      const shapeIdx = (Math.floor(obj.time / 1000) + (obj.x | 0)) % FRUIT_SHAPES.length;
      const colorIdx = (Math.floor(obj.time / 1000) + (obj.y | 0)) % FRUIT_COLORS.length;
      this.cached[i] = {
        shape: FRUIT_SHAPES[shapeIdx],
        color: obj.type === "slider" ? "#fbbf24" : FRUIT_COLORS[colorIdx],
      };
    }
  }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    if (this.isLandscape) {
      this.judgeAxis = width * 0.2;
      this.platePos = height / 2;
    } else {
      this.judgeAxis = height - 80;
      this.platePos = width / 2;
    }
    this.targetPos = this.platePos;
  }

  private fruitFlow(obj: HitObject, time: number): number {
    const dt = obj.time - time;
    if (this.isLandscape) {
      const startX = this.ctx.width + FRUIT_R;
      return this.judgeAxis + (dt / APPROACH_TIME) * (startX - this.judgeAxis);
    } else {
      const startY = -FRUIT_R;
      return this.judgeAxis - (dt / APPROACH_TIME) * (this.judgeAxis - startY);
    }
  }

  private fruitCross(obj: HitObject): number {
    return (obj.x / 512) * (this.isLandscape ? this.ctx.height : this.ctx.width);
  }

  private pointerToPlate(x: number, y: number): number {
    return this.isLandscape ? y : x;
  }

  protected update(time: number): void {
    const dt = Math.max(0, time - this.lastTime);
    this.lastTime = time;

    this.advanceActiveIndex(time);

    if (this.auto) {
      this.autoPlay(time);
    } else if (this.leftHeld || this.rightHeld) {
      const dir = (this.rightHeld ? 1 : 0) - (this.leftHeld ? 1 : 0);
      const max = this.isLandscape ? this.ctx.height : this.ctx.width;
      this.targetPos = clamp(this.platePos + dir * 0.8 * dt, 0, max);
    }
    this.platePos += (this.targetPos - this.platePos) * 0.42;

    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      const flow = this.fruitFlow(obj, time);
      const cross = this.fruitCross(obj);
      if (this.isLandscape) {
        if (flow <= this.judgeAxis + FRUIT_R) {
          const dist = Math.abs(cross - this.platePos);
          if (dist < PLATE_HALF) {
            const j = this.judgeHit(obj, time);
            this.spawnHitEffect(this.judgeAxis, cross, j, time);
          } else if (flow < this.judgeAxis - FRUIT_R) {
            obj.judged = true; obj.judgement = "miss"; this.submitJudgement("miss");
            this.spawnHitEffect(this.judgeAxis, cross, "miss", time);
          }
        } else {
          break;
        }
      } else {
        if (flow >= this.judgeAxis - FRUIT_R) {
          const dist = Math.abs(cross - this.platePos);
          if (dist < PLATE_HALF) {
            const j = this.judgeHit(obj, time);
            this.spawnHitEffect(cross, this.judgeAxis, j, time);
          } else if (flow > this.judgeAxis + FRUIT_R) {
            obj.judged = true; obj.judgement = "miss"; this.submitJudgement("miss");
            this.spawnHitEffect(cross, this.judgeAxis, "miss", time);
          }
        } else {
          break;
        }
      }
    }
    this.pruneHitEffects(time);
  }

  private autoPlay(time: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    let nearest: HitObject | null = null;
    let nearestDist = Infinity;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      const flow = this.fruitFlow(obj, time);
      const dist = this.isLandscape
        ? this.judgeAxis + 200 - flow
        : flow - (this.judgeAxis - 200);
      if (dist < 0) break;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = obj;
      }
    }
    if (nearest) {
      this.targetPos = this.fruitCross(nearest);
    }
    const px = this.isLandscape ? this.judgeAxis : this.platePos;
    const py = this.isLandscape ? this.platePos : this.judgeAxis;
    this.cursorTargetX = px;
    this.cursorTargetY = py;
  }

  protected render(): void {
    this.clearScreen();
    const time = this.currentTime;
    this.drawTrack();

    const objs = this.beatmap.hitObjects;
    for (let i = objs.length - 1; i >= this.activeIndex; i--) {
      const obj = objs[i];
      if (obj.judged && obj.judgement !== "miss") continue;
      const dt = obj.time - time;
      if (dt > APPROACH_TIME) continue;
      const flow = this.fruitFlow(obj, time);
      if (this.isLandscape && flow < -FRUIT_R) continue;
      if (!this.isLandscape && flow > this.ctx.height + FRUIT_R) continue;
      const cross = this.fruitCross(obj);
      const x = this.isLandscape ? flow : cross;
      const y = this.isLandscape ? cross : flow;
      this.drawFruit(x, y, i, time);
    }

    this.drawPlate();
    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!catch", modeColor: MODE_COLOR });
  }

  private drawTrack(): void {
    const { width, height, ctx } = this.ctx;
    if (this.isLandscape) {
      const x = this.judgeAxis - FRUIT_R - 12;
      drawRect(this.ctx, x, 0, (FRUIT_R + 12) * 2, height, "rgba(74,222,128,0.06)", 0);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, 0, (FRUIT_R + 12) * 2, height);
      drawRect(this.ctx, this.judgeAxis - 2, 0, 4, height, "rgba(255,255,255,0.2)", 0);
    } else {
      const y = this.judgeAxis - FRUIT_R - 12;
      drawRect(this.ctx, 0, y, width, (FRUIT_R + 12) * 2, "rgba(74,222,128,0.06)", 0);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, width, (FRUIT_R + 12) * 2);
      drawRect(this.ctx, 0, this.judgeAxis - 2, width, 4, "rgba(255,255,255,0.2)", 0);
    }
  }

  private drawFruit(x: number, y: number, idx: number, time: number): void {
    const c = this.cached[idx];
    const { ctx } = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((time / 500) % (Math.PI * 2));
    ctx.fillStyle = c.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (c.shape === "circle") {
      ctx.arc(0, 0, FRUIT_R, 0, Math.PI * 2);
    } else if (c.shape === "triangle") {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
        const px = Math.cos(a) * FRUIT_R;
        const py = Math.sin(a) * FRUIT_R;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (c.shape === "diamond") {
      ctx.moveTo(0, -FRUIT_R); ctx.lineTo(FRUIT_R, 0); ctx.lineTo(0, FRUIT_R); ctx.lineTo(-FRUIT_R, 0); ctx.closePath();
    } else {
      ctx.arc(0, 0, FRUIT_R, 0, Math.PI * 2);
    }
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  private drawPlate(): void {
    const { ctx } = this.ctx;
    let px: number, py: number;
    if (this.isLandscape) { px = this.judgeAxis; py = this.platePos; }
    else { px = this.platePos; py = this.judgeAxis; }
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(px - PLATE_HALF, py);
    ctx.quadraticCurveTo(px, py + 16, px + PLATE_HALF, py);
    ctx.lineTo(px + PLATE_HALF, py - 10);
    ctx.lineTo(px - PLATE_HALF, py - 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - PLATE_HALF, py - 10);
    ctx.lineTo(px + PLATE_HALF, py - 10);
    ctx.strokeStyle = MODE_COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawCircle(this.ctx, px, py - 5, 3, "rgba(0,0,0,0.3)");
    ctx.restore();
  }

  public onPointerDown(x: number, y: number): void {
    if (this.status !== "playing") return;
    this.pointerDown = true;
    const max = this.isLandscape ? this.ctx.height : this.ctx.width;
    this.targetPos = clamp(this.pointerToPlate(x, y), 0, max);
  }
  public onPointerMove = (x: number, y: number): void => {
    if (this.status !== "playing" || !this.pointerDown) return;
    const max = this.isLandscape ? this.ctx.height : this.ctx.width;
    this.targetPos = clamp(this.pointerToPlate(x, y), 0, max);
  };
  public onPointerUp = (): void => { this.pointerDown = false; };

  public onKeyDown(key: string): void {
    const k = key.toLowerCase();
    if (k === "arrowleft" || k === "a") this.leftHeld = true;
    else if (k === "arrowright" || k === "d") this.rightHeld = true;
  }
  public onKeyUp = (key: string): void => {
    const k = key.toLowerCase();
    if (k === "arrowleft" || k === "a") this.leftHeld = false;
    else if (k === "arrowright" || k === "d") this.rightHeld = false;
  };

  protected resetState(): void {
    super.resetState();
    this.pointerDown = false;
    this.leftHeld = false;
    this.rightHeld = false;
    this.lastTime = 0;
    this.precomputeFruits();
  }
}
