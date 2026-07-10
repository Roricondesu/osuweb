/** osu!standard 引擎 - 扁平现代视觉
 *  - 圆圈：纯色填充 + 白色边框 + combo 数字
 *  - 滑条：纯色轨道 + 移动小球（真实插值）
 *  - 转盘：纯色圆环 + 旋转指针
 *  - 性能：预计算 combo、活动物件指针
 */
import type { HitObject } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawCircle, drawRing, drawText, drawRect, drawGlassCircle, clamp, hexToRgba } from "../renderer/Canvas2D";

const OSU_W = 512;
const OSU_H = 384;
const CIRCLE_BASE_R = 34;

const DEFAULT_COMBO_COLORS = ["#f472b6", "#38bdf8", "#4ade80", "#fbbf24", "#a78bfa", "#fb7185", "#22d3ee", "#facc15"];
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
  private guideLineTime = 1800;
  private r = CIRCLE_BASE_R;
  private spinnerRotation = 0;
  private lastPointer: { x: number; y: number } | null = null;
  private cached: CachedObj[] = [];
  private lastFocusIndex = -1;
  private comboColors: string[] = DEFAULT_COMBO_COLORS;

  constructor(opts: EngineOptions) {
    super(opts);
    // 使用 Mod 调整后的有效 AR/CS
    this.preempt = arToPreempt(this.effectiveAR);
    this.r = csToRadius(this.effectiveCS);
    this.guideLineTime = this.preempt * this.approachMultiplier;
    // combo 颜色优先级：用户自定义 > 谱面自带 > 默认 8 色
    if (this.useCustomComboColors && this.customComboColors.length > 0) {
      this.comboColors = this.customComboColors;
    } else if (opts.beatmap.comboColors && opts.beatmap.comboColors.length > 0) {
      this.comboColors = opts.beatmap.comboColors;
    }
    this.precomputeObjects();
    this.onLayoutChange();
  }

  protected resetState(): void {
    super.resetState();
    this.spinnerRotation = 0;
    this.lastPointer = null;
    this.lastFocusIndex = -1;
    this.precomputeObjects();
    this.onLayoutChange();
  }

  private precomputeObjects(): void {
    const objs = this.beatmap.hitObjects;
    this.cached = new Array(objs.length);
    let ci = 0, cn = 1;
    let currentColor = this.comboColors[0];
    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      if (obj.newCombo) { ci = (ci + 1) % this.comboColors.length; cn = 1; currentColor = this.comboColors[ci]; }
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

  /** 滑条实际结束位置（考虑返程） */
  private sliderEndPosition(obj: HitObject, idx: number): { x: number; y: number } {
    const c = this.cached[idx];
    if (obj.type !== "slider" || c.canvasPoints.length < 2) {
      return this.toCanvas(obj.x, obj.y);
    }
    const slides = obj.slides || 1;
    // 奇数 slide 结束在尾部，偶数 slide 结束在头部
    const endIdx = slides % 2 === 1 ? c.canvasPoints.length - 1 : 0;
    return c.canvasPoints[endIdx];
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

  protected toCanvas(x: number, y: number): { x: number; y: number } {
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
          const endPos = this.sliderEndPosition(obj, i);
          this.spawnHitEffect(endPos.x, endPos.y, "300", time);
          this.spawnJudgePopup("300", endPos.x, endPos.y, time);
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
    else if (this.modRelax || this.modAutopilot) this.modAutoInput(time);
    this.pruneHitEffects(time);
  }

  /**
   * Relax / Autopilot Mod 的自动输入
   * - Autopilot：自动移动光标到下一个物件，玩家只需点击
   * - Relax：光标在物件上时自动判定，玩家只需移动光标
   * 两者同时启用时等同于 Autopilot + Relax（几乎全自动，但仍需点击）
   */
  private modAutoInput(time: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    const win300 = this.windows["300"];

    // Autopilot：自动移动光标到最近的可击打物件
    if (this.modAutopilot) {
      let focus: HitObject | null = null;
      let focusIndex = -1;
      let bestScore = Infinity;
      for (let i = this.activeIndex; i < len; i++) {
        const obj = objs[i];
        if (obj.judged) continue;
        if (obj.type === "slider" && time > (obj.endTime || obj.time)) continue;
        const dt = obj.time - time;
        let score = dt;
        if (obj.type === "circle" && Math.abs(dt) <= win300) {
          score -= 2000;
        }
        if (obj.type === "slider" && obj._sliderHit) {
          const remaining = (obj.endTime || obj.time) - time;
          if (remaining > 200) score -= 1800;
        }
        if (obj.type === "spinner" && time >= obj.time && time <= (obj.endTime || obj.time)) {
          score -= 1000;
        }
        if (score < bestScore) {
          bestScore = score;
          focus = obj;
          focusIndex = i;
        }
        if (dt > this.preempt) break;
      }
      if (focus) {
        if (focus.type === "spinner") {
          this.spinnerRotation += 0.6;
          if (this.spinnerRotation > 10) {
            this.judgeHit(focus, time);
            this.spawnHitEffect(this.ctx.width / 2, this.ctx.height / 2, "300", time);
            this.spinnerRotation = 0;
          }
          this.cursorTargetX = this.ctx.width / 2 + Math.cos(time / 80) * 60;
          this.cursorTargetY = this.ctx.height / 2 + Math.sin(time / 80) * 60;
        } else {
          const pos = this.toCanvas(focus.x, focus.y);
          this.cursorTargetX = pos.x;
          this.cursorTargetY = pos.y;
        }
      }
    }

    // Relax：光标在物件判定窗口内且距离足够近时自动判定
    if (this.modRelax) {
      const cx = this.cursorX;
      const cy = this.cursorY;
      const hitRadius = this.radius * 1.4;
      for (let i = this.activeIndex; i < len; i++) {
        const obj = objs[i];
        if (obj.judged) continue;
        if (obj.type === "spinner") continue;
        const delta = time - obj.time;
        if (delta < -win300) break;
        if (delta > win300) continue;
        // slider 头部
        if (obj.type === "slider") {
          if (!obj._sliderHit) {
            const pos = this.toCanvas(obj.x, obj.y);
            const dist = Math.hypot(pos.x - cx, pos.y - cy);
            if (dist <= hitRadius) {
              obj._sliderHit = true;
              obj.judged = false;
              this.spawnHitEffect(pos.x, pos.y, "300", time);
              this.pressCursor(time);
              this.playHitSound(obj);
            }
          }
          continue;
        }
        // circle
        if (obj.type === "circle") {
          const pos = this.toCanvas(obj.x, obj.y);
          const dist = Math.hypot(pos.x - cx, pos.y - cy);
          if (dist <= hitRadius) {
            this.judgeHit(obj, time);
            this.spawnHitEffect(pos.x, pos.y, "300", time);
            this.pressCursor(time);
          }
        }
        if (obj.time - time > this.windows["50"] + 100) break;
      }
    }
  }

  private autoPlay(time: number): void {
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    const win300 = this.windows["300"];

    // 先自动击打所有当前在窗口内的 circle / 滑条头部，与移动目标解耦
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      if (obj.type === "spinner") continue;
      if (obj.type === "slider") {
        const delta = time - obj.time;
        if (!obj._sliderHit && delta >= -win300 && delta <= win300) {
          obj._sliderHit = true;
          obj.judged = false;
          const head = this.toCanvas(obj.x, obj.y);
          this.spawnHitEffect(head.x, head.y, "300", time);
          this.pressCursor(time);
          this.playHitSound(obj);
        }
        continue;
      }
      // circle
      const delta = time - obj.time;
      if (delta <= win300 && delta >= -win300) {
        this.judgeHit(obj, time);
        const p = this.toCanvas(obj.x, obj.y);
        this.spawnHitEffect(p.x, p.y, "300", time);
        this.pressCursor(time);
      }
      if (obj.time - time > this.windows["50"] + 100) break;
    }

    // 选择移动目标：能滑完滑条就尽量滑完，同时保证 circle 紧急时不会被漏掉
    let focus: HitObject | null = null;
    let focusIndex = -1;
    let bestScore = Infinity;
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      if (obj.type === "slider" && time > (obj.endTime || obj.time)) continue;

      const dt = obj.time - time;
      let score = dt;

      // circle 在窗口内时加分， urgency 越高越优先；刚进入窗口时不抢滑条
      if (obj.type === "circle" && Math.abs(dt) <= win300) {
        const urgency = (win300 - Math.abs(dt)) / win300; // 0 ~ 1
        score -= 400 + urgency * 2200;
      }
      // 已按住头部的滑条：剩余时间多时优先滑完，快结束时才允许切换
      if (obj.type === "slider" && obj._sliderHit) {
        const remaining = (obj.endTime || obj.time) - time;
        if (remaining > 200) {
          score -= 1800; // 优先滑完
        } else {
          score += 600; // 快结束，准备切换
        }
      }
      // 进行中的 spinner 保持中等优先
      if (obj.type === "spinner" && time >= obj.time && time <= (obj.endTime || obj.time)) {
        score -= 1000;
      }

      if (score < bestScore) {
        bestScore = score;
        focus = obj;
        focusIndex = i;
      }

      if (dt > this.preempt) break;
    }
    if (!focus) return;

    let targetX = this.cursorTargetX;
    let targetY = this.cursorTargetY;

    if (focus.type === "spinner") {
      const cx = this.ctx.width / 2, cy = this.ctx.height / 2;
      this.spinnerRotation += 0.6;
      if (this.spinnerRotation > 10) {
        this.judgeHit(focus, time);
        this.spawnHitEffect(cx, cy, "300", time);
        this.spinnerRotation = 0;
      }
      targetX = cx + Math.cos(time / 80) * 60;
      targetY = cy + Math.sin(time / 80) * 60;
    } else if (focus.type === "slider") {
      const c = this.cached[focusIndex];
      const pts = c.canvasPoints;
      const endTime = focus.endTime || focus.time;
      const head = this.toCanvas(focus.x, focus.y);
      const tail = pts.length >= 2 ? this.sliderEndPosition(focus, focusIndex) : head;

      if (time < focus.time) {
        // 滑条未开始：光标提前停在头部等待
        targetX = head.x;
        targetY = head.y;
      } else if (time > endTime) {
        // 滑条刚结束：光标停在尾部，下一帧会切换到新目标
        targetX = tail.x;
        targetY = tail.y;
      } else {
        // 滑条进行中：跟随球
        if (pts.length >= 2) {
          const sd = c.sliderDuration || 1;
          const slides = focus.slides || 1;
          const progressRaw = (time - focus.time) / sd;
          const slideIdx = Math.floor(progressRaw * slides);
          if (slideIdx < slides) {
            const localT = (progressRaw * slides) % 1;
            const t = slideIdx % 2 === 0 ? localT : 1 - localT;
            const pos = this.evalSliderPos(pts, t);
            targetX = pos.x;
            targetY = pos.y;
          }
        }
      }
    } else {
      // circle：光标朝目标移动
      const p = this.toCanvas(focus.x, focus.y);
      targetX = p.x;
      targetY = p.y;
    }

    // 预测未来路径方向：加权接下来 3 个未判定物件，用于贝塞尔曲线 lookahead
    let nextX = targetX;
    let nextY = targetY;
    let futureDx = 0;
    let futureDy = 0;
    let futureWeight = 0;
    const cx = this.ctx.width / 2;
    const cy = this.ctx.height / 2;
    for (let j = focusIndex + 1, w = 1; j < len && w > 0.1; j++) {
      const next = objs[j];
      if (next.judged) continue;
      if (next.type === "slider" && time > (next.endTime || next.time)) continue;

      let np: { x: number; y: number };
      if (next.type === "spinner") {
        np = { x: cx, y: cy };
      } else if (next.type === "slider") {
        np = this.toCanvas(next.x, next.y);
      } else {
        np = this.toCanvas(next.x, next.y);
      }

      futureDx += (np.x - targetX) * w;
      futureDy += (np.y - targetY) * w;
      futureWeight += w;
      w *= 0.55;
    }
    if (futureWeight > 0) {
      nextX = targetX + futureDx / futureWeight;
      nextY = targetY + futureDy / futureWeight;
    }

    // 目标切换时记录贝塞尔移动起点、上一目标和持续时间
    if (focusIndex !== this.lastFocusIndex) {
      this.lastFocusIndex = focusIndex;
      this.cursorMoveStartTime = time;
      this.cursorLastTargetX = this.cursorTargetX;
      this.cursorLastTargetY = this.cursorTargetY;
      this.cursorMoveStartX = this.cursorX;
      this.cursorMoveStartY = this.cursorY;
      // 持续时间：到目标物件时间，最短 50ms 防止过短，最长 preempt 防止过长
      // 受 autoCursorSpeed 倍率影响：speed > 1 更快，speed < 1 更慢
      const baseDuration = focus ? Math.max(50, Math.min(this.preempt, focus.time - time)) : 200;
      this.cursorMoveDuration = Math.max(30, baseDuration / this.autoCursorSpeed);
    }

    this.cursorTargetX = targetX;
    this.cursorTargetY = targetY;
    this.cursorNextTargetX = nextX;
    this.cursorNextTargetY = nextY;
  }


  protected render(): void {
    const time = this.currentTime;
    this.renderBackground(time);
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

    this.drawGuideLine(time);
    this.renderForeground(time);
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

  /** 引导线：在上一物件与下一目标之间显示实线，两端透明度渐变，带整体淡入淡出 */
  private drawGuideLine(time: number): void {
    if (!this.showFollowPoints) return;
    const objs = this.beatmap.hitObjects;
    if (objs.length < 2) return;

    // 找下一个未判定且即将到来的目标
    let nextIdx = -1;
    for (let i = this.activeIndex; i < objs.length; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      const dt = obj.time - time;
      if (dt > 0 && dt <= this.guideLineTime) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx < 1) return;

    const prev = objs[nextIdx - 1];
    const next = objs[nextIdx];

    // 上一物件位置（滑条取结束位置）
    const prevIdx = nextIdx - 1;
    const prevPos = prev.type === "slider"
      ? this.sliderEndPosition(prev, prevIdx)
      : this.toCanvas(prev.x, prev.y);
    const nextPos = this.toCanvas(next.x, next.y);

    const dt = next.time - time;
    // 整体淡入淡出
    const fadeIn = 1 - clamp((dt - this.guideLineTime * 0.5) / (this.guideLineTime * 0.4), 0, 1);
    const fadeOut = clamp(dt / (this.guideLineTime * 0.4), 0, 1);
    const globalAlpha = Math.min(fadeIn, fadeOut);
    if (globalAlpha <= 0.01) return;

    const { ctx } = this.ctx;
    const grad = ctx.createLinearGradient(prevPos.x, prevPos.y, nextPos.x, nextPos.y);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.2, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.8, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.save();
    ctx.globalAlpha = globalAlpha;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(nextPos.x, nextPos.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawCircle(obj: HitObject, idx: number, time: number): void {
    const c = this.cached[idx];
    const p = this.toCanvas(obj.x, obj.y);
    const r = this.radius * this.hitCircleScale;
    const timeUntil = obj.time - time;
    const approachT = clamp(1 - timeUntil / this.preempt, 0, 1);
    const color = c.comboColor;

    // Hidden Mod：物件在引导圈收缩后期淡出，命中后完全消失
    let hiddenAlpha = 1;
    if (this.modHidden) {
      if (approachT > 0.6) {
        hiddenAlpha = clamp(1 - (approachT - 0.6) / 0.3, 0, 1);
      }
      if (timeUntil < 0) hiddenAlpha = 0;
    }

    // approach circle - 优先使用皮肤纹理；Hidden 下收缩过半后隐藏
    if (approachT < 1 && this.showApproachCircles && !(this.modHidden && approachT > 0.5)) {
      const ar = r * (4 - 3 * approachT);
      const approachSkin = this.getSkinTexture("approachcircle.png");
      if (approachSkin) {
        const { ctx } = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.85 * hiddenAlpha;
        const size = ar * 2;
        ctx.drawImage(approachSkin, p.x - size / 2, p.y - size / 2, size, size);
        ctx.restore();
      } else {
        const { ctx } = this.ctx;
        ctx.save();
        ctx.globalAlpha = hiddenAlpha;
        drawRing(this.ctx, p.x, p.y, ar, hexToRgba(color, 0.65), 2);
        ctx.restore();
      }
    }

    if (hiddenAlpha <= 0.01) return;

    const { ctx } = this.ctx;
    ctx.save();
    ctx.globalAlpha = hiddenAlpha;

    // 主体圆
    const hitCircleSkin = this.getSkinTexture("hitcircle.png");
    const overlaySkin = this.getSkinTexture("hitcircleoverlay.png");
    if (hitCircleSkin) {
      const size = r * 2;
      // hitcircle.png tint combo 颜色（osu! 默认白色，需着色）
      this.drawTintedTexture(hitCircleSkin, p.x - size / 2, p.y - size / 2, size, size, color);
      // 叠加 overlay（保持原色，通常是边框/高光）
      if (overlaySkin) {
        ctx.drawImage(overlaySkin, p.x - size / 2, p.y - size / 2, size, size);
      }
      // combo 数字
      if (this.showComboNumbers) {
        drawText(this.ctx, String(c.comboNumber), p.x, p.y, {
          font: `800 ${Math.max(12, Math.round(r * 0.9))}px ${this.fontStack}`,
          fillStyle: "rgba(255,255,255,0.95)",
          align: "center",
          perfectCenter: true,
          offsetY: -1,
        });
      }
    } else {
      // 原始 Canvas 绘制
      drawGlassCircle(this.ctx, p.x, p.y, r, hexToRgba(color, GLASS_ALPHA), "rgba(255,255,255,0.7)", 2);
      drawCircle(this.ctx, p.x, p.y, r * 0.55, hexToRgba(color, 0.7));
      if (this.showComboNumbers) {
        drawText(this.ctx, String(c.comboNumber), p.x, p.y, {
          font: `800 ${Math.max(12, Math.round(r * 0.9))}px ${this.fontStack}`,
          fillStyle: "rgba(255,255,255,0.95)",
          align: "center",
          perfectCenter: true,
          offsetY: -1,
        });
      }
    }
    ctx.restore();
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
    const drawPath = (lineWidth: number, strokeStyle: string, glow = false) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
      }
      ctx.stroke();
      ctx.restore();
    };

    // 滑条轨道：osu! 原版是连续描边路径，不用平铺纹理（平铺会导致碎裂）。
    // 绘制顺序（由外到内）：
    //   1. 外边框（combo 色实心，最粗）
    //   2. 内轨道（深色半透明，稍细）
    // 这样得到一条带 combo 色边框、深色填充的连续轨道，干净无碎裂。
    const borderW = r * 2.0 * this.sliderBorderWidth;
    drawPath(borderW, color);
    drawPath(borderW * 0.9, hexToRgba("#000000", 0.35));

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

    // 头部圆：使用 hitcircle 皮肤纹理（tint combo 颜色），与普通圆圈一致
    const hitCircleSkin = this.getSkinTexture("hitcircle.png");
    const overlaySkin = this.getSkinTexture("hitcircleoverlay.png");
    if (hitCircleSkin) {
      const size = r * 2;
      this.drawTintedTexture(hitCircleSkin, pts[0].x - size / 2, pts[0].y - size / 2, size, size, color);
      if (overlaySkin) ctx.drawImage(overlaySkin, pts[0].x - size / 2, pts[0].y - size / 2, size, size);
    } else {
      drawGlassCircle(this.ctx, pts[0].x, pts[0].y, r, hexToRgba(color, GLASS_ALPHA), "rgba(255,255,255,0.85)", 2);
      drawCircle(this.ctx, pts[0].x, pts[0].y, r * 0.55, hexToRgba(color, 0.55));
    }
    if (this.showComboNumbers) {
      drawText(this.ctx, String(c.comboNumber), pts[0].x, pts[0].y, {
        font: `800 ${Math.max(12, Math.round(r * 0.8))}px ${this.fontStack}`,
        fillStyle: "rgba(255,255,255,0.95)",
        align: "center",
        perfectCenter: true,
        offsetY: -1,
      });
    }

    // 尾部圆：使用 hitcircle 皮肤纹理（tint combo 颜色），无皮肤则 Canvas 原语
    const tail = pts[pts.length - 1];
    if (hitCircleSkin) {
      const size = r * 2 * 0.82;
      this.drawTintedTexture(hitCircleSkin, tail.x - size / 2, tail.y - size / 2, size, size, color);
      if (overlaySkin) ctx.drawImage(overlaySkin, tail.x - size / 2, tail.y - size / 2, size, size);
    } else {
      drawGlassCircle(this.ctx, tail.x, tail.y, r * 0.82, hexToRgba(color, 0.28), "rgba(255,255,255,0.45)", 1.5);
    }

    // 反向箭头（多 slide 时在尾部）
    if (slides > 1 && !ended) {
      this.drawReverseArrow(tail, pts[pts.length - 2] || pts[0], r, color, time);
    }

    // approach circle
    if (timeUntil > 0 && this.showApproachCircles && !(this.modHidden && (1 - timeUntil / this.preempt) > 0.5)) {
      const approachT = clamp(1 - timeUntil / this.preempt, 0, 1);
      if (approachT < 1) {
        const ar = r * (3.8 - 2.8 * approachT);
        const approachSkin = this.getSkinTexture("approachcircle.png");
        if (approachSkin) {
          ctx.save();
          ctx.globalAlpha = 0.85;
          const size = ar * 2;
          ctx.drawImage(approachSkin, pts[0].x - size / 2, pts[0].y - size / 2, size, size);
          ctx.restore();
        } else {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          drawRing(this.ctx, pts[0].x, pts[0].y, ar, hexToRgba(color, 0.7), 2.5);
          ctx.restore();
        }
      }
    }

    // 滑条球 + 拖尾
    if (ballPos) {
      const { x: bx, y: by } = ballPos;
      const sliderBallSkin = this.getSkinTexture("sliderb0.png");
      if (sliderBallSkin) {
        // 使用皮肤滑条球（tint combo 颜色，osu! 默认 sliderb0 为白色需着色）
        const size = r * 1.4 * this.sliderBallScale;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        // 先 tint 再绘制：sliderb0 通常白色，叠加 combo 色
        this.drawTintedTexture(sliderBallSkin, bx - size / 2, by - size / 2, size, size, color);
        ctx.restore();
        // 跟随圈（不需要 tint，本身是亮色环）
        const followSkin = this.getSkinTexture("sliderfollowcircle.png");
        if (followSkin) {
          const fs = r * 2.8;
          ctx.drawImage(followSkin, bx - fs / 2, by - fs / 2, fs, fs);
        } else {
          // 无跟随圈皮肤：绘制半透明圆环
          ctx.save();
          ctx.strokeStyle = hexToRgba("#fff", 0.5);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bx, by, r * 1.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      } else {
        // 无滑条球皮肤：原始 Canvas 绘制
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
      }
    }
  }

  private drawReverseArrow(tail: { x: number; y: number }, prev: { x: number; y: number }, r: number, _color: string, time: number): void {
    const { ctx } = this.ctx;
    // 箭头指向返程方向（从尾部回到头部）
    const dx = prev.x - tail.x;
    const dy = prev.y - tail.y;
    const angle = Math.atan2(dy, dx);
    const pulse = 1 + Math.sin(time / 80) * 0.08;
    const size = r * 1.3 * pulse;

    const arrowSkin = this.getSkinTexture("reversearrow.png");
    if (arrowSkin) {
      ctx.save();
      ctx.translate(tail.x, tail.y);
      ctx.rotate(angle);
      ctx.drawImage(arrowSkin, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }

    const ts = r * 0.65 * pulse;
    ctx.save();
    ctx.translate(tail.x, tail.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-ts * 0.5, -ts * 0.5);
    ctx.lineTo(ts * 0.5, 0);
    ctx.lineTo(-ts * 0.5, ts * 0.5);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
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
      font: `900 20px ${this.fontStack}`,
      fillStyle: "rgba(255,255,255,0.55)",
      align: "center",
      perfectCenter: true,
    });
  }

  protected handlePointerDown(x: number, y: number): void {
    if (this.status !== "playing") return;
    const time = this.currentTime;
    this.pressCursor(time);
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
        this.playHitSound(best);
        // 不立即判定，滑条尾超时再判定
        return;
      }
      const j = this.judgeHit(best, time);
      const p = this.toCanvas(best.x, best.y);
      this.spawnHitEffect(p.x, p.y, j, time);
    }
  }

  protected handlePointerMove = (x: number, y: number): void => {
    this.lastPointer = { x, y };
  };

  protected handlePointerUp = (): void => {
    this.lastPointer = null;
  };

  protected handleKeyDown(key: string): void {
    if (key === "x" || key === "X" || key === "z" || key === "Z" || key === " ") {
      if (this.lastPointer) this.handlePointerDown(this.lastPointer.x, this.lastPointer.y);
      else this.handlePointerDown(this.ctx.width / 2, this.ctx.height / 2);
    }
  }

  protected handleKeyUp = (): void => {};
}
