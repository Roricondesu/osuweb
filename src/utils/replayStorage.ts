import type { Replay } from "@/types";

const STORAGE_KEY = "osurhythm-replays";

function readReplays(): Replay[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Replay[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReplays(replays: Replay[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replays));
  } catch {
    // 存储空间不足时静默失败
  }
}

export function saveReplay(replay: Replay): void {
  const replays = readReplays();
  const existingIndex = replays.findIndex((r) => r.id === replay.id);
  if (existingIndex >= 0) {
    replays[existingIndex] = replay;
  } else {
    replays.unshift(replay);
  }
  writeReplays(replays);
}

export function loadReplays(): Replay[] {
  return readReplays();
}

export function getReplay(id: string): Replay | undefined {
  return readReplays().find((r) => r.id === id);
}

export function deleteReplay(id: string): void {
  const replays = readReplays().filter((r) => r.id !== id);
  writeReplays(replays);
}

export function getReplaysForBeatmap(setId: number, beatmapId: number): Replay[] {
  return readReplays().filter((r) => r.setId === setId && r.beatmapId === beatmapId);
}
