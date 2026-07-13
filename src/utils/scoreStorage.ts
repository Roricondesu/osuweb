import type { ScoreRecord } from "@/types";

const STORAGE_KEY = "osurhythm-scores";

function readScores(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScores(scores: ScoreRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // 存储空间不足时静默失败
  }
}

export function saveScore(record: ScoreRecord): void {
  const scores = readScores();
  scores.unshift(record);
  // 限制存储条数，避免 localStorage 膨胀
  if (scores.length > 500) scores.length = 500;
  writeScores(scores);
}

export function loadScores(): ScoreRecord[] {
  return readScores();
}

export function getScoresForBeatmap(setId: number, beatmapId: number): ScoreRecord[] {
  return readScores().filter((r) => r.setId === setId && r.beatmapId === beatmapId);
}

export function deleteScore(id: string): void {
  const scores = readScores().filter((r) => r.id !== id);
  writeScores(scores);
}

/** 获取某谱面的最佳成绩（按分数降序，无则 undefined） */
export function getBestScore(setId: number, beatmapId: number): ScoreRecord | undefined {
  const list = getScoresForBeatmap(setId, beatmapId);
  if (list.length === 0) return undefined;
  return list.reduce((best, cur) => (cur.score > best.score ? cur : best), list[0]);
}
