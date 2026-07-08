/** 歌词获取统一入口：支持多源回退 */

import { fetchNeteaseLyrics, type LyricLine } from "./neteaseLyrics";
import { fetchLrclibLyrics } from "./lrclibLyrics";

export type LyricsSource = "auto" | "netease" | "lrclib";

export async function fetchLyrics(
  title: string,
  artist: string,
  source: LyricsSource = "auto",
): Promise<LyricLine[]> {
  const trimmedTitle = title?.trim() || "";
  const trimmedArtist = artist?.trim() || "";
  if (!trimmedTitle && !trimmedArtist) return [];

  if (source === "netease") return fetchNeteaseLyrics(trimmedTitle, trimmedArtist);
  if (source === "lrclib") return fetchLrclibLyrics(trimmedTitle, trimmedArtist);

  // auto：先网易云，没有再用 LRCLIB
  const netease = await fetchNeteaseLyrics(trimmedTitle, trimmedArtist);
  if (netease.length > 0) return netease;
  return fetchLrclibLyrics(trimmedTitle, trimmedArtist);
}
