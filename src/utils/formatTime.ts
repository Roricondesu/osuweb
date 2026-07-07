/** 时间格式化（mm:ss） */
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/** 毫秒格式化（mm:ss.mmm） */
export const formatTimeMs = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const msPart = Math.floor(ms % 1000);
  return `${m}:${s.toString().padStart(2, "0")}.${msPart.toString().padStart(3, "0")}`;
};

/** 数字加千分位 */
export const formatNumber = (n: number): string => {
  return Math.round(n).toLocaleString("en-US");
};
