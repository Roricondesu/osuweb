/** LRCLIB 开源歌词获取 */

export interface LyricLine {
  time: number; // ms
  text: string;
}

const LRCLIB_SEARCH = "https://lrclib.net/api/search";

function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split(/\r?\n/);
  const out: LyricLine[] = [];
  const timeRe = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/;
  for (const line of lines) {
    const m = line.match(timeRe);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const text = m[3].trim();
    if (!text) continue;
    out.push({ time: Math.round((min * 60 + sec) * 1000), text });
  }
  return out.sort((a, b) => a.time - b.time);
}

interface LrcLibResult {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export async function fetchLrclibLyrics(title: string, artist: string): Promise<LyricLine[]> {
  try {
    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    const res = await fetch(`${LRCLIB_SEARCH}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const results = (await res.json()) as LrcLibResult[];
    if (!Array.isArray(results) || results.length === 0) return [];

    // 优先同步歌词，没有则尝试普通歌词
    const best = results[0];
    const text = best.syncedLyrics || best.plainLyrics || "";
    if (!text) return [];
    return parseLrc(text);
  } catch {
    return [];
  }
}

/** 根据当前时间获取当前歌词行 */
export function getCurrentLyric(lines: LyricLine[], time: number): LyricLine | null {
  if (lines.length === 0) return null;
  let best: LyricLine = lines[0];
  for (const line of lines) {
    if (line.time <= time) best = line;
    else break;
  }
  return best;
}
