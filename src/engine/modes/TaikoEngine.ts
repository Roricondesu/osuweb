/** osu!taiko 引擎 - 扁平现代视觉
 *  - 红（Don）蓝（Katsu）纯色圆
 *  - 横屏：音符水平飞入判定圈
 *  - 竖屏：音符垂直下落判定圈
 *  - 性能：活动物件指针
 */
import type { HitObject, ParsedBeatmap } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawCircle, drawRect, drawRing, drawText, clamp, GAME_FONT } from "../renderer/Canvas2D";

const NOTE_R = 36;
const APPROACH_TIME = 1500;

const COLOR_RED = "#ff5e5e";
const COLOR_BLUE = "#4da6ff";
const COLOR_GOLD = "#ffd03d";
const MODE_COLOR = "#ff9100";

export class TaikoEngine extends GameEngine {
  private judgePos = 0;
  private crossPos = 0;
  private isHorizontalFlow = true;

  constructor(opts: EngineOptions) {
    super(opts);
    this.computeLayout();
  }

  protected resetState(): void {
    super.resetState();
    this.computeLayout();
  }

  protected onLayoutChange(): void { this.computeLayout(); }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    this.isHorizontalFlow = this.isLandscape;
    if (this.isHorizontalFlow) {
      this.judgePos = width * 0.2;
      this.crossPos = height / 2;
    } else {
      this.judgePos = height * 0.78;
      this.crossPos = width / 2;
    }
  }

  private isBlue(obj: HitObject): boolean {
    const hs = obj.hitSound || 0;
    if (hs & 2) return true;
    if (hs & 4) return true;
    return !!obj.newCombo;
  }

  private isBig(obj: HitObject): boolean {
    return ((obj.hitSound || 0) & 2) !== 0;
  }

  private noteFlow(obj: HitObject, time: number): number {
    const dt = obj.time - time;
    if (this.isHorizontalFlow) {
      const startX = this.ctx.width + NOTE_R;
      return this.judgePos + (dt / APPROACH_TIME) * (startX - this.judgePos);
    } else {
      const startY = -NOTE_R;
      return this.judgePos - (dt / APPROACH_TIME) * (this.judgePos - startY);
    }
  }

  protected update(time: number): void {
    this.advanceActiveIndex(time);
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    const win50 = this.windows["50"];
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      if (time - obj.time > win50) {
        obj.judged = true;
        obj.judgement = "miss";
        this.submitJudgement("miss");
      } else {
        break;
      }
    }
    if (this.auto) this.autoPlay(time);
    this.pruneHitEffects(time);
  }

  private autoPlay(time: number): void {
    const win300 = this.windows["300"];
    const best = this.findHitTarget(
      time,
      () => true,
      (obj) => Math.abs(time - obj.time),
    );
    if (best && Math.abs(time - best.time) <= win300) {
      const blue = this.isBlue(best);
      this.tryHit(blue);
      // 大音符需要同色的双键同时击打才能出 300
      if (this.isBig(best)) {
        this.tryHit(blue);
      }
    }
    const x = this.isHorizontalFlow ? this.judgePos : this.crossPos;
    const y = this.isHorizontalFlow ? this.crossPos : this.judgePos;
    this.cursorTargetX = x;
    this.cursorTargetY = y;
  }

  protected render(): void {
    const time = this.currentTime;
    this.renderBackground(time);
    this.drawTrack();

    const objs = this.beatmap.hitObjects;
    for (let i = objs.length - 1; i >= this.activeIndex; i--) {
      const obj = objs[i];
      if (obj.judged && obj.judgement !== "miss") continue;
      const dt = obj.time - time;
      if (dt > APPROACH_TIME) continue;
      if (dt < -350 && obj.judged) continue;
      const pos = this.noteFlow(obj, time);
      const x = this.isHorizontalFlow ? pos : this.crossPos;
      const y = this.isHorizontalFlow ? this.crossPos : pos;
      this.drawNote(x, y, obj, time);
    }

    this.drawJudgeCircle();
    this.drawTapZones();
    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!taiko", modeColor: MODE_COLOR });
  }

  /** 毛玻璃 Tap 区域 */
  private drawTapZones(): void {
    const { ctx, width, height } = this.ctx;
    const drawGlass = (x: number, y: number, w: number, h: number, label: string, color: string) => {
      // 半透明面板
      drawRect(this.ctx, x, y, w, h, "rgba(255,255,255,0.08)", 18);
      // 边框
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
      // 顶部高光
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, w - 8, h * 0.35, [12, 12, 8, 8]);
      ctx.fill();
      // 标签
      drawText(this.ctx, label, x + w / 2, y + h / 2, {
        font: `900 14px ${GAME_FONT}`,
        fillStyle: color,
      });
    };

    const margin = 12;
    if (this.isHorizontalFlow) {
      const w = width / 2 - margin * 1.5;
      const h = NOTE_R * 2 + 36;
      const y = this.crossPos - h / 2;
      drawGlass(margin, y, w, h, "DON", COLOR_RED);
      drawGlass(width / 2 + margin / 2, y, w, h, "KATSU", COLOR_BLUE);
    } else {
      const h = height / 2 - margin * 1.5;
      const w = NOTE_R * 2 + 36;
      const x = this.crossPos - w / 2;
      drawGlass(x, margin, w, h, "DON", COLOR_RED);
      drawGlass(x, height / 2 + margin / 2, w, h, "KATSU", COLOR_BLUE);
    }
  }

  private drawTrack(): void {
    const { width, height } = this.ctx;
    if (this.isHorizontalFlow) {
      drawRect(this.ctx, 0, this.crossPos - NOTE_R - 10, width, (NOTE_R + 10) * 2, "rgba(255,255,255,0.04)", 0);
      this.ctx.ctx.strokeStyle = "rgba(255,255,255,0.1)";
      this.ctx.ctx.lineWidth = 1;
      this.ctx.ctx.strokeRect(0, this.crossPos - NOTE_R - 10, width, (NOTE_R + 10) * 2);
    } else {
      drawRect(this.ctx, this.crossPos - NOTE_R - 10, 0, (NOTE_R + 10) * 2, height, "rgba(255,255,255,0.04)", 0);
      this.ctx.ctx.strokeStyle = "rgba(255,255,255,0.1)";
      this.ctx.ctx.lineWidth = 1;
      this.ctx.ctx.strokeRect(this.crossPos - NOTE_R - 10, 0, (NOTE_R + 10) * 2, height);
    }
  }

  private drawJudgeCircle(): void {
    const x = this.isHorizontalFlow ? this.judgePos : this.crossPos;
    const y = this.isHorizontalFlow ? this.crossPos : this.judgePos;
    const { ctx } = this.ctx;
    const r = NOTE_R + 14;

    // 鼓身木 rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#5c3a21";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#8b5a33";
    ctx.stroke();

    // 鼓面底色
    ctx.beginPath();
    ctx.arc(x, y, r - 6, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e6d3";
    ctx.fill();

    // 鼓面左右（或上下）分红蓝两区
    if (this.isHorizontalFlow) {
      ctx.beginPath();
      ctx.arc(x, y, r - 6, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = "rgba(255,94,94,0.22)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r - 6, Math.PI / 2, -Math.PI / 2);
      ctx.fillStyle = "rgba(77,166,255,0.22)";
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r - 6, 0, Math.PI);
      ctx.fillStyle = "rgba(255,94,94,0.22)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r - 6, Math.PI, 0);
      ctx.fillStyle = "rgba(77,166,255,0.22)";
      ctx.fill();
    }

    // 中心环
    ctx.beginPath();
    ctx.arc(x, y, NOTE_R * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private drawNote(x: number, y: number, obj: HitObject, time: number): void {
    const blue = this.isBlue(obj);
    const big = this.isBig(obj);
    const r = big ? NOTE_R * 1.32 : NOTE_R;
    const color = blue ? COLOR_BLUE : COLOR_RED;
    const dt = obj.time - time;
    const alpha = clamp(1 - dt / APPROACH_TIME, 0.55, 1);
    const { ctx } = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (blue) {
      // Katsu：蓝环（打击鼓边）
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    } else {
      // Don：实心红圆（打击鼓面）
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
    }
    // 大音符金边
    if (big) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = COLOR_GOLD;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }

  private tryHit(blue: boolean): void {
    if (this.status !== "playing") return;
    const time = this.currentTime;
    const best = this.findHitTarget(
      time,
      (obj) => this.isBlue(obj) === blue,
      (obj) => Math.abs(time - obj.time),
    );
    if (best) {
      const j = this.judgeHit(best, time);
      const x = this.isHorizontalFlow ? this.judgePos : this.crossPos;
      const y = this.isHorizontalFlow ? this.crossPos : this.judgePos;
      this.spawnHitEffect(x, y, j, time);
    }
  }

  public onPointerDown(x: number, y: number): void {
    if (this.status !== "playing") return;
    if (this.isHorizontalFlow) this.tryHit(x > this.ctx.width / 2);
    else this.tryHit(y > this.ctx.height / 2);
  }

  public onPointerMove = (): void => {};
  public onPointerUp = (): void => {};

  public onKeyDown(key: string): void {
    const k = key.toLowerCase();
    if (k === "d" || k === "f") this.tryHit(false);
    else if (k === "k" || k === "j") this.tryHit(true);
  }
  public onKeyUp = (): void => {};
}
