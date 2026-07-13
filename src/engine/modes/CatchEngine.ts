/** osu!catch 引擎 - 顶部掉落 + 简约几何风格
 *  - 水果统一从屏幕上方垂直下落
 *  - osu! x 坐标 [0, 512] 线性映射到屏幕横向
 *  - 盘子只在底部左右移动，简约矩形
 *  - 普通水果为正多边形并持续旋转
 *  - 纯色几何水果，无描边/高光
 */
import type { HitObject, Judgement } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { clamp } from "../renderer/Canvas2D";

const APPROACH_TIME = 1500;
const FRUIT_R = 22;
const DROP_R = 13;
const PLATE_W = 100;
const PLATE_H = 14;
const MODE_COLOR = "#4ade80";

/** 水果颜色 */
const FRUIT_COLORS = ["#f472b6", "#fbbf24", "#4ade80", "#38bdf8", "#a78bfa", "#fb7185"];
const DROP_COLOR = "#38bdf8";

/** 普通水果皮肤纹理循环（osu! 约定四种水果） */
const FRUIT_SKINS = ["fruit-apple.png", "fruit-grapes.png", "fruit-orange.png", "fruit-pear.png"];

interface CachedFruit {
  type: "fruit" | "drop" | "banana";
  color: string;
  sides: number;
  rotationOffset: number;
  /** 皮肤纹理文件名（若存在） */
  skinName: string;
}

export class CatchEngine extends GameEngine {
  private judgeY = 0;
  private plateX = 0;
  private targetX = 0;
  private pointerDown = false;
  private leftHeld = false;
  private rightHeld = false;
  private lastTime = 0;
  private cached: CachedFruit[] = [];
  private lastFocusIndex = -1;

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
      const type = obj.type === "spinner" ? "banana" : obj.type === "slider" ? "drop" : "fruit";
      const colorIdx = (obj.newCombo ? i : i + Math.floor(obj.time / 200)) % FRUIT_COLORS.length;
      const color = type === "drop" ? DROP_COLOR : FRUIT_COLORS[colorIdx];
      const seed = i * 9301 + 49297;
      const rand = () => {
        let s = seed;
        s = (s * 16807) % 2147483647;
        return (s % 1000) / 1000;
      };
      this.cached[i] = {
        type,
        color,
        sides: type === "fruit" ? 3 + Math.floor(rand() * 3) : 0, // 3 ~ 5
        rotationOffset: rand() * Math.PI * 2,
        skinName: type === "fruit"
          ? FRUIT_SKINS[i % FRUIT_SKINS.length]
          : type === "banana"
            ? "fruit-bananas.png"
            : "fruit-drop.png",
      };
    }
  }

  private computeLayout(): void {
    this.judgeY = this.ctx.height - 90;
    this.plateX = this.ctx.width / 2;
    this.targetX = this.plateX;
  }

  /** 水果 y 位置：从屏幕上方下落到判定线 */
  private fruitY(obj: HitObject, time: number): number {
    const dt = obj.time - time;
    const startY = -FRUIT_R;
    return this.judgeY - (dt / APPROACH_TIME) * (this.judgeY - startY);
  }

  /** osu! x [0, 512] -> 屏幕 x，留边距 */
  private fruitX(obj: HitObject): number {
    const pad = FRUIT_R + 8;
    return pad + (obj.x / 512) * (this.ctx.width - pad * 2);
  }

  protected update(time: number): void {
    const dt = Math.max(0, time - this.lastTime);
    this.lastTime = time;

    this.advanceActiveIndex(time);

    if (this.auto) {
      this.autoPlay(time, dt);
    } else if (this.leftHeld || this.rightHeld) {
      const dir = (this.rightHeld ? 1 : 0) - (this.leftHeld ? 1 : 0);
      const speed = 2.5;
      this.targetX = clamp(this.plateX + dir * speed * dt, PLATE_W / 2, this.ctx.width - PLATE_W / 2);
      this.plateX += (this.targetX - this.plateX) * 0.6;
    } else {
      this.plateX += (this.targetX - this.plateX) * 0.6;
    }

    // 判定：遍历所有已到达判定线且未判定的水果
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    const halfPlate = PLATE_W / 2;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      const objDt = obj.time - time;
      // 超过判定窗口下方还没接住 → miss
      if (objDt < -this.windows["50"]) {
        obj.judged = true;
        obj.judgement = "miss";
        this.submitJudgement("miss");
        this.spawnHitEffect(this.fruitX(obj), this.judgeY, "miss", time);
        continue;
      }
      // 还没到判定线
      if (objDt > 0) break;

      const x = this.fruitX(obj);
      const caught = x >= this.plateX - halfPlate - FRUIT_R * 0.3 && x <= this.plateX + halfPlate + FRUIT_R * 0.3;
      if (caught) {
        const j = this.judgeHit(obj, time, x, this.judgeY);
        this.spawnHitEffect(x, this.judgeY, j, time);
      }
    }

    this.pruneHitEffects(time);
  }

  private autoPlay(time: number, dt: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;

    // 找到下一个需要接的未判定水果
    let next: HitObject | null = null;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      next = obj;
      break;
    }
    if (!next) return;

    const targetX = this.fruitX(next);
    const timeUntilJudge = Math.max(0, next.time - time);

    if (timeUntilJudge <= 0) {
      // 已到判定线，直接对准
      this.plateX = clamp(targetX, PLATE_W / 2, this.ctx.width - PLATE_W / 2);
      this.targetX = this.plateX;
    } else {
      // 计算所需速度，确保在水果到达前到位
      const distance = Math.abs(targetX - this.plateX);
      const requiredSpeed = distance / (timeUntilJudge / 1000);
      // 实际速度取所需速度和最大速度的较大值，确保不 miss
      const maxSpeed = this.ctx.width * 3;
      const speed = Math.min(Math.max(requiredSpeed * 1.2, 200), maxSpeed);
      const maxDelta = speed * (dt / 1000);
      const diff = targetX - this.plateX;
      const move = clamp(diff, -maxDelta, maxDelta);
      this.plateX = clamp(this.plateX + move, PLATE_W / 2, this.ctx.width - PLATE_W / 2);
      this.targetX = this.plateX;
    }

    this.cursorTargetX = this.plateX;
    this.cursorTargetY = this.judgeY;
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
      const y = this.fruitY(obj, time);
      if (y > this.ctx.height + FRUIT_R) continue;
      const x = this.fruitX(obj);
      this.drawFruit(x, y, i, time);
    }

    this.drawPlate();
    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!catch", modeColor: MODE_COLOR });
  }

  private drawTrack(): void {
    const { width, height, ctx } = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.judgeY);
    ctx.lineTo(width, this.judgeY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    const pad = FRUIT_R + 8;
    ctx.beginPath();
    ctx.moveTo(pad, 0);
    ctx.lineTo(pad, height);
    ctx.moveTo(width - pad, 0);
    ctx.lineTo(width - pad, height);
    ctx.stroke();
    ctx.restore();
  }

  private drawFruit(x: number, y: number, idx: number, time: number): void {
    const c = this.cached[idx];
    const { ctx } = this.ctx;
    // 优先使用皮肤纹理（自定义皮肤 > 谱面皮肤）
    const tex = this.getSkinTexture(c.skinName);
    if (tex) {
      const r = c.type === "drop" ? DROP_R : FRUIT_R;
      const size = r * 2;
      ctx.save();
      // 普通水果轻微旋转以保持视觉活力
      if (c.type === "fruit") {
        ctx.translate(x, y);
        ctx.rotate(c.rotationOffset + time / 800);
        ctx.drawImage(tex, -size / 2, -size / 2, size, size);
      } else {
        ctx.drawImage(tex, x - size / 2, y - size / 2, size, size);
      }
      ctx.restore();
      return;
    }
    // 无皮肤：Canvas 原语回退
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = c.color;

    if (c.type === "banana") {
      this.drawBanana(ctx);
    } else if (c.type === "drop") {
      this.drawDrop(ctx);
    } else {
      this.drawRegularFruit(ctx, c.sides, c.rotationOffset, time);
    }

    ctx.restore();
  }

  private drawRegularFruit(ctx: CanvasRenderingContext2D, sides: number, rotationOffset: number, time: number): void {
    const r = FRUIT_R;
    const rotation = rotationOffset + time / 800;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = rotation + (i / sides) * Math.PI * 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawBanana(ctx: CanvasRenderingContext2D): void {
    const r = FRUIT_R;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.6, r * 1.1, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDrop(ctx: CanvasRenderingContext2D): void {
    const r = DROP_R;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.bezierCurveTo(r, -r * 0.4, r, r * 0.8, 0, r);
    ctx.bezierCurveTo(-r, r * 0.8, -r, -r * 0.4, 0, -r * 1.3);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlate(): void {
    const { ctx } = this.ctx;
    const x = this.plateX;
    const y = this.judgeY;

    // 优先使用 fruit-ryuta.png 皮肤纹理（接物盘）
    const plateTex = this.getSkinTexture("fruit-ryuta.png");
    if (plateTex) {
      const w = PLATE_W;
      const h = PLATE_W * (plateTex.height / plateTex.width);
      ctx.drawImage(plateTex, x - w / 2, y - h / 2, w, h);
      return;
    }
    // 无皮肤：简约圆角矩形
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.roundRect(-PLATE_W / 2, -PLATE_H / 2, PLATE_W, PLATE_H, PLATE_H / 2);
    ctx.fill();
    ctx.restore();
  }

  /** catch 接住即最高判定 */
  protected judgeHit(obj: HitObject, time: number, x = 0, y = 0): Judgement {
    const alreadyJudged = obj.judged;
    obj.judged = true;
    obj.judgement = "300";
    if (!alreadyJudged) {
      this.submitJudgement("300");
      this.spawnJudgePopup("300", x, y, time);
    }
    this.playHitSound(obj);
    return "300";
  }

  protected handlePointerDown(x: number, _y: number): void {
    if (this.status !== "playing") return;
    this.pointerDown = true;
    this.targetX = clamp(x, PLATE_W / 2, this.ctx.width - PLATE_W / 2);
  }
  protected handlePointerMove(x: number, _y: number): void {
    if (this.status !== "playing" || !this.pointerDown) return;
    this.targetX = clamp(x, PLATE_W / 2, this.ctx.width - PLATE_W / 2);
  }
  protected handlePointerUp(_x: number, _y: number): void { this.pointerDown = false; }

  protected handleKeyDown(key: string): void {
    const k = key.toLowerCase();
    const [left, right] = this.keyBindings.catch;
    if (k === left) this.leftHeld = true;
    else if (k === right) this.rightHeld = true;
  }
  protected handleKeyUp(key: string): void {
    const k = key.toLowerCase();
    const [left, right] = this.keyBindings.catch;
    if (k === left) this.leftHeld = false;
    else if (k === right) this.rightHeld = false;
  }

  protected resetState(): void {
    super.resetState();
    this.pointerDown = false;
    this.leftHeld = false;
    this.rightHeld = false;
    this.lastTime = 0;
    this.lastFocusIndex = -1;
    this.precomputeFruits();
    this.computeLayout();
  }
}
