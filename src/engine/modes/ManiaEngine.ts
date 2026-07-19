/** osu!mania 引擎 - 简约现代视觉
 *  - 纯色极简：列背景、判定线、note 圆角矩形
 *  - 支持任意键数（1K-18K，由 beatmap.cs 决定）
 *  - mania 专用判定窗口（覆盖基类 standard 窗口）
 *  - hold note：头部按 delta 判定，尾部按释放时差判定（300/100/50）
 *  - HR/Easy 不改变键数（mania 原版行为）
 */
import type { HitObject, Judgement } from "@/types";
import { defaultManiaKeys } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawRect, drawText, clamp, hexToRgba } from "../renderer/Canvas2D";

/** mania 专用判定窗口（ms），比 standard 更宽容 */
const maniaWindowsFor = (od: number): { "300": number; "100": number; "50": number } => ({
  "300": Math.max(16, 64 - 3 * od),
  "100": Math.max(64, 127 - 3 * od),
  "50": Math.max(96, 151 - 3 * od),
});

const APPROACH_TIME = 1600;
const JUDGE_LINE_OFFSET = 70;
const MODE_COLOR = "#a78bfa";

/** 简约配色：列按奇偶交替，中心列（奇数键数的中间列）高亮 */
const colColor = (col: number, cols: number): string => {
  const center = (cols - 1) / 2;
  const distFromCenter = Math.abs(col - center);
  if (cols % 2 === 1 && col === Math.round(center)) return "#a78bfa";
  if (distFromCenter % 2 === 0) return "#60a5fa";
  return "#f472b6";
};

export class ManiaEngine extends GameEngine {
  private cols: number;
  private colWidth = 0;
  private startX = 0;
  private judgeY = 0;
  private heldCols: Set<number> = new Set();
  /** 正在按住的 hold：obj -> 按下时间（用于尾判） */
  private activeHolds: Map<HitObject, number> = new Map();
  private keyMap: string[] = [];

  constructor(opts: EngineOptions) {
    super(opts);
    // 键数 = CircleSize；mania 不受 HR/Easy 影响 cs（原版行为）
    this.cols = Math.max(1, Math.min(18, Math.round(opts.beatmap.cs || 4)));
    // 覆盖基类 standard 窗口为 mania 专用窗口，advanceActiveIndex/findHitTarget 会自动使用
    this.windows = maniaWindowsFor(this.effectiveOD);
    // 兜底列号（osuParser 已计算，此处仅补缺失）
    const colWidth512 = 512 / this.cols;
    for (const obj of opts.beatmap.hitObjects) {
      if (obj.column == null) {
        obj.column = clamp(Math.floor(obj.x / colWidth512), 0, this.cols - 1);
      }
    }
    this.computeLayout();
    this.keyMap = this.resolveKeyMap();
  }

  /** 从 keyBindings.mania 取当前键数方案，缺失则用默认 */
  private resolveKeyMap(): string[] {
    const stored = this.keyBindings.mania?.[this.cols];
    if (stored && stored.length >= this.cols) return stored.slice(0, this.cols);
    return defaultManiaKeys(this.cols);
  }

  protected onLayoutChange(): void { this.computeLayout(); }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    // 高键数时放宽总宽，避免列过窄
    const ratio = this.isLandscape ? 0.55 : 0.92;
    const maxByCols = Math.max(480, this.cols * 70);
    const totalW = Math.min(width * ratio, maxByCols);
    this.colWidth = totalW / this.cols;
    this.startX = (width - totalW) / 2;
    this.judgeY = height - JUDGE_LINE_OFFSET;
  }

  private colX(col: number): number { return this.startX + col * this.colWidth + this.colWidth / 2; }

  private noteY(objTime: number, time: number): number {
    const dt = objTime - time;
    return this.judgeY - (dt / APPROACH_TIME) * (this.judgeY - 10);
  }

  /** mania 皮肤纹理：1-indexed 奇数列(col%2===0)用 note1/key1，偶数列用 note2/key2
   *  suffix: "" 普通头部, "L" 长条体, "T" 长条尾标记 */
  private noteTexture(col: number, suffix: "" | "L" | "T"): HTMLImageElement | null {
    const n = (col % 2 === 0) ? 1 : 2;
    return this.getSkinTexture(`mania-note${n}${suffix}.png`);
  }
  private keyTexture(col: number, down: boolean): HTMLImageElement | null {
    const n = (col % 2 === 0) ? 1 : 2;
    return this.getSkinTexture(`mania-key${n}${down ? "D" : ""}.png`);
  }

  protected update(time: number): void {
    this.advanceActiveIndex(time);
    const objs = this.beatmap.hitObjects;
    const len = objs.length;
    const win50 = this.windows["50"];
    for (let i = this.activeIndex; i < len; i++) {
      const obj = objs[i];
      if (obj.judged) continue;
      const col = obj.column ?? 0;
      if (obj.type === "hold" && obj.endTime) {
        if (!this.activeHolds.has(obj)) {
          // 未按下：超 win50 判 miss
          if (time - obj.time > win50) {
            this.judgeAndFinalize(obj, "miss", col, time);
          }
        } else if (time > obj.endTime + win50) {
          // 按住中但超过尾部窗口仍未释放：判定为释放（取尾判）
          // 模拟"在 endTime 释放"以给最宽容的判定
          this.finalizeHold(obj, col, obj.endTime);
        }
      } else {
        if (time - obj.time > win50) {
          this.judgeAndFinalize(obj, "miss", col, time);
        } else {
          break;
        }
      }
    }
    if (this.auto) this.autoPlay(time);
    this.pruneHitEffects(time);
  }

  private judgeAndFinalize(obj: HitObject, j: Judgement, col: number, time: number): void {
    obj.judged = true;
    obj.judgement = j;
    obj._hitTime = j !== "miss" ? time : obj._hitTime;
    this.submitJudgement(j);
    this.spawnHitEffect(this.colX(col), this.judgeY, j, time);
    this.spawnJudgePopup(j, this.colX(col), this.judgeY - 30, time);
  }

  /** 完成 hold 判定：取头/尾 delta 较差者 */
  private finalizeHold(obj: HitObject, col: number, releaseTime: number): void {
    const pressTime = this.activeHolds.get(obj) ?? obj.time;
    this.activeHolds.delete(obj);
    const win50 = this.windows["50"];
    const headDelta = Math.abs(pressTime - obj.time);
    const tailDelta = Math.abs(releaseTime - (obj.endTime ?? obj.time));
    let j: Judgement;
    if (releaseTime < (obj.endTime ?? obj.time) - win50) {
      // 释放过早 = miss
      j = "miss";
    } else {
      const worseDelta = Math.max(headDelta, tailDelta);
      const d = Math.abs(worseDelta);
      if (d <= this.windows["300"]) j = "300";
      else if (d <= this.windows["100"]) j = "100";
      else if (d <= this.windows["50"]) j = "50";
      else j = "miss";
    }
    obj.judged = true;
    obj.judgement = j;
    obj._hitTime = j !== "miss" ? releaseTime : obj._hitTime;
    this.submitJudgement(j);
    this.spawnHitEffect(this.colX(col), this.judgeY, j, releaseTime);
    // 尾部判定文字：在判定线上方显示
    this.spawnJudgePopup(j, this.colX(col), this.judgeY - 30, releaseTime);
  }

  private autoPlay(time: number): void {
    const win300 = this.windows["300"];
    // 自动释放已到达尾部的 hold：在 endTime 立即判定尾部
    const toRelease: HitObject[] = [];
    for (const [obj] of this.activeHolds) {
      if (obj.endTime && time >= obj.endTime) toRelease.push(obj);
    }
    for (const obj of toRelease) {
      this.finalizeHold(obj, obj.column ?? 0, obj.endTime);
    }
    this.heldCols.clear();
    for (let c = 0; c < this.cols; c++) {
      // 保持正在按住的长条
      let holding = false;
      for (const [obj] of this.activeHolds) {
        if ((obj.column ?? 0) === c && obj.endTime && time < obj.endTime + win300) {
          holding = true;
          break;
        }
      }
      if (holding) {
        this.heldCols.add(c);
        continue;
      }
      const best = this.findHitTarget(
        time,
        (obj) => (obj.column ?? 0) === c && !this.activeHolds.has(obj),
        (obj) => Math.abs(time - obj.time),
      );
      if (best && Math.abs(time - best.time) <= win300) {
        this.heldCols.add(c);
        this.tryHit(c);
      }
    }
    this.cursorTargetX = this.startX + (this.cols * this.colWidth) / 2;
    this.cursorTargetY = this.judgeY;
  }

  protected render(): void {
    this.renderBackground(this.currentTime);
    const time = this.currentTime;
    this.drawStage();

    const objs = this.beatmap.hitObjects;
    // 倒序绘制（上方 note 后画，覆盖下方）
    for (let i = objs.length - 1; i >= this.activeIndex; i--) {
      const obj = objs[i];
      if (obj.judged && obj.judgement !== "miss") continue;
      const col = obj.column ?? 0;
      const y = this.noteY(obj.time, time);
      if (y > this.ctx.height + 40) continue;
      if (y < -100) continue;
      const x = this.colX(col);
      const color = colColor(col, this.cols);
      const noteW = this.colWidth * 0.82;
      const noteH = 22;

      if (obj.type === "hold" && obj.endTime) {
        const isHeld = this.activeHolds.has(obj);
        // 头部位置：按住时贴在判定线，未按住时随时间下落（钳制不越过判定线）
        const headY = isHeld ? this.judgeY : Math.min(this.noteY(obj.time, time), this.judgeY);
        // 尾部位置：按住时钳制到判定线（hold 结束后 body 不延伸到判定线下方）
        const tailY = isHeld
          ? Math.min(this.noteY(obj.endTime, time), this.judgeY)
          : this.noteY(obj.endTime, time);
        // hold body：从 tail（上）到 head（下）
        const top = Math.min(tailY, headY);
        const bottom = Math.max(tailY, headY);
        if (bottom > top) {
          const bodyTex = this.noteTexture(col, "L");
          if (bodyTex) {
            this.ctx.ctx.drawImage(bodyTex, x - noteW / 2, top, noteW, bottom - top);
          } else {
            drawRect(this.ctx, x - noteW / 2, top, noteW, bottom - top, hexToRgba(color, isHeld ? 0.55 : 0.32), 3);
          }
        }
        // 头部 note（仅未按住时显示，按住后头部已"消失"在判定线）
        if (!isHeld && headY > -40 && headY <= this.judgeY) {
          const headTex = this.noteTexture(col, "");
          if (headTex) {
            this.ctx.ctx.drawImage(headTex, x - noteW / 2, headY - noteH / 2, noteW, noteH);
          } else {
            drawRect(this.ctx, x - noteW / 2, headY - noteH / 2, noteW, noteH, color, 4);
            drawRect(this.ctx, x - noteW / 2, headY - noteH / 2, noteW, 5, "#ffffff", 4);
          }
        }
        // 尾部标记（仅当尾部在屏幕内且未越过判定线时显示）
        if (tailY > -40 && tailY <= this.judgeY) {
          const tailTex = this.noteTexture(col, "T");
          if (tailTex) {
            this.ctx.ctx.drawImage(tailTex, x - noteW / 2, tailY - noteH / 2, noteW, noteH);
          } else {
            drawRect(this.ctx, x - noteW / 2, tailY - 3, noteW, 6, "#ffffff", 2);
          }
        }
      } else {
        // 普通 note：优先皮肤纹理，无则简约圆角矩形 + 顶部高光
        const alpha = clamp(1 - (this.judgeY - y) / (this.judgeY - 10), 0.5, 1);
        const noteTex = this.noteTexture(col, "");
        this.ctx.ctx.save();
        this.ctx.ctx.globalAlpha = alpha;
        if (noteTex) {
          this.ctx.ctx.drawImage(noteTex, x - noteW / 2, y - noteH / 2, noteW, noteH);
        } else {
          drawRect(this.ctx, x - noteW / 2, y - noteH / 2, noteW, noteH, color, 4);
          drawRect(this.ctx, x - noteW / 2, y - noteH / 2, noteW, 5, "#ffffff", 4);
        }
        this.ctx.ctx.restore();
      }
    }

    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!mania", modeColor: MODE_COLOR });
  }

  /** 简约舞台：列背景 + 判定线 + 按键面板（优先皮肤纹理，无则回退 Canvas 原语） */
  private drawStage(): void {
    const { ctx, height } = this.ctx;
    // 整体舞台背景（半透明深色）
    drawRect(this.ctx, this.startX, 0, this.cols * this.colWidth, height, "rgba(0,0,0,0.35)", 0);

    // 左右边框：mania-stage-left / mania-stage-right（拉伸至舞台高度）
    const stageLeft = this.getSkinTexture("mania-stage-left.png");
    const stageRight = this.getSkinTexture("mania-stage-right.png");
    const borderW = Math.min(this.colWidth * 0.3, 16);
    if (stageLeft) ctx.drawImage(stageLeft, this.startX - borderW, 0, borderW, height);
    if (stageRight) ctx.drawImage(stageRight, this.startX + this.cols * this.colWidth, 0, borderW, height);

    for (let c = 0; c < this.cols; c++) {
      const x = this.startX + c * this.colWidth;
      const color = colColor(c, this.cols);
      // 列背景：奇偶交替微差
      const bg = c % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)";
      drawRect(this.ctx, x, 0, this.colWidth, height, bg, 0);
      // 按住时列发光：优先 mania-stage-light 纹理，无则渐变
      if (this.heldCols.has(c)) {
        const glowH = 140;
        const lightTex = this.getSkinTexture("mania-stage-light.png");
        if (lightTex) {
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.drawImage(lightTex, x, this.judgeY - glowH, this.colWidth, glowH);
          ctx.restore();
        } else {
          const grad = ctx.createLinearGradient(0, this.judgeY - glowH, 0, this.judgeY);
          grad.addColorStop(0, hexToRgba(color, 0));
          grad.addColorStop(1, hexToRgba(color, 0.35));
          ctx.fillStyle = grad;
          ctx.fillRect(x, this.judgeY - glowH, this.colWidth, glowH);
        }
      }
      // 列分隔线（皮肤有 stage 边框时弱化）
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    // 最右侧分隔线
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(this.startX + this.cols * this.colWidth, 0);
    ctx.lineTo(this.startX + this.cols * this.colWidth, height);
    ctx.stroke();

    // 判定线
    drawRect(this.ctx, this.startX, this.judgeY - 2, this.cols * this.colWidth, 3, "#ffffff", 0);

    // 底部按键面板：优先 mania-key1/2 (松开) / mania-key1D/2D (按下)
    const panelH = 40;
    const py = this.judgeY + 8;
    for (let c = 0; c < this.cols; c++) {
      const x = this.startX + c * this.colWidth;
      const color = colColor(c, this.cols);
      const isHeld = this.heldCols.has(c);
      const pad = 4;
      const keyTex = this.keyTexture(c, isHeld);
      if (keyTex) {
        ctx.drawImage(keyTex, x + pad, py, this.colWidth - pad * 2, panelH);
      } else {
        drawRect(
          this.ctx,
          x + pad, py, this.colWidth - pad * 2, panelH,
          isHeld ? hexToRgba(color, 0.4) : "rgba(255,255,255,0.06)",
          8,
        );
        ctx.strokeStyle = isHeld ? hexToRgba(color, 0.8) : "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + pad, py, this.colWidth - pad * 2, panelH);
      }
      // 按键标签（皮肤纹理通常不含键名，始终绘制以方便识别）
      const label = this.keyMap[c] === " " ? "␣" : (this.keyMap[c] || "").toUpperCase();
      drawText(this.ctx, label, x + this.colWidth / 2, py + panelH / 2 + 1, {
        font: `700 13px ${this.fontStack}`,
        fillStyle: isHeld ? "#fff" : "rgba(255,255,255,0.5)",
        perfectCenter: true,
      });
    }
  }

  /** 按下列：命中普通 note 或开始 hold */
  private tryHit(col: number): void {
    if (this.status !== "playing") return;
    const time = this.currentTime;
    const best = this.findHitTarget(
      time,
      (obj) => (obj.column ?? 0) === col && !this.activeHolds.has(obj),
      (obj) => Math.abs(time - obj.time),
    );
    if (!best) return;

    const delta = time - best.time;
    const win50 = this.windows["50"];
    if (Math.abs(delta) > win50) return; // 超出窗口，忽略

    if (best.type === "hold" && best.endTime) {
      // hold 头部：记录按下时间，不立即提交分数（尾判时一起算）
      this.activeHolds.set(best, time);
      this.playHitSound(best);
    } else {
      const j = this.judgeByDeltaMania(delta);
      best.judged = true;
      best.judgement = j;
      this.submitJudgement(j);
      this.spawnHitEffect(this.colX(col), this.judgeY, j, time);
      this.playHitSound(best);
    }
  }

  /** mania 专用 delta 判定 */
  private judgeByDeltaMania(delta: number): Judgement {
    const d = Math.abs(delta);
    if (d <= this.windows["300"]) return "300";
    if (d <= this.windows["100"]) return "100";
    if (d <= this.windows["50"]) return "50";
    return "miss";
  }

  /** 释放列：判定 hold 尾部 */
  private releaseCol(col: number, time: number): void {
    this.heldCols.delete(col);
    // 收集该列所有正在按住的 hold（避免迭代中删除）
    const toRelease: HitObject[] = [];
    for (const [obj] of this.activeHolds) {
      if ((obj.column ?? 0) === col) toRelease.push(obj);
    }
    for (const obj of toRelease) {
      this.finalizeHold(obj, col, time);
    }
  }

  protected handlePointerDown(x: number, _y: number): void {
    if (this.status !== "playing") return;
    const col = Math.floor((x - this.startX) / this.colWidth);
    if (col < 0 || col >= this.cols) return;
    this.heldCols.add(col);
    this.tryHit(col);
  }
  protected handlePointerMove = (): void => {};
  protected handlePointerUp = (x: number): void => {
    const col = Math.floor((x - this.startX) / this.colWidth);
    if (col < 0 || col >= this.cols) return;
    this.releaseCol(col, this.currentTime);
  };

  protected handleKeyDown(key: string): void {
    const k = key.toLowerCase();
    const idx = this.keyMap.findIndex((m) => m.toLowerCase() === k);
    if (idx < 0) return;
    // 防止键盘重复触发（keydown 会连续发送）
    if (this.heldCols.has(idx)) return;
    this.heldCols.add(idx);
    this.tryHit(idx);
  }
  protected handleKeyUp = (key: string): void => {
    const k = key.toLowerCase();
    const idx = this.keyMap.findIndex((m) => m.toLowerCase() === k);
    if (idx < 0) return;
    this.heldCols.delete(idx);
    this.releaseCol(idx, this.currentTime);
  };

  protected resetState(): void {
    super.resetState();
    this.activeHolds.clear();
    this.heldCols.clear();
  }
}
