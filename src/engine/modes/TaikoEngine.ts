/** osu!taiko 引擎 - 重构后的扁平现代视觉
 *  - 音符始终水平从右向左飞入判定圈
 *  - 横屏：轨道居中；竖屏：轨道靠上
 *  - 打击点改为空心圆环，不遮挡后方音符
 *  - 底部绘制虚拟太鼓作为操作区
 *  - 支持 Don（红/鼓面）与 Katsu（蓝/鼓边）
 */
import type { HitObject, Judgement } from "@/types";
import { GameEngine, type EngineOptions } from "../GameEngine";
import { drawRect, drawRing, clamp } from "../renderer/Canvas2D";
import { applyBonus } from "../Judger";

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

  // === 滚奏（slider = drumroll）/ 连打（spinner = denden）===
  /** 当前正在累计敲击的滚奏或连打对象 */
  private rollTarget: HitObject | null = null;
  /** 当前滚奏/连打已敲击次数 */
  private rollHits = 0;
  /** 单次滚奏敲击得分（官方 taiko 口径：每击固定加分，不计入准确率） */
  private readonly ROLL_HIT_SCORE = 100;
  /** Auto 模式下滚奏自动敲击的间隔（ms） */
  private readonly AUTO_ROLL_INTERVAL = 60;
  private lastAutoRollHit = -Infinity;

  constructor(opts: EngineOptions) {
    super(opts);
    this.computeLayout();
  }

  protected resetState(): void {
    super.resetState();
    this.computeLayout();
    this.lastHitTime = [-Infinity, -Infinity];
    this.rollTarget = null;
    this.rollHits = 0;
    this.lastAutoRollHit = -Infinity;
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
      // 滚奏 / 连打是「一段时间」而不是一个打击点：整段期间都要能继续敲击，
      // 因此不做单点窗口的 miss 判定，只在结束时间到达时统一结算。
      if (this.isRoll(obj)) {
        if (time < obj.time) break; // 还没开始，后面的物件只会更晚
        if (time >= this.rollEnd(obj)) this.finishRoll(obj);
        continue;
      }
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

  /** 该物件是否为滚奏（slider）或连打（spinner） */
  private isRoll(obj: HitObject): boolean {
    return obj.type === "slider" || obj.type === "spinner";
  }

  /** 滚奏 / 连打的结束时间 */
  private rollEnd(obj: HitObject): number {
    return obj.endTime ?? obj.time;
  }

  /** 连打的敲击次数要求：按持续时间估算（官方约每 100ms 一次），最少 3 次 */
  private spinnerRequiredHits(obj: HitObject): number {
    const duration = Math.max(0, this.rollEnd(obj) - obj.time);
    return Math.max(3, Math.round(duration / 100));
  }

  /** 取得当前时间点正在进行、且尚未结算的滚奏 / 连打 */
  private activeRoll(time: number): HitObject | null {
    const objs = this.beatmap.hitObjects;
    for (let i = this.activeIndex; i < objs.length; i++) {
      const obj = objs[i];
      if (obj.time > time) return null;
      if (!this.isRoll(obj) || obj.judged) continue;
      if (time >= obj.time && time < this.rollEnd(obj)) return obj;
    }
    return null;
  }

  /** 记录一次滚奏 / 连打敲击（切换目标时重新计数） */
  private registerRollHit(obj: HitObject): number {
    if (this.rollTarget !== obj) {
      this.rollTarget = obj;
      this.rollHits = 0;
    }
    this.rollHits++;
    obj._rollHits = this.rollHits;
    return this.rollHits;
  }

  /** 滚奏 / 连打敲击奖励：加分与连击，不改动准确率与血量 */
  private rewardRollHit(time: number): void {
    this.score = applyBonus(this.score, this.ROLL_HIT_SCORE, true);
    this.spawnHitEffect(this.judgePos, this.crossPos, "300", time);
  }

  /** 结算滚奏 / 连打 */
  private finishRoll(obj: HitObject): void {
    if (obj.judged) return;
    const hits = this.rollTarget === obj ? this.rollHits : 0;
    obj.judged = true;
    obj._rollHits = hits;

    if (obj.type === "spinner") {
      // 连打（denden）：按完成度给判定，未达标算 miss（与官方一致，会断连击）
      const need = this.spinnerRequiredHits(obj);
      const ratio = need > 0 ? hits / need : 1;
      const j: Judgement = ratio >= 1 ? "300" : ratio >= 0.5 ? "100" : "miss";
      obj.judgement = j;
      this.submitJudgement(j);
    } else {
      // 滚奏（drumroll）：敲过即有判定，但官方不计入准确率，因此不提交判定，
      // 只把结果写在物件上供回放 / 结算展示使用。
      obj.judgement = hits > 0 ? "300" : "miss";
    }

    this.rollTarget = null;
    this.rollHits = 0;
  }

  /** 时钟跳变跨过滚奏 / 连打时：按已敲击次数结算，不当作普通 miss */
  protected settleSkippedObject(obj: HitObject, time: number): void {
    if (this.isRoll(obj)) {
      this.finishRoll(obj);
      return;
    }
    super.settleSkippedObject(obj, time);
  }

  private autoPlay(time: number): void {
    // 滚奏 / 连打：Auto 模式下按固定间隔自动敲击（官方 Auto 也是连续敲满）
    const roll = this.activeRoll(time);
    if (roll) {
      if (time - this.lastAutoRollHit >= this.AUTO_ROLL_INTERVAL) {
        this.lastAutoRollHit = time;
        const hits = this.registerRollHit(roll);
        this.rewardRollHit(time);
        this.playTaikoFeedback(hits % 2 === 1);
      }
      this.cursorTargetX = this.judgePos;
      this.cursorTargetY = this.crossPos;
      return;
    }

    const win300 = this.windows["300"];
    const best = this.findHitTarget(
      time,
      (obj) => !this.isRoll(obj),
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
      // 滚奏 / 连打是「一段」而不是一个打击点，另有条状渲染，不走音符绘制
      if (this.isRoll(obj)) continue;
      if (obj.judged && obj.judgement !== "miss") continue;
      const dt = obj.time - time;
      if (dt > APPROACH_TIME) continue;
      if (dt < -350 && obj.judged) continue;
      const x = this.noteFlow(obj, time);
      const y = this.crossPos;
      this.drawNote(x, y, obj, time);
    }

    this.drawRolls(time);
    this.drawJudgeCircle();
    this.drawHitHint();
    // 统一走基类前景层：命中特效 + 判定弹字 + BREAK 休息段 + Flashlight 遮罩。
    // 原先这里只手动调了前两项，导致 Flashlight 在 taiko 下完全没有视觉表现。
    this.renderForeground(time);
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

  /** 滚奏（drumroll）与连打（denden）的条状渲染 */
  private drawRolls(time: number): void {
    const objs = this.beatmap.hitObjects;
    for (let i = this.activeIndex; i < objs.length; i++) {
      const obj = objs[i];
      if (!this.isRoll(obj)) continue;
      if (time - this.rollEnd(obj) > 220) continue;  // 结束太久，不再绘制
      if (obj.time - time > APPROACH_TIME) break;    // 还没进场，后面的只会更晚
      this.drawRoll(obj, time);
    }
  }

  private drawRoll(obj: HitObject, time: number): void {
    const { ctx, width } = this.ctx;
    const end = this.rollEnd(obj);
    const isSpinner = obj.type === "spinner";
    const y = this.crossPos;
    const x0 = this.judgePos;
    const span = width + NOTE_R - this.judgePos;
    const w = Math.max(28, clamp((end - time) / APPROACH_TIME, 0, 1) * span);
    const h = isSpinner ? 30 : 20;
    const started = time >= obj.time;
    const done = time >= end;
    const total = Math.max(1, end - obj.time);
    const progress = clamp((time - obj.time) / total, 0, 1);
    const hits = obj._rollHits ?? 0;

    ctx.save();
    ctx.globalAlpha = done ? clamp(1 - (time - end) / 220, 0, 1) : 0.92;

    // 轨道底
    drawRect(this.ctx, x0, y - h / 2, w, h, "rgba(255,255,255,0.14)", h / 2);
    // 已进行的部分
    if (started) {
      drawRect(
        this.ctx, x0, y - h / 2, w * progress, h,
        isSpinner ? "rgba(255,208,61,0.55)" : "rgba(255,255,255,0.45)",
        h / 2,
      );
    }
    // 描边（圆角矩形）
    ctx.strokeStyle = isSpinner ? COLOR_GOLD : "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x0 + r, y - r);
    ctx.lineTo(x0 + w - r, y - r);
    ctx.arcTo(x0 + w, y - r, x0 + w, y, r);
    ctx.arcTo(x0 + w, y + r, x0 + w - r, y + r, r);
    ctx.lineTo(x0 + r, y + r);
    ctx.arcTo(x0, y + r, x0, y, r);
    ctx.arcTo(x0, y - r, x0 + r, y - r, r);
    ctx.closePath();
    ctx.stroke();

    // 敲击计数：连打显示「已敲 / 需要」
    ctx.font = `700 13px ${this.fontStack}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(
      isSpinner ? `${hits} / ${this.spinnerRequiredHits(obj)}` : `${hits}`,
      x0 + w - 10,
      y,
    );
    ctx.restore();
  }

  /** 音符：优先使用皮肤纹理（taikohitcircle / taikobigcircle），无皮肤则 Canvas 原语 */
  private drawNote(x: number, y: number, obj: HitObject, time: number): void {
    const blue = this.isBlue(obj);
    const big = this.isBig(obj);
    const r = big ? NOTE_R * 1.32 : NOTE_R;
    const color = blue ? COLOR_BLUE : COLOR_RED;
    const dt = obj.time - time;
    let alpha = clamp(1 - dt / APPROACH_TIME, 0.55, 1);
    // Hidden Mod：音符越接近判定圈越淡，抵达判定圈前完全消失（官方 taiko 的 Hidden 行为）
    if (this.modHidden) {
      const approach = 1 - clamp(dt / APPROACH_TIME, 0, 1); // 0=刚进场，1=正好到判定圈
      if (approach > 0.65) alpha *= clamp(1 - (approach - 0.65) / 0.35, 0, 1);
    }
    if (alpha <= 0.01) return;
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
      // 边框宽度跟随设置项 skin.circleBorderWidth（原先该设置只被存字段、从未参与绘制）
      ctx.lineWidth = (big ? 5 : 4) * this.circleBorderWidth;
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

    // 3. 滚奏 / 连打进行中：敲击计入滚奏，不消耗普通音符（官方 taiko 行为）
    const roll = this.activeRoll(time);
    if (roll) {
      this.lastHitTime[side] = time;
      this.registerRollHit(roll);
      this.rewardRollHit(time);
      return;
    }

    // 4. 命中目标：普通音符必须颜色匹配；大音符任意一侧都可命中
    const best = this.findHitTarget(
      time,
      (obj) => !obj.judged && !this.isRoll(obj) && (this.isBig(obj) || this.isBlue(obj) === blue),
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
