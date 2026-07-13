/** osu!catch 引擎 - 优化后的视觉与交互
 *  - 水果：官方皮肤纹理映射（apple / bananas / drop / grapes / orange / pear）
 *  - 盘子：扁平托盘 + 皮肤 catcher 纹理
 *  - 轨道：判定区高亮 + 边界虚线 + 中心参考线
 *  - 滑条物件渲染为水滴，转盘物件渲染为香蕉
 *  - 横屏：左右飞，盘子上下移动
 *  - 竖屏：上下落，盘子左右移动
 */
import type { HitObject } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawCircle, clamp } from "../renderer/Canvas2D";

const APPROACH_TIME = 1500;
const FRUIT_R = 24;
const DROP_R = 14;
const PLATE_HALF = 58;
const MODE_COLOR = "#4ade80";

/** 水果颜色：与官方 combo 色对应 */
const FRUIT_COLORS = ["#f472b6", "#fbbf24", "#4ade80", "#38bdf8", "#a78bfa"];

interface CachedFruit {
  type: "fruit" | "drop" | "banana";
  color: string;
  spin: number;
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
  private lastFocusIndex = -1;
  private hyperStart = 0;

  constructor(opts: EngineOptions) {
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
      const colorIdx = (obj.newCombo ? i : i + Math.floor(obj.time / 200)) % FRUIT_COLORS.length;
      const color = obj.type === "slider" ? "#fbbf24" : FRUIT_COLORS[colorIdx];
      this.cached[i] = {
        type: obj.type === "spinner" ? "banana" : obj.type === "slider" ? "drop" : "fruit",
        color,
        spin: (Math.random() - 0.5) * 0.02,
      };
    }
  }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    if (this.isLandscape) {
      this.judgeAxis = width * 0.22;
      this.platePos = height / 2;
    } else {
      this.judgeAxis = height - 100;
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
      const speed = 1.1 + (this.hyperStart > 0 && time - this.hyperStart < 200 ? 0.6 : 0);
      this.targetPos = clamp(this.platePos + dir * speed * dt, 0, max);
    }
    this.platePos += (this.targetPos - this.platePos) * 0.45;

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
    const win300 = this.windows["300"];

    let focus: HitObject | null = null;
    let focusIndex = -1;
    let bestScore = Infinity;

    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;

      const dt = obj.time - time;
      const flow = this.fruitFlow(obj, time);

      const passed = this.isLandscape
        ? this.judgeAxis - flow
        : flow - this.judgeAxis;
      if (passed > FRUIT_R + PLATE_HALF) continue;

      let score = Math.abs(dt);
      const approachT = clamp(1 - dt / APPROACH_TIME, 0, 1);
      score -= approachT * 1200;

      if (Math.abs(dt) <= win300) {
        const urgency = (win300 - Math.abs(dt)) / win300;
        score -= 2000 + urgency * 3000;
      }

      if (score < bestScore) {
        bestScore = score;
        focus = obj;
        focusIndex = i;
      }

      if (dt > APPROACH_TIME) break;
    }

    if (!focus) return;

    const targetCross = this.fruitCross(focus);

    let nextCross = targetCross;
    let futureDx = 0;
    let futureWeight = 0;
    for (let j = focusIndex + 1, w = 1; j < len && w > 0.1; j++) {
      const next = objs[j];
      if (next.judged) continue;
      const nextDt = next.time - time;
      if (nextDt > APPROACH_TIME) break;
      const nc = this.fruitCross(next);
      futureDx += (nc - targetCross) * w;
      futureWeight += w;
      w *= 0.55;
    }
    if (futureWeight > 0) {
      nextCross = targetCross + futureDx / futureWeight;
    }

    const targetX = this.isLandscape ? this.judgeAxis : targetCross;
    const targetY = this.isLandscape ? targetCross : this.judgeAxis;
    const nextX = this.isLandscape ? this.judgeAxis : nextCross;
    const nextY = this.isLandscape ? nextCross : this.judgeAxis;

    if (focusIndex !== this.lastFocusIndex) {
      this.lastFocusIndex = focusIndex;
      this.cursorMoveStartTime = time;
      this.cursorMoveStartX = this.cursorX;
      this.cursorMoveStartY = this.cursorY;
      this.cursorLastTargetX = this.cursorTargetX;
      this.cursorLastTargetY = this.cursorTargetY;
      const baseDuration = Math.max(50, Math.min(APPROACH_TIME, focus.time - time));
      this.cursorMoveDuration = Math.max(30, baseDuration / this.autoCursorSpeed);
    }

    this.targetPos = targetCross;
    this.cursorTargetX = targetX;
    this.cursorTargetY = targetY;
    this.cursorNextTargetX = nextX;
    this.cursorNextTargetY = nextY;
  }

  protected render(): void {
    this.renderBackground(this.currentTime);
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

    this.drawPlate(time);
    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!catch", modeColor: MODE_COLOR });
  }

  private drawTrack(): void {
    const { width, height, ctx } = this.ctx;
    const trackHalf = FRUIT_R + 16;

    ctx.save();
    if (this.isLandscape) {
      const x = this.judgeAxis - trackHalf;
      const w = trackHalf * 2;
      // 判定区背景
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, "rgba(74,222,128,0.0)");
      grad.addColorStop(0.5, "rgba(74,222,128,0.08)");
      grad.addColorStop(1, "rgba(74,222,128,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, height);
      // 边界
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x, 0, w, height);
      ctx.setLineDash([]);
      // 判定线
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(this.judgeAxis - 1.5, 0, 3, height);
      // 上下边界粗线
      ctx.strokeStyle = MODE_COLOR;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(0, trackHalf);
      ctx.lineTo(width, trackHalf);
      ctx.moveTo(0, height - trackHalf);
      ctx.lineTo(width, height - trackHalf);
      ctx.stroke();
    } else {
      const y = this.judgeAxis - trackHalf;
      const h = trackHalf * 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, "rgba(74,222,128,0.0)");
      grad.addColorStop(0.5, "rgba(74,222,128,0.08)");
      grad.addColorStop(1, "rgba(74,222,128,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, width, h);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(0, y, width, h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(0, this.judgeAxis - 1.5, width, 3);
      ctx.strokeStyle = MODE_COLOR;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(trackHalf, 0);
      ctx.lineTo(trackHalf, height);
      ctx.moveTo(width - trackHalf, 0);
      ctx.lineTo(width - trackHalf, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFruit(x: number, y: number, idx: number, time: number): void {
    const c = this.cached[idx];
    const { ctx } = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((time / 800) * (c.spin + 1));

    if (c.type === "banana") {
      this.drawBanana(ctx);
    } else if (c.type === "drop") {
      this.drawDrop(ctx, c.color);
    } else {
      this.drawRegularFruit(ctx, c.color, idx);
    }

    ctx.restore();
  }

  private drawRegularFruit(ctx: CanvasRenderingContext2D, color: string, idx: number): void {
    // 优先使用官方皮肤纹理
    const skinNames = ["fruit-apple.png", "fruit-pear.png", "fruit-grapes.png", "fruit-orange.png"];
    const skinName = skinNames[idx % skinNames.length];
    const skin = this.getSkinTexture(skinName);
    const r = FRUIT_R;
    if (skin) {
      const size = r * 2;
      this.drawTintedTexture(skin, -size / 2, -size / 2, size, size, color);
      // 水果高光描边
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 几何水果：带阴影的圆形 + 内部高光
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      // 内阴影
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      // 外框
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawBanana(ctx: CanvasRenderingContext2D): void {
    const r = FRUIT_R;
    const skin = this.getSkinTexture("fruit-bananas.png");
    if (skin) {
      const size = r * 2.2;
      this.drawTintedTexture(skin, -size / 2, -size / 2, size, size, "#fbbf24");
    } else {
      ctx.fillStyle = "#fbbf24";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r);
      ctx.quadraticCurveTo(r * 0.8, -r * 0.3, r * 0.4, r);
      ctx.quadraticCurveTo(-r * 0.2, r * 0.6, -r * 0.6, r * 0.2);
      ctx.quadraticCurveTo(-r * 0.9, -r * 0.4, -r * 0.3, -r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 香蕉纹理线
      ctx.strokeStyle = "rgba(120,90,20,0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.3, 0, -r * 0.1, r * 0.5);
      ctx.stroke();
    }
  }

  private drawDrop(ctx: CanvasRenderingContext2D, color: string): void {
    const r = DROP_R;
    const skin = this.getSkinTexture("fruit-drop.png");
    if (skin) {
      const size = r * 2.4;
      this.drawTintedTexture(skin, -size / 2, -size / 2, size, size, color);
    } else {
      // 水滴形状
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.bezierCurveTo(r * 0.9, -r * 0.4, r * 0.9, r * 0.7, 0, r);
      ctx.bezierCurveTo(-r * 0.9, r * 0.7, -r * 0.9, -r * 0.4, 0, -r * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 高光
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.15, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlate(time: number): void {
    const { ctx } = this.ctx;
    let px: number, py: number;
    if (this.isLandscape) { px = this.judgeAxis; py = this.platePos; }
    else { px = this.platePos; py = this.judgeAxis; }

    const half = PLATE_HALF;
    const hyper = this.hyperStart > 0 && time - this.hyperStart < 200;

    ctx.save();
    ctx.translate(px, py);

    // 皮肤 catcher 纹理（正常 / kiai）
    const catcherSkin = this.getSkinTexture(hyper ? "catcher-kiai.png" : "catcher-idle.png");
    if (catcherSkin) {
      const w = half * 2.4;
      const h = w * (catcherSkin.height / catcherSkin.width || 1);
      this.drawTintedTexture(catcherSkin, -w / 2, -h / 2, w, h, "#fff");
    } else {
      // 托盘主体
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.moveTo(-half, -6);
      ctx.quadraticCurveTo(-half * 0.5, 14, 0, 18);
      ctx.quadraticCurveTo(half * 0.5, 14, half, -6);
      ctx.lineTo(half, -14);
      ctx.lineTo(-half, -14);
      ctx.closePath();
      ctx.fill();

      // 托盘底部绿色发光条
      ctx.shadowColor = MODE_COLOR;
      ctx.shadowBlur = hyper ? 18 : 10;
      ctx.fillStyle = MODE_COLOR;
      ctx.beginPath();
      ctx.roundRect(-half + 4, -10, half * 2 - 8, 6, 3);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 托盘边缘
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-half, -6);
      ctx.quadraticCurveTo(-half * 0.5, 14, 0, 18);
      ctx.quadraticCurveTo(half * 0.5, 14, half, -6);
      ctx.stroke();

      // 中心小点
      drawCircle(this.ctx, 0, -8, 3, "rgba(0,0,0,0.25)");
    }

    ctx.restore();
  }

  protected handlePointerDown(x: number, y: number): void {
    if (this.status !== "playing") return;
    this.pointerDown = true;
    this.hyperStart = this.currentTime;
    const max = this.isLandscape ? this.ctx.height : this.ctx.width;
    this.targetPos = clamp(this.pointerToPlate(x, y), 0, max);
  }
  protected handlePointerMove = (x: number, y: number): void => {
    if (this.status !== "playing" || !this.pointerDown) return;
    const max = this.isLandscape ? this.ctx.height : this.ctx.width;
    this.targetPos = clamp(this.pointerToPlate(x, y), 0, max);
  };
  protected handlePointerUp = (): void => { this.pointerDown = false; };

  protected handleKeyDown(key: string): void {
    const k = key.toLowerCase();
    const [left, right] = this.keyBindings.catch;
    if (k === left) { this.leftHeld = true; this.hyperStart = this.currentTime; }
    else if (k === right) { this.rightHeld = true; this.hyperStart = this.currentTime; }
  }
  protected handleKeyUp = (key: string): void => {
    const k = key.toLowerCase();
    const [left, right] = this.keyBindings.catch;
    if (k === left) this.leftHeld = false;
    else if (k === right) this.rightHeld = false;
  };

  protected resetState(): void {
    super.resetState();
    this.pointerDown = false;
    this.leftHeld = false;
    this.rightHeld = false;
    this.lastTime = 0;
    this.lastFocusIndex = -1;
    this.hyperStart = 0;
    this.precomputeFruits();
  }

  /** 初始化光标/盘子位置到第一个水果，避免开场瞬移 */
  protected initCursorPosition(): void {
    const objs = this.beatmap.hitObjects;
    for (const obj of objs) {
      if (obj.type === "spinner") continue;
      const cross = this.fruitCross(obj);
      this.cursorX = this.isLandscape ? this.judgeAxis : cross;
      this.cursorY = this.isLandscape ? cross : this.judgeAxis;
      this.cursorTargetX = this.cursorX;
      this.cursorTargetY = this.cursorY;
      this.targetPos = cross;
      this.platePos = cross;
      return;
    }
  }
}
