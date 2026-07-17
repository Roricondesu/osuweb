import type { Judgement, ModType, GameMode } from "@/types";

/** osu! 评级（SSH/SH 为 HD/FL 下的银色 SS/S） */
export type Grade = "SS" | "SSH" | "S" | "SH" | "A" | "B" | "C" | "D" | "F";

export interface PPInput {
  mode: GameMode;
  /** 谱面总星级（来自 API） */
  stars: number;
  /** 谱面最大可达 combo（近似：combo 给予物件数） */
  beatmapMaxCombo: number;
  ar: number;
  od: number;
  /** 玩家成绩 */
  counts: Record<Judgement, number>;
  maxCombo: number;
  mods: ModType[];
  /** 是否通过（health > 0） */
  passed: boolean;
}

/** 官方准确率：分母包含 miss（按 0 分计） */
export function officialAccuracy(counts: Record<Judgement, number>): number {
  const c300 = counts["300"] || 0;
  const c100 = counts["100"] || 0;
  const c50 = counts["50"] || 0;
  const miss = counts.miss || 0;
  const denom = 300 * (c300 + c100 + c50 + miss);
  if (denom === 0) return 0;
  return ((50 * c50 + 100 * c100 + 300 * c300) / denom) * 100;
}

/** 计算评级（osu!standard 规则，HD/FL 为银色） */
export function calculateGrade(counts: Record<Judgement, number>, mods: ModType[], passed: boolean): Grade {
  if (!passed) return "F";
  const acc = officialAccuracy(counts);
  const silver = mods.includes("hidden") || mods.includes("flashlight");
  if (acc >= 100) return silver ? "SSH" : "SS";
  if (acc >= 95) return silver ? "SH" : "S";
  if (acc >= 90) return "A";
  if (acc >= 80) return "B";
  if (acc >= 70) return "C";
  return "D";
}

export const GRADE_COLOR: Record<Grade, string> = {
  SS: "#ffd60a",
  SSH: "#e0e0e0",
  S: "#ff9100",
  SH: "#cfcfcf",
  A: "#66cc44",
  B: "#0a84ff",
  C: "#9966ff",
  D: "#ff375f",
  F: "#666666",
};

/** Mod → 乘数因子 */
function modMultiplier(mods: ModType[]): number {
  let m = 1;
  if (mods.includes("doubleTime")) m *= 1.1;
  if (mods.includes("halfTime")) m *= 0.5;
  if (mods.includes("easy")) m *= 0.5;
  if (mods.includes("hardRock")) m *= 1.06;
  if (mods.includes("flashlight")) m *= 1.12;
  if (mods.includes("hidden")) m *= 1.06;
  if (mods.includes("suddenDeath")) m *= 1;
  return m;
}

/**
 * 计算 osu!standard 的 pp 值。
 *
 * 说明：项目未实现完整的难度计算器（aim/speed 分项星级无法从 .osu 实时算出），
 * 这里用总星级近似拆分 aim/speed，配合官方 pp 公式给出合理量级的 pp。
 * 完整公式参考 osu! wiki: Performance points / osu!standard。
 *
 * 非 standard 模式返回 0（暂不支持 Taiko/Catch/Mania 的 pp）。
 */
export function calculatePP(input: PPInput): number {
  const { mode, stars, beatmapMaxCombo, ar, counts, maxCombo, mods, passed } = input;
  if (mode !== "standard") return 0;
  if (!passed) return 0;

  const c300 = counts["300"] || 0;
  const c100 = counts["100"] || 0;
  const c50 = counts["50"] || 0;
  const miss = counts.miss || 0;
  const totalHits = c300 + c100 + c50 + miss;
  if (totalHits === 0) return 0;

  // 近似拆分 aim / speed 星级（无完整难度计算器）
  const aimStars = Math.max(0, stars * 0.85);
  const speedStars = Math.max(0, stars * 0.62);

  const hasHD = mods.includes("hidden");
  const hasFL = mods.includes("flashlight");
  const hasDT = mods.includes("doubleTime");
  const hasHR = mods.includes("hardRock");

  // AR 受 HR/DT 影响
  let effectiveAR = ar;
  if (hasHR) effectiveAR = Math.min(10, ar * 1.4);
  if (hasDT) effectiveAR = Math.min(10.67, ar * 1.5);

  // OD 受 mod 影响（影响 acc 组件略，这里主要影响难度乘数）
  const multiplier = modMultiplier(mods);

  const lengthBonus =
    0.95 + 0.4 * Math.min(1, totalHits / 2000) + (totalHits > 2000 ? 0.5 * Math.log10(totalHits / 2000) : 0);

  const comboRatio =
    beatmapMaxCombo > 0 ? Math.min(1, Math.pow(maxCombo, 0.8) / Math.pow(beatmapMaxCombo, 0.8)) : 1;

  const arBonus =
    effectiveAR > 10.33 ? 1 + 0.45 * (effectiveAR - 10.33) : 1 + 0.1 * Math.min(1, totalHits / 2000);

  const hdBonus = hasHD ? 1 + 0.04 * (12 - effectiveAR) : 1;
  const missPenalty = Math.pow(0.97, miss);

  // --- Aim ---
  let aimValue = Math.pow(Math.max(1, aimStars / 0.0675) * 5 - 4, 3) / 100000;
  aimValue *= lengthBonus;
  aimValue *= missPenalty;
  aimValue *= comboRatio;
  aimValue *= arBonus;
  aimValue *= hdBonus;

  // --- Speed ---
  let speedValue = Math.pow(Math.max(1, speedStars / 0.0675) * 5 - 4, 3) / 100000;
  speedValue *= lengthBonus;
  speedValue *= missPenalty;
  speedValue *= comboRatio;
  speedValue *= arBonus;
  speedValue *= hdBonus;
  // 低物件数削弱 speed
  if (totalHits < 200) {
    speedValue *= 0.5 + 0.5 * (totalHits / 200);
  }

  // --- Accuracy ---
  const passedHits = totalHits - miss;
  let accValue = 0;
  if (passedHits > 0) {
    const betterAcc = Math.min(
      99.99,
      (100 * (c300 * 6 + c100 * 2 + c50)) / (2 * passedHits),
    );
    accValue = Math.pow(1.52163, betterAcc / 50) - 0.9994;
    accValue *= Math.min(1.15, Math.pow(beatmapMaxCombo / 1000, 0.3));
    if (accValue < 0) accValue = 0;
    accValue *= lengthBonus;
    if (hasHD) accValue *= 1.08;
    if (hasFL) accValue *= 1.02;
  }

  // --- Flashlight ---
  let flashlightValue = 0;
  if (hasFL) {
    flashlightValue = 26.25 * (1 - Math.pow(0.998, totalHits));
    flashlightValue *= comboRatio;
    if (effectiveAR > 10.33) flashlightValue *= 1 + 0.45 * (effectiveAR - 10.33);
  }

  const total =
    Math.pow(aimValue, 1.1) +
    Math.pow(speedValue, 1.1) +
    Math.pow(accValue, 1.1) +
    Math.pow(flashlightValue, 1.1);

  const pp = Math.pow(total, 1 / 1.1) * multiplier;
  return Math.max(0, Math.round(pp * 100) / 100);
}

/**
 * osu! 官方总 pp 算法：按 pp 降序排列，每条成绩权重 0.95^(排名-1)。
 * 仅取通过的成绩。
 */
export function calculateWeightedTotalPP(ppList: number[]): number {
  if (ppList.length === 0) return 0;
  const sorted = [...ppList].sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i] * Math.pow(0.95, i);
  }
  return Math.round(sum * 100) / 100;
}

/** 单条成绩对总 pp 的贡献值（用于展示） */
export function ppContribution(pp: number, rankIndex: number): number {
  return Math.round(pp * Math.pow(0.95, rankIndex) * 100) / 100;
}
