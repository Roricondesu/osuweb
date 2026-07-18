/** 检测各 API 可用性 */

export interface ApiHealthResult {
  osuDirect: boolean;
  sayobotSearch: boolean;
  sayobotDownload: boolean;
  nerinyan: boolean;
  lrclibLyrics: boolean;
}

const OSU_DIRECT_HOST = "https://osu.direct/api/v2";
const SAYOBOT_LIST = "https://api.sayobot.cn/beatmaplist";
const SAYOBOT_INFO = "https://api.sayobot.cn/beatmapinfo";
const NERINYAN_SEARCH = "https://api.nerinyan.moe/search";
const LRCLIB_SEARCH = "https://lrclib.net/api/search";

async function check(url: string, timeout = 8000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkApiHealth(): Promise<ApiHealthResult> {
  const [osuDirect, sayobotSearch, sayobotDownload, nerinyan, lrclibLyrics] = await Promise.all([
    check(`${OSU_DIRECT_HOST}/search?q=test&limit=1`),
    check(`${SAYOBOT_LIST}?0=1&1=0&2=4&3=test`),
    check(`${SAYOBOT_INFO}?1=1`),
    check(`${NERINYAN_SEARCH}?q=test&ps=1`),
    check(`${LRCLIB_SEARCH}?track_name=test&artist_name=test`),
  ]);
  return { osuDirect, sayobotSearch, sayobotDownload, nerinyan, lrclibLyrics };
}
