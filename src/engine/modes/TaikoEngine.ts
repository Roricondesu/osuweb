/** osu!taiko 引擎 - 重构后的扁平现代视觉
 *  - 音符始终水平从右向左飞入判定圈
 *  - 横屏：轨道居中；竖屏：轨道靠上
 *  - 打击点改为空心圆环，不遮挡后方音符
 *  - 底部绘制虚拟太鼓作为操作区
 *  - 支持 Don（红/鼓面）与 Katsu（蓝/鼓边）
 */
import type { HitObject } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawRect, drawText, drawRing, clamp, GAME_FONT } from "../renderer/Canvas2D";

const NOTE_R = 36;
const APPROACH_TIME = 1500;

const COLOR_RED = "#ff5e5e";
const COLOR_BLUE = "#4da6ff";
const COLOR_GOLD = "#ffd03d";
const MODE_COLOR = "#ff9100";

export class TaikoEngine extends GameEngine {
  private judgePos = 0;
  private crossPos = 0;

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
    // 无论横竖屏，音符始终水平从右向左流动
    this.judgePos = width * 0.18;
    this.crossPos = this.isLandscape ? height / 2 : height * 0.28;
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
    const startX = this.ctx.width + NOTE_R;
    return this.judgePos + (dt / APPROACH_TIME) * (startX - this.judgePos);
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
      const j = this.judgeHit(best, time, this.judgePos, this.crossPos);
      this.spawnHitEffect(this.judgePos, this.crossPos, j, time);
      if (this.isBig(best)) {
        // 大音符需要左右键同时按下：再次命中同一物件（只播放第二声音效/效果，不重复计分）
        this.judgeHit(best, time, this.judgePos, this.crossPos);
        this.spawnHitEffect(this.judgePos, this.crossPos, j, time);
      }
      this.pressCursor(time);
    }
    this.cursorTargetX = this.judgePos;
    this.cursorTargetY = this.crossPos;
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
      const x = this.noteFlow(obj, time);
      const y = this.crossPos;
      this.drawNote(x, y, obj, time);
    }

    this.drawJudgeCircle();
    this.drawVirtualDrum();
    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!taiko", modeColor: MODE_COLOR });
  }

  private drawTrack(): void {
    const { width } = this.ctx;
    const trackY = this.crossPos - NOTE_R - 10;
    const trackH = (NOTE_R + 10) * 2;
    drawRect(this.ctx, 0, trackY, width, trackH, "rgba(255,255,255,0.04)", 0);
    this.ctx.ctx.strokeStyle = "rgba(255,255,255,0.1)";
    this.ctx.ctx.lineWidth = 1;
    this.ctx.ctx.strokeRect(0, trackY, width, trackH);
  }

  /** 判定圈：空心圆环，可看到后方飞来的音符 */
  private drawJudgeCircle(): void {
    const { ctx } = this.ctx;
    const x = this.judgePos;
    const y = this.crossPos;
    const r = NOTE_R + 14;

    ctx.save();
    // 外环
    drawRing(this.ctx, x, y, r, "rgba(255,255,255,0.55)", 3);
    // 内部红蓝分区（细线）
    ctx.beginPath();
    ctx.arc(x, y, r - 4, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = "rgba(255,94,94,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r - 4, Math.PI / 2, -Math.PI / 2);
    ctx.strokeStyle = "rgba(77,166,255,0.5)";
    ctx.stroke();
    // 中心小点
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
    ctx.restore();
  }

  /** 底部虚拟太鼓 */
  private drawVirtualDrum(): void {
    const { ctx, width, height } = this.ctx;
    const cx = width / 2;
    const cy = this.isLandscape ? height - 90 : height - 120;
    const r = this.isLandscape ? 62 : 56;

    ctx.save();
    // 鼓身阴影
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 3, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();

    // 鼓身 rim
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#5c3a21";
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#8b5a33";
    ctx.stroke();

    // 鼓面
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
    ctx.fillStyle = "#f5e6d3";
    ctx.fill();

    // 左红（Don）右蓝（Katsu）分区
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, Math.PI / 2, -Math.PI / 2);
    ctx.fillStyle = "rgba(255,94,94,0.22)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = "rgba(77,166,255,0.22)";
    ctx.fill();

    // 中心环
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 标签
    drawText(this.ctx, "DON", cx - r * 0.55, cy, {
      font: `900 12px ${GAME_FONT}`,
      fillStyle: COLOR_RED,
    });
    drawText(this.ctx, "KAT", cx + r * 0.55, cy, {
      font: `900 12px ${GAME_FONT}`,
      fillStyle: COLOR_BLUE,
    });

    ctx.restore();
  }

  /** 音符：带轻微毛玻璃实心的圆环 */
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

    // 毛玻璃实心填充（轻微半透明径向渐变）
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r - 2);
    grad.addColorStop(0, "rgba(255,255,255,0.22)");
    grad.addColorStop(1, blue ? "rgba(77,166,255,0.12)" : "rgba(255,94,94,0.12)");
    ctx.fillStyle = grad;
    ctx.fill();

    // 外圈
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = big ? 5 : 4;
    ctx.stroke();

    // 内圈装饰
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.6;
    ctx.stroke();

    // 中心小圆点
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // 大音符金边
    if (big) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
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
      this.spawnHitEffect(this.judgePos, this.crossPos, j, time);
    }
  }

  public onPointerDown(x: number, _y: number): void {
    if (this.status !== "playing") return;
    // 屏幕左半边 / 虚拟鼓左半边 = Don，右半边 = Katsu
    this.tryHit(x > this.ctx.width / 2);
    // 按下反馈位置
    this.pressCursor(this.currentTime);
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
