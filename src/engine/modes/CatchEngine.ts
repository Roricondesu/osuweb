/** osu!catch 引擎 - 顶部掉落 + 简约几何风格
 *  - 水果统一从屏幕上方垂直下落
 *  - osu! x 坐标 [0, 512] 线性映射到屏幕横向
 *  - 盘子只在底部左右移动，简约矩形
 *  - 普通水果为正多边形并持续旋转
 *  - 纯色几何水果，无描边/高光
 */
import type { HitObject, Judgement } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { applyBonus } from "../Judger";
import { clamp } from "../renderer/Canvas2D";

const APPROACH_TIME = 1500;
const FRUIT_R = 22;
const DROP_R = 13;
const PLATE_W = 100;
const PLATE_H = 14;
const MODE_COLOR = "#4ade80";

/** 香蕉（spinner 的对应物）：官方为可选奖励物件，接住 +1100 分，
 *  不影响连击、不计入准确率，漏接没有任何惩罚。 */
const BANANA_SCORE = 1100;
/** 香蕉雨生成间隔：一个 spinner 区间内约每 150ms 落下一颗 */
const BANANA_INTERVAL = 150;
const BANANA_COLOR = "#fde047";

/** 水果颜色 */
const FRUIT_COLORS = ["#f472b6", "#fbbf24", "#4ade80", "#38bdf8", "#a78bfa", "#fb7185"];
const DROP_COLOR = "#38bdf8";

/** 普通水果皮肤纹理循环（osu! 约定四种水果） */
const FRUIT_SKINS = ["fruit-apple.png", "fruit-grapes.png", "fruit-orange.png", "fruit-pear.png"];

interface CachedFruit {
  /** banana 表示该物件是 spinner——本体不判定，命中交由香蕉雨处理 */
  type: "fruit" | "drop" | "banana";
  color: string;
  sides: number;
  rotationOffset: number;
  /** 皮肤纹理文件名（若存在） */
  skinName: string;
}

/** 香蕉雨中的一颗香蕉。nx 为归一化横向位置（0-1），窗口尺寸变化时无需重算 */
interface Banana {
  time: number;
  nx: number;
  judged: boolean;
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
  /** 香蕉雨（按时间升序） */
  private bananas: Banana[] = [];
  /** 香蕉雨遍历游标：跳过已处理完的前缀，避免每帧全量扫描 */
  private bananaCursor = 0;

  constructor(opts: EngineOptions) {
    super(opts);
    this.precomputeFruits();
    this.buildBananas();
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

  /** 预生成香蕉雨：osu!catch 中每个 spinner 对应一串横向随机散落的香蕉。
   *  横向位置用确定性伪随机，保证同一谱面每次进入的分布一致（回放可复现）。 */
  private buildBananas(): void {
    this.bananas = [];
    this.bananaCursor = 0;
    let seed = 20240918;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (const obj of this.beatmap.hitObjects) {
      if (obj.type !== "spinner") continue;
      const end = obj.endTime ?? obj.time;
      const dur = Math.max(0, end - obj.time);
      const count = Math.max(1, Math.floor(dur / BANANA_INTERVAL));
      for (let k = 1; k <= count; k++) {
        // 均匀铺满 spinner 区间；区间退化时落在起始时刻
        const t = dur > 0 ? obj.time + (dur * k) / (count + 1) : obj.time;
        this.bananas.push({ time: t, nx: 0.1 + rand() * 0.8, judged: false });
      }
    }
  }

  private computeLayout(): void {
    this.judgeY = this.ctx.height - 90;
    this.plateX = this.ctx.width / 2;
    this.targetX = this.plateX;
  }

  /** 水果 y 位置：从屏幕上方下落到判定线 */
  private fruitY(obj: HitObject, time: number): number {
    return this.fruitYAt(obj.time, time);
  }

  /** 按物件时间求 y 位置（香蕉没有 HitObject，直接传时间） */
  private fruitYAt(objTime: number, time: number): number {
    const dt = objTime - time;
    const startY = -FRUIT_R;
    return this.judgeY - (dt / APPROACH_TIME) * (this.judgeY - startY);
  }

  /** osu! x [0, 512] -> 屏幕 x，留边距 */
  private fruitX(obj: HitObject): number {
    const pad = FRUIT_R + 8;
    return pad + (obj.x / 512) * (this.ctx.width - pad * 2);
  }

  /** 香蕉的屏幕 x（归一化位置 → 轨道内） */
  private bananaX(b: Banana): number {
    const pad = FRUIT_R + 8;
    return pad + b.nx * (this.ctx.width - pad * 2);
  }

  /** 判定板当前是否覆盖某个横向位置 */
  private plateCovers(x: number): boolean {
    const reach = PLATE_W / 2 + FRUIT_R * 0.3;
    return x >= this.plateX - reach && x <= this.plateX + reach;
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
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      // spinner 本体不参与判定：命中由下方的香蕉雨独立处理。
      // 标记为完成即可，否则会被当成普通水果漏接而误判 miss。
      if (this.cached[i].type === "banana") {
        obj.judged = true;
        continue;
      }
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
      if (this.plateCovers(x)) {
        const j = this.judgeHit(obj, time, x, this.judgeY);
        this.spawnHitEffect(x, this.judgeY, j, time);
      }
    }

    // 香蕉雨：接住加分，漏接静默消失（不计连击、不计准确率、不扣血）
    this.updateBananas(time);

    this.pruneHitEffects(time);
  }

  /** 香蕉雨判定。香蕉是可选奖励物件，漏接没有任何惩罚——
   *  原实现把 spinner 当普通水果处理，漏接会判 miss 断连击扣血，与官方不符。 */
  private updateBananas(time: number): void {
    // 游标只跳过「已处理完」的前缀；未判定的香蕉需要持续检查到过期为止
    while (this.bananaCursor < this.bananas.length && this.bananas[this.bananaCursor].judged) {
      this.bananaCursor++;
    }
    for (let i = this.bananaCursor; i < this.bananas.length; i++) {
      const b = this.bananas[i];
      const dtB = b.time - time;
      if (dtB > 0) break; // 按时间升序，后面的都还没到判定线
      if (b.judged) continue;
      if (dtB < -this.windows["50"]) {
        b.judged = true; // 漏接：静默消失，不判 miss
        continue;
      }
      const bx = this.bananaX(b);
      if (this.plateCovers(bx)) {
        b.judged = true;
        this.score = applyBonus(this.score, BANANA_SCORE, false);
        this.spawnHitEffect(bx, this.judgeY, "300", time);
      }
    }
  }

  private autoPlay(time: number, dt: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;

    // 候选目标：下一个未判定的水果（spinner 已被标记完成，会自动跳过）
    let nextObj: HitObject | null = null;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      nextObj = obj;
      break;
    }
    // 候选目标：下一颗还没落下的香蕉（漏接不扣分，但 auto 应当拿满）
    let nextBanana: Banana | null = null;
    for (let i = this.bananaCursor; i < this.bananas.length; i++) {
      const b = this.bananas[i];
      if (b.judged) continue;
      if (b.time - time > APPROACH_TIME) break;
      nextBanana = b;
      break;
    }
    if (!nextObj && !nextBanana) return;

    // 取时间最早者作为移动目标
    let targetX: number;
    let targetTime: number;
    if (nextObj && (!nextBanana || nextObj.time <= nextBanana.time)) {
      targetX = this.fruitX(nextObj);
      targetTime = nextObj.time;
    } else {
      targetX = this.bananaX(nextBanana as Banana);
      targetTime = (nextBanana as Banana).time;
    }

    const timeUntilJudge = Math.max(0, targetTime - time);

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
      // spinner 本体不渲染，其视觉表现是下方单独绘制的香蕉雨
      if (this.cached[i].type === "banana") continue;
      if (obj.judged && obj.judgement !== "miss") continue;
      const dt = obj.time - time;
      if (dt > APPROACH_TIME) continue;
      const y = this.fruitY(obj, time);
      if (y > this.ctx.height + FRUIT_R) continue;
      const x = this.fruitX(obj);
      this.drawFruit(x, y, i, time);
    }

    this.drawBananas(time);
    this.drawPlate();
    // 统一走基类前景层：命中特效 + 判定弹字 + BREAK 休息段 + Flashlight 遮罩。
    // 原先这里只手动调了前两项，导致 Flashlight 在 catch 下完全没有视觉表现。
    this.renderForeground(time);
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
    // Hidden Mod：水果接近判定板时逐渐淡出，靠记忆移动盘子（官方 catch 的 Hidden 行为）
    let hiddenAlpha = 1;
    if (this.modHidden) {
      const fadeStart = this.ctx.height * 0.18;
      hiddenAlpha = clamp((this.judgeY - y) / fadeStart, 0, 1);
    }
    if (hiddenAlpha <= 0.01) return;
    // 优先使用皮肤纹理（自定义皮肤 > 谱面皮肤）
    const tex = this.getSkinTexture(c.skinName);
    if (tex) {
      const r = c.type === "drop" ? DROP_R : FRUIT_R;
      const size = r * 2;
      ctx.save();
      if (hiddenAlpha < 1) ctx.globalAlpha = hiddenAlpha;
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
    if (hiddenAlpha < 1) ctx.globalAlpha = hiddenAlpha;
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

  /** 绘制香蕉雨：与普通水果一样从上方落下，横向位置分散 */
  private drawBananas(time: number): void {
    const { ctx } = this.ctx;
    for (let i = this.bananaCursor; i < this.bananas.length; i++) {
      const b = this.bananas[i];
      if (b.judged) continue;
      const dt = b.time - time;
      if (dt > APPROACH_TIME) break;
      const y = this.fruitYAt(b.time, time);
      if (y > this.ctx.height + FRUIT_R) continue;
      const x = this.bananaX(b);

      // Hidden Mod：接近判定板时淡出（与普通水果一致）
      let alpha = 1;
      if (this.modHidden) {
        const fadeStart = this.ctx.height * 0.18;
        alpha = clamp((this.judgeY - y) / fadeStart, 0, 1);
      }
      if (alpha <= 0.01) continue;

      const tex = this.getSkinTexture("fruit-bananas.png");
      ctx.save();
      if (alpha < 1) ctx.globalAlpha = alpha;
      if (tex) {
        ctx.drawImage(tex, x - FRUIT_R, y - FRUIT_R, FRUIT_R * 2, FRUIT_R * 2);
      } else {
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time / 400) * 0.35);
        ctx.fillStyle = BANANA_COLOR;
        this.drawBanana(ctx);
      }
      ctx.restore();
    }
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
    this.buildBananas();
    this.computeLayout();
  }
}
