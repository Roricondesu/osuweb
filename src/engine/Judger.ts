import type { Judgement } from "@/types";
import { officialAccuracy } from "@/utils/ppCalculator";

/** 判定窗口（毫秒）。
 *  基于 osu!standard 的判定规则，OverallDifficulty 影响窗口宽度。
 *  这里使用相对宽松的窗口，移动端友好。
 */
export interface JudgementWindows {
  "300": number;
  "100": number;
  "50": number;
}

export const DEFAULT_WINDOWS: JudgementWindows = {
  "300": 80,    // ±80ms → 300
  "100": 140,   // ±140ms → 100
  "50": 200,    // ±200ms → 50
};

/** 根据 OD 调整判定窗口（OD 越高窗口越窄） */
export const windowsForOD = (od: number): JudgementWindows => {
  // osu! 原版：300 = 80 - 6*OD；100 = 140 - 8*OD；50 = 200 - 10*OD
  // 限制下限避免太严
  const w300 = Math.max(40, 80 - 6 * od);
  const w100 = Math.max(80, 140 - 8 * od);
  const w50 = Math.max(120, 200 - 10 * od);
  return { "300": w300, "100": w100, "50": w50 };
};

/** 判定时间差 → 评级 */
export const judgeByDelta = (delta: number, windows: JudgementWindows): Judgement => {
  const ad = Math.abs(delta);
  if (ad <= windows["300"]) return "300";
  if (ad <= windows["100"]) return "100";
  if (ad <= windows["50"]) return "50";
  return "miss";
};

/** 计分权重 */
export const SCORE_VALUE: Record<Judgement, number> = {
  "300": 300,
  "100": 100,
  "50": 50,
  miss: 0,
};

/** 准确率权重（官方口径：300=1、100=1/3、50=1/6、miss=0）。
 *  仅作说明用途，实际计算统一走 `officialAccuracy`，避免两套口径分叉。 */
export const ACC_WEIGHT: Record<Judgement, number> = {
  "300": 1,
  "100": 1 / 3,
  "50": 1 / 6,
  miss: 0,
};

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  judgements: { "300": number; "100": number; "50": number; miss: number };
  health: number; // 0-100
}

export const createInitialScore = (): ScoreState => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  accuracy: 100,
  judgements: { "300": 0, "100": 0, "50": 0, miss: 0 },
  health: 100,
});

/** 只加分（可选加连击），不改动准确率 / 血量 / 判定计数。
 *  用于 taiko 滚奏与连打的敲击奖励：官方这两者每次敲击额外给分、累加连击，
 *  但不计入准确率、也不会因为没敲满而扣血。
 */
export const applyBonus = (
  state: ScoreState,
  points: number,
  addCombo = false,
): ScoreState => {
  const next: ScoreState = { ...state };
  next.score = state.score + points;
  if (addCombo) {
    next.combo = state.combo + 1;
    next.maxCombo = Math.max(state.maxCombo, next.combo);
  }
  return next;
};

/** 应用一次判定到分数状态
 *  hp 参数（0-10）影响扣血/回血幅度，对应谱面 HPDrainRate
 */
export const applyJudgement = (
  state: ScoreState,
  j: Judgement,
  comboBonus: number = 1,
  hp: number = 5,
): ScoreState => {
  const next: ScoreState = {
    ...state,
    judgements: { ...state.judgements },
  };
  next.judgements[j] = (next.judgements[j] || 0) + 1;
  if (j === "miss") {
    next.combo = 0;
    // miss 扣血随 HP 增大而增大
    const missDrain = Math.max(3, 4 + hp * 0.6);
    next.health = Math.max(0, next.health - missDrain);
  } else {
    next.combo = state.combo + 1;
    next.maxCombo = Math.max(state.maxCombo, next.combo);
    next.score += SCORE_VALUE[j] + next.combo * comboBonus;
    // 命中回血随 HP 增大而减小（高 HP 谱面回血慢）
    const heal = Math.max(0.2, (j === "300" ? 2.4 : j === "100" ? 1.2 : 0.4) * (1 - hp * 0.05));
    next.health = Math.min(100, next.health + heal);
  }
  // 重新计算准确率。
  // 统一走 ppCalculator 的官方口径（300=1、100=1/3、50=1/6），
  // 与资料页历史成绩、calculateGrade 评级、calculatePP 保持一致。
  // 原先这里用 1/0.66/0.33 的独立权重表，导致同一份成绩在游戏内 HUD 显示
  // 66% 而结算评级按 33% 判定这类「两套口径」矛盾。
  if (next.judgements["300"] + next.judgements["100"] + next.judgements["50"] + next.judgements.miss > 0) {
    next.accuracy = officialAccuracy(next.judgements);
  }
  return next;
};
