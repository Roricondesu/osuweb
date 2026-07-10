/** osu!taiko 引擎 - 重构后的扁平现代视觉
 *  - 音符始终水平从右向左飞入判定圈
 *  - 横屏：轨道居中；竖屏：轨道靠上
 *  - 打击点改为空心圆环，不遮挡后方音符
 *  - 底部绘制虚拟太鼓作为操作区
 *  - 支持 Don（红/鼓面）与 Katsu（蓝/鼓边）
 */
import type { HitObject } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawRect, drawText, drawRing, clamp } from "../renderer/Canvas2D";

const NOTE_R = 36;
const APPROACH_TIME = 1500;

const COLOR_RED = "#ff5e5e";
const COLOR_BLUE = "#4da6ff";
const COLOR_GOLD = "#ffd03d";
const MODE_COLOR = "#ff9100";

export class TaikoEngine extends GameEngine {
  private judgePos = 0;
  private crossPos = 0;
  // 同一侧连续输入的最小间隔，防止一次物理按键被事件系统触发多次
  private readonly HIT_COOLDOWN = 40;
  private lastHitTime: [number, number] = [-Infinity, -Infinity];

  constructor(opts: EngineOptions) {
    super(opts);
    this.computeLayout();
  }

  protected resetState(): void {
    super.resetState();
    this.computeLayout();
    this.lastHitTime = [-Infinity, -Infinity];
  }

  protected onLayoutChange(): void { this.computeLayout(); }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    // 无论横竖屏，音符始终水平从右向左流动
    this.judgePos = width * 0.18;
    this.crossPos = this.isLandscape ? height / 2 : height * 0.28;
  }

  // osu!taiko 音色规则：whistle(1)/clap(4)=katsu（蓝），normal/finish=don（红）
  // finish(2) 表示大音符，需要同时或单下命中
  private isBlue(obj: HitObject): boolean {
    const hs = obj.hitSound || 0;
    return (hs & 1) !== 0 || (hs & 4) !== 0;
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
    const { ctx, width } = this.ctx;
    const trackY = this.crossPos - NOTE_R - 10;
    const trackH = (NOTE_R + 10) * 2;
    // taiko-gata 作为轨道背景（若皮肤提供）
    const gata = this.getSkinTexture("taiko-gata.png");
    if (gata) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      // 平铺拉伸覆盖整条轨道
      ctx.drawImage(gata, 0, trackY, width, trackH);
      ctx.restore();
    } else {
      drawRect(this.ctx, 0, trackY, width, trackH, "rgba(255,255,255,0.04)", 0);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, trackY, width, trackH);
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

  /** 底部虚拟太鼓 - 毛玻璃风格；若皮肤提供 taiko-drum-outer/inner 则使用皮肤纹理 */
  private drawVirtualDrum(): void {
    const { ctx, width, height } = this.ctx;
    const cx = width / 2;
    const cy = this.isLandscape ? height - 90 : height - 120;
    const r = this.isLandscape ? 62 : 56;

    ctx.save();
    // 鼓身阴影
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 4, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fill();

    // 皮肤纹理：taiko-drum-outer（左红 Don 半）+ taiko-drum-inner（右蓝 Katsu 半）
    const drumOuter = this.getSkinTexture("taiko-drum-outer.png");
    const drumInner = this.getSkinTexture("taiko-drum-inner.png");
    if (drumOuter || drumInner) {
      const size = r * 2;
      // 裁剪为圆形再绘制两半
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      if (drumOuter) ctx.drawImage(drumOuter, cx - r, cy - r, size, size);
      if (drumInner) ctx.drawImage(drumInner, cx - r, cy - r, size, size);
      ctx.restore();
    } else {
      // 鼓身外圈（毛玻璃边框）
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();

      // 鼓身毛玻璃底色
      ctx.beginPath();
      ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
      const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r - 2);
      baseGrad.addColorStop(0, "rgba(255,255,255,0.18)");
      baseGrad.addColorStop(1, "rgba(255,255,255,0.06)");
      ctx.fillStyle = baseGrad;
      ctx.fill();

      // 左红（Don）右蓝（Katsu）分区 - 毛玻璃色块
      ctx.beginPath();
      ctx.arc(cx, cy, r - 7, Math.PI / 2, -Math.PI / 2);
      const redGrad = ctx.createRadialGradient(cx - r * 0.3, cy, 0, cx - r * 0.3, cy, r * 0.6);
      redGrad.addColorStop(0, "rgba(255,94,94,0.32)");
      redGrad.addColorStop(1, "rgba(255,94,94,0.10)");
      ctx.fillStyle = redGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r - 7, -Math.PI / 2, Math.PI / 2);
      const blueGrad = ctx.createRadialGradient(cx + r * 0.3, cy, 0, cx + r * 0.3, cy, r * 0.6);
      blueGrad.addColorStop(0, "rgba(77,166,255,0.32)");
      blueGrad.addColorStop(1, "rgba(77,166,255,0.10)");
      ctx.fillStyle = blueGrad;
      ctx.fill();

      // 中心环
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 标签
    drawText(this.ctx, "DON", cx - r * 0.55, cy, {
      font: `900 12px ${this.fontStack}`,
      fillStyle: COLOR_RED,
      perfectCenter: true,
    });
    drawText(this.ctx, "KAT", cx + r * 0.55, cy, {
      font: `900 12px ${this.fontStack}`,
      fillStyle: COLOR_BLUE,
      perfectCenter: true,
    });

    ctx.restore();
  }

  /** 音符：优先使用皮肤纹理（taikohitcircle / taikobigcircle），无皮肤则 Canvas 原语 */
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

    // 皮肤纹理：taikobigcircle 优先用于大音符，否则 taikohitcircle
    const baseSkin = big
      ? this.getSkinTexture("taikobigcircle.png") || this.getSkinTexture("taikohitcircle.png")
      : this.getSkinTexture("taikohitcircle.png");
    const overlaySkin = big
      ? this.getSkinTexture("taikobigcircleoverlay.png") || this.getSkinTexture("taikohitcircleoverlay.png")
      : this.getSkinTexture("taikohitcircleoverlay.png");

    if (baseSkin) {
      const size = r * 2;
      // taikohitcircle 默认是红色，katsu（蓝）需 tint 蓝色
      this.drawTintedTexture(baseSkin, x - size / 2, y - size / 2, size, size, color);
      if (overlaySkin) ctx.drawImage(overlaySkin, x - size / 2, y - size / 2, size, size);
      // 大音符金边
      if (big) {
        ctx.beginPath();
        ctx.arc(x, y, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = COLOR_GOLD;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else {
      // 原始 Canvas 绘制
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
    }
    ctx.restore();
  }

  private tryHit(blue: boolean): void {
    if (this.status !== "playing") return;
    const time = this.currentTime;
    const side = blue ? 1 : 0;

    // 1. 冷却：同侧在 40ms 内只能触发一次判定
    if (time - this.lastHitTime[side] < this.HIT_COOLDOWN) return;

    // 2. 命中目标：普通音符必须颜色匹配；大音符任意一侧都可命中
    const best = this.findHitTarget(
      time,
      (obj) => !obj.judged && (this.isBig(obj) || this.isBlue(obj) === blue),
      (obj) => Math.abs(time - obj.time),
    );
    if (!best) return;

    // 3. 必须落在实际判定窗口内，防止一次点击误判远处的音符
    if (Math.abs(time - best.time) > this.windows["50"]) return;

    this.lastHitTime[side] = time;
    const j = this.judgeHit(best, time);
    this.spawnHitEffect(this.judgePos, this.crossPos, j, time);
  }

  /** Taiko 覆盖：始终播放对应颜色的合成音效，不依赖谱面 hitSound flags */
  protected playHitSound(obj: HitObject): void {
    this.playDefaultHitSound(this.isBlue(obj));
  }

  protected handlePointerDown(x: number, _y: number): void {
    if (this.status !== "playing") return;
    // 屏幕左半边 / 虚拟鼓左半边 = Don，右半边 = Katsu
    this.tryHit(x > this.ctx.width / 2);
    // 按下反馈位置
    this.pressCursor(this.currentTime);
  }

  protected handlePointerMove = (): void => {};
  protected handlePointerUp = (): void => {};

  protected handleKeyDown(key: string): void {
    const k = key.toLowerCase();
    if (k === "d" || k === "f") this.tryHit(false);
    else if (k === "k" || k === "j") this.tryHit(true);
  }
  protected handleKeyUp = (): void => {};
}
