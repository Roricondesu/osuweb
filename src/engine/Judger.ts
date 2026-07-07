import type { Judgement } from "@/types";

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

/** 准确率权重 */
export const ACC_WEIGHT: Record<Judgement, number> = {
  "300": 1,
  "100": 0.66,
  "50": 0.33,
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

/** 应用一次判定到分数状态 */
export const applyJudgement = (
  state: ScoreState,
  j: Judgement,
  comboBonus: number = 1,
): ScoreState => {
  const next: ScoreState = {
    ...state,
    judgements: { ...state.judgements },
  };
  next.judgements[j] = (next.judgements[j] || 0) + 1;
  if (j === "miss") {
    next.combo = 0;
    next.health = Math.max(0, next.health - 8);
  } else {
    next.combo = state.combo + 1;
    next.maxCombo = Math.max(state.maxCombo, next.combo);
    next.score += SCORE_VALUE[j] + next.combo * comboBonus;
    next.health = Math.min(100, next.health + (j === "300" ? 2 : j === "100" ? 1 : 0.3));
  }
  // 重新计算准确率
  const total = next.judgements["300"] + next.judgements["100"] + next.judgements["50"] + next.judgements.miss;
  if (total > 0) {
    const accSum =
      next.judgements["300"] * ACC_WEIGHT["300"] +
      next.judgements["100"] * ACC_WEIGHT["100"] +
      next.judgements["50"] * ACC_WEIGHT["50"];
    next.accuracy = (accSum / total) * 100;
  }
  return next;
};
