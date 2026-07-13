/** osu!taiko 引擎 - 重构后的扁平现代视觉
 *  - 音符始终水平从右向左飞入判定圈
 *  - 横屏：轨道居中；竖屏：轨道靠上
 *  - 打击点改为空心圆环，不遮挡后方音符
 *  - 底部绘制虚拟太鼓作为操作区
 *  - 支持 Don（红/鼓面）与 Katsu（蓝/鼓边）
 */
import type { HitObject } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawRect, drawRing, clamp } from "../renderer/Canvas2D";

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
      const blue = this.isBlue(best);
      const side = blue ? 1 : 0;
      // Auto 模式下也遵守冷却并播放按键反馈音
      if (time - this.lastHitTime[side] >= this.HIT_COOLDOWN) {
        this.lastHitTime[side] = time;
        this.playTaikoFeedback(blue);
        const j = this.judgeHit(best, time, this.judgePos, this.crossPos);
        this.spawnHitEffect(this.judgePos, this.crossPos, j, time);
        this.pressCursor(time);
      }
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
    this.drawHitHint();
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

  /** 底部击打提示：左蓝 KAT | 右红 DON */
  private drawHitHint(): void {
    const { ctx, width, height } = this.ctx;
    const y = height - 26;

    ctx.save();
    ctx.font = `700 12px ${this.fontStack}`;
    ctx.textBaseline = "middle";

    // 左蓝 KAT
    ctx.textAlign = "right";
    ctx.fillStyle = COLOR_BLUE;
    ctx.globalAlpha = 0.85;
    ctx.fillText("KAT", width / 2 - 10, y);

    // 分隔线
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, y - 8);
    ctx.lineTo(width / 2, y + 8);
    ctx.stroke();

    // 右红 DON
    ctx.textAlign = "left";
    ctx.fillStyle = COLOR_RED;
    ctx.fillText("DON", width / 2 + 10, y);

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
      // 毛玻璃实心填充（更高不透明度的径向渐变）
      ctx.beginPath();
      ctx.arc(x, y, r - 2, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r - 2);
      grad.addColorStop(0, blue ? "rgba(77,166,255,0.55)" : "rgba(255,94,94,0.55)");
      grad.addColorStop(1, blue ? "rgba(77,166,255,0.25)" : "rgba(255,94,94,0.25)");
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

      // 中心小圆点（更高不透明度）
      ctx.globalAlpha = Math.min(1, alpha + 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
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

    // 1. osu! 官方行为：每次按键先播放 don/ka 按键反馈音（空按也有声）
    //    反馈音不受冷却限制，连打时每次按键都应发声
    this.playTaikoFeedback(blue);

    // 2. 冷却：同侧在 40ms 内只能触发一次判定（防止键盘自动重复事件导致多次判定）
    if (time - this.lastHitTime[side] < this.HIT_COOLDOWN) return;

    // 3. 命中目标：普通音符必须颜色匹配；大音符任意一侧都可命中
    const best = this.findHitTarget(
      time,
      (obj) => !obj.judged && (this.isBig(obj) || this.isBlue(obj) === blue),
      (obj) => Math.abs(time - obj.time),
    );
    if (!best) return;

    // 4. 必须落在实际判定窗口内，防止一次点击误判远处的音符
    if (Math.abs(time - best.time) > this.windows["50"]) return;

    this.lastHitTime[side] = time;
    const j = this.judgeHit(best, time);
    this.spawnHitEffect(this.judgePos, this.crossPos, j, time);
  }

  /** 播放 don/ka 按键反馈音：优先皮肤/谱面采样，无采样则合成默认音效 */
  private playTaikoFeedback(blue: boolean): void {
    if (this.hitSoundVolume <= 0) return;
    const { set } = this.getSampleAt(this.currentTime);
    const setName = ["", "normal", "soft", "drum"][set] || "normal";

    const pickUrl = (names: string[]): string | undefined => {
      for (const n of names) {
        const url = this.findSampleUrl(n);
        if (url) return url;
      }
      return undefined;
    };

    const url = blue
      ? pickUrl([
          `taiko-${setName}-hitwhistle`,
          `taiko-${setName}-hitclap`,
          `taiko-hitwhistle`,
          `taiko-hitclap`,
          `${setName}-hitwhistle`,
          `${setName}-hitclap`,
          "normal-hitwhistle",
          "normal-hitclap",
        ])
      : pickUrl([
          `taiko-${setName}-hitnormal`,
          `taiko-hitnormal`,
          `${setName}-hitnormal`,
          "normal-hitnormal",
        ]);

    if (url) {
      this.playSampleUrl(url);
    } else {
      this.playDefaultHitSound(blue, false);
    }
  }

  /** Taiko 命中附加音效：只处理大音符的 finish 叠加，普通 don/ka 已在按键反馈中播放 */
  protected playHitSound(obj: HitObject): void {
    if (this.hitSoundVolume <= 0) return;
    const blue = this.isBlue(obj);
    const big = this.isBig(obj);
    if (!big) return;

    const { set } = this.getSampleAt(obj.time);
    const setName = ["", "normal", "soft", "drum"][set] || "normal";

    const pickUrl = (names: string[]): string | undefined => {
      for (const n of names) {
        const url = this.findSampleUrl(n);
        if (url) return url;
      }
      return undefined;
    };

    const finishUrl = pickUrl([
      `taiko-${setName}-hitfinish`,
      `taiko-hitfinish`,
      `${setName}-hitfinish`,
      "normal-hitfinish",
    ]);

    if (finishUrl) {
      this.playSampleUrl(finishUrl);
    } else {
      // 无 finish 采样：用默认合成音叠加一层更深的共鸣
      this.playDefaultHitSound(blue, true);
    }
  }

  protected handlePointerDown(x: number, _y: number): void {
    if (this.status !== "playing") return;
    // 在用户手势中统一解锁音频，确保移动端 Web Audio / HTMLAudio 都能发声
    this.unlockAudio();
    // 屏幕左半边 = KAT（蓝），右半边 = DON（红）
    this.tryHit(x < this.ctx.width / 2);
    // 按下反馈位置
    this.pressCursor(this.currentTime);
  }

  protected handlePointerMove = (): void => {};
  protected handlePointerUp = (): void => {};

  protected handleKeyDown(key: string): void {
    const k = key.toLowerCase();
    const [katL, katR, donL, donR] = this.keyBindings.taiko;
    if (k === katL || k === katR) {
      this.unlockAudio();
      this.tryHit(true); // KAT（蓝）
    } else if (k === donL || k === donR) {
      this.unlockAudio();
      this.tryHit(false); // DON（红）
    }
  }
  protected handleKeyUp = (): void => {};
}
