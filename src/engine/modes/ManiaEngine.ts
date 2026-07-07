/** osu!mania 引擎 - 扁平现代视觉
 *  - 纯色列背景
 *  - 按下时列发光（扁平）
 *  - 音符为纯色圆角矩形
 *  - 支持 4/7 键
 *  - 性能：活动物件指针、预计算列
 */
import type { HitObject, ParsedBeatmap, Judgement } from "@/types";
import { GameEngine } from "../GameEngine";
import { drawRect, drawText, clamp, hexToRgba, GAME_FONT } from "../renderer/Canvas2D";

const APPROACH_TIME = 1600;
const JUDGE_LINE_OFFSET = 60;
const MODE_COLOR = "#a78bfa";

const COL_COLORS = ["#f472b6", "#60a5fa", "#f472b6", "#60a5fa", "#f472b6", "#60a5fa", "#a78bfa"];
const KEY_LABELS_4 = ["D", "F", "J", "K"];
const KEY_LABELS_7 = ["S", "D", "F", "Space", "J", "K", "L"];

export class ManiaEngine extends GameEngine {
  private cols = 4;
  private colWidth = 0;
  private startX = 0;
  private judgeY = 0;
  private heldCols: Set<number> = new Set();
  private activeHolds: Map<HitObject, boolean> = new Map();
  private keyMap: string[] = [];

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
    for (const obj of opts.beatmap.hitObjects) {
      if (obj.column == null) {
        obj.column = clamp(Math.floor(obj.x / (512 / this.cols)), 0, this.cols - 1);
      }
    }
    this.computeLayout();
    this.keyMap = this.cols === 4 ? KEY_LABELS_4 : KEY_LABELS_7;
  }

  protected onLayoutChange(): void { this.computeLayout(); }

  private computeLayout(): void {
    const { width, height } = this.ctx;
    const ratio = this.isLandscape ? 0.5 : 0.88;
    const totalW = Math.min(width * ratio, 540);
    this.colWidth = totalW / this.cols;
    this.startX = (width - totalW) / 2;
    this.judgeY = height - JUDGE_LINE_OFFSET;
  }

  private colX(col: number): number { return this.startX + col * this.colWidth + this.colWidth / 2; }

  private noteY(objTime: number, time: number): number {
    const dt = objTime - time;
    return this.judgeY - (dt / APPROACH_TIME) * (this.judgeY - 10);
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
          if (time - obj.time > win50) {
            obj.judged = true; obj.judgement = "miss"; this.submitJudgement("miss");
            this.spawnHitEffect(this.colX(col), this.judgeY, "miss", time);
          }
        } else if (time >= obj.endTime) {
          obj.judged = true; obj.judgement = "300"; this.submitJudgement("300");
          this.spawnHitEffect(this.colX(col), this.judgeY, "300", time);
          this.activeHolds.delete(obj);
        }
      } else {
        if (time - obj.time > win50) {
          obj.judged = true; obj.judgement = "miss"; this.submitJudgement("miss");
          this.spawnHitEffect(this.colX(col), this.judgeY, "miss", time);
        } else {
          break;
        }
      }
    }
    if (this.auto) this.autoPlay(time);
    this.pruneHitEffects(time);
  }

  private autoPlay(time: number): void {
    const win300 = this.windows["300"];
    this.heldCols.clear();
    for (let c = 0; c < this.cols; c++) {
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
    this.clearScreen();
    const time = this.currentTime;
    this.drawStage();

    const objs = this.beatmap.hitObjects;
    for (let i = objs.length - 1; i >= this.activeIndex; i--) {
      const obj = objs[i];
      if (obj.judged && obj.judgement !== "miss") continue;
      const col = obj.column ?? 0;
      const y = this.noteY(obj.time, time);
      if (y > this.ctx.height + 40) continue;
      if (y < -70) continue;
      const x = this.colX(col);
      const color = COL_COLORS[col % COL_COLORS.length];
      if (obj.type === "hold" && obj.endTime) {
        const endY = this.noteY(obj.endTime, time);
        const h = Math.max(6, this.judgeY - endY);
        drawRect(this.ctx, x - this.colWidth * 0.4, this.judgeY - h, this.colWidth * 0.8, h, color, 4);
        drawRect(this.ctx, x - this.colWidth * 0.4, this.judgeY - h, this.colWidth * 0.8, 10, "#fff", 4);
      } else {
        const alpha = clamp(1 - (this.judgeY - y) / (this.judgeY - 10), 0.6, 1);
        this.ctx.ctx.save();
        this.ctx.ctx.globalAlpha = alpha;
        drawRect(this.ctx, x - this.colWidth * 0.4, y - 12, this.colWidth * 0.8, 24, color, 4);
        drawRect(this.ctx, x - this.colWidth * 0.4, y - 12, this.colWidth * 0.8, 6, "#fff", 4);
        this.ctx.ctx.restore();
      }
    }

    this.drawHitEffects(time);
    this.drawJudgePopups(time);
    this.drawHUD({ comboColor: MODE_COLOR, modeLabel: "osu!mania", modeColor: MODE_COLOR });
  }

  private drawStage(): void {
    const { ctx, width } = this.ctx;
    for (let c = 0; c < this.cols; c++) {
      const x = this.startX + c * this.colWidth;
      const bg = c % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)";
      drawRect(this.ctx, x, 0, this.colWidth, this.ctx.height, bg, 0);
      if (this.heldCols.has(c)) {
        const color = COL_COLORS[c % COL_COLORS.length];
        drawRect(this.ctx, x, this.judgeY - 120, this.colWidth, 120, hexToRgba(color, 0.28), 0);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.ctx.height); ctx.stroke();
    }
    drawRect(this.ctx, this.startX, this.judgeY - 2, this.cols * this.colWidth, 4, "#fff", 0);
    for (let c = 0; c < this.cols; c++) {
      const x = this.startX + c * this.colWidth;
      // 毛玻璃按键面板
      const panelH = 44;
      const py = this.judgeY + 6;
      const color = COL_COLORS[c % COL_COLORS.length];
      const isHeld = this.heldCols.has(c);
      drawRect(this.ctx, x + 4, py, this.colWidth - 8, panelH, isHeld ? `${color}4d` : "rgba(255,255,255,0.08)", 10);
      ctx.strokeStyle = isHeld ? `${color}80` : "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4, py, this.colWidth - 8, panelH);
      // 顶部高光
      ctx.fillStyle = isHeld ? `${color}33` : "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(x + 8, py + 3, this.colWidth - 16, panelH * 0.35, [6, 6, 4, 4]);
      ctx.fill();
      drawText(this.ctx, this.keyMap[c] || "", x + this.colWidth / 2, py + panelH / 2 + 1, {
        font: `800 12px ${GAME_FONT}`,
        fillStyle: isHeld ? "#fff" : "rgba(255,255,255,0.55)",
      });
    }
  }

  private tryHit(col: number): void {
    if (this.status !== "playing") return;
    const time = this.currentTime;
    const best = this.findHitTarget(
      time,
      (obj) => (obj.column ?? 0) === col && !this.activeHolds.has(obj),
      (obj) => Math.abs(time - obj.time),
    );
    if (best) {
      if (best.type === "hold" && best.endTime) {
        const j = this.judgeHit(best, time);
        this.spawnHitEffect(this.colX(col), this.judgeY, j, time);
        this.activeHolds.set(best, true);
      } else {
        const j = this.judgeHit(best, time);
        this.spawnHitEffect(this.colX(col), this.judgeY, j, time);
      }
    }
  }

  private releaseCol(col: number, time: number): void {
    this.heldCols.delete(col);
    for (const [obj] of this.activeHolds) {
      if ((obj.column ?? 0) !== col) continue;
      if (obj.endTime && time < obj.endTime) {
        obj.judged = true; obj.judgement = "miss"; this.submitJudgement("miss");
        this.spawnHitEffect(this.colX(col), this.judgeY, "miss", time);
      }
      this.activeHolds.delete(obj);
    }
  }

  public onPointerDown(x: number, _y: number): void {
    if (this.status !== "playing") return;
    const col = Math.floor((x - this.startX) / this.colWidth);
    if (col < 0 || col >= this.cols) return;
    this.heldCols.add(col);
    this.tryHit(col);
  }
  public onPointerMove = (): void => {};
  public onPointerUp = (x: number, _y: number): void => {
    const col = Math.floor((x - this.startX) / this.colWidth);
    if (col < 0 || col >= this.cols) return;
    this.releaseCol(col, this.currentTime);
  };

  public onKeyDown(key: string): void {
    const k = key.toLowerCase();
    const idx = this.keyMap.findIndex((m) => m.toLowerCase() === k);
    if (idx < 0) return;
    this.heldCols.add(idx);
    this.tryHit(idx);
  }
  public onKeyUp = (key: string): void => {
    const k = key.toLowerCase();
    const idx = this.keyMap.findIndex((m) => m.toLowerCase() === k);
    if (idx >= 0) this.releaseCol(idx, this.currentTime);
  };

  protected resetState(): void {
    super.resetState();
    this.activeHolds.clear();
    this.heldCols.clear();
  }
}
