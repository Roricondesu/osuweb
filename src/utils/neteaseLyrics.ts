/** 网易云歌词获取与解析（用于游戏内歌词显示） */

export interface LyricLine {
  time: number; // ms
  text: string;
}

const NETEASE_SEARCH = "https://music.163.com/api/search/get/web";
const NETEASE_LYRIC = "https://music.163.com/api/song/lyric";

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

async function searchSong(title: string, artist: string): Promise<number | null> {
  const keyword = `${title} ${artist}`.trim();
  const params = new URLSearchParams({
    s: keyword,
    type: "1",
    offset: "0",
    total: "true",
    limit: "10",
  });
  const res = await fetch(`${NETEASE_SEARCH}?${params.toString()}`);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: { songs?: { id: number; name: string; artists?: { name: string }[] }[] };
  };
  const songs = json.result?.songs || [];
  if (songs.length === 0) return null;

  // 简单匹配：优先找标题和艺人同时包含的
  const lowerTitle = title.toLowerCase();
  const lowerArtist = artist.toLowerCase();
  const scored = songs.map((s) => {
    const name = s.name.toLowerCase();
    const artists = (s.artists || []).map((a) => a.name.toLowerCase()).join(" ");
    let score = 0;
    if (name.includes(lowerTitle)) score += 2;
    if (lowerTitle.includes(name)) score += 1;
    if (artists.includes(lowerArtist)) score += 2;
    if (lowerArtist.includes(artists)) score += 1;
    return { id: s.id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

export async function fetchNeteaseLyrics(
  title: string,
  artist: string,
): Promise<LyricLine[]> {
  try {
    const id = await searchSong(title, artist);
    if (!id) return [];
    const params = new URLSearchParams({
      id: String(id),
      lv: "1",
      kv: "1",
      tv: "-1",
    });
    const res = await fetch(`${NETEASE_LYRIC}?${params.toString()}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { lrc?: { lyric?: string }; tlyric?: { lyric?: string } };
    const lyricText = json.lrc?.lyric || "";
    if (!lyricText) return [];
    return parseLrc(lyricText);
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
