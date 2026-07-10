/** 歌词获取统一入口 */

import { fetchLrclibLyrics, type LyricLine } from "./lrclibLyrics";

export type { LyricLine } from "./lrclibLyrics";

export async function fetchLyrics(
  title: string,
  artist: string,
): Promise<LyricLine[]> {
  const trimmedTitle = title?.trim() || "";
  const trimmedArtist = artist?.trim() || "";
  if (!trimmedTitle && !trimmedArtist) return [];
  return fetchLrclibLyrics(trimmedTitle, trimmedArtist);
}
