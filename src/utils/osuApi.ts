/** osu! 官方 API v1 导入。浏览器直连存在 CORS 限制，经公共代理转发。 */

export interface OsuUserProfile {
  userId: number;
  username: string;
  country: string;
  level: number;
  levelProgress: number; // 0-1
  accuracy: number; // 0-100
  playCount: number;
  totalScore: number;
  rankedScore: number;
  pp: number;
  globalRank: number;
  countryRank: number;
  countSS: number;
  countS: number;
  countA: number;
  /** 头像 URL（osu! 官方 CDN a.ppy.sh） */
  avatarUrl: string;
  /** Profile 背景 cover URL（取 top play 的 beatmap cover） */
  coverUrl: string;
  importedAt: number;
}

const API_BASE = "https://osu.ppy.sh/api";
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

async function fetchWithProxies(url: string, timeoutMs = 12000): Promise<Response> {
  // 先直连，失败依次走代理
  const attempts = [url, ...CORS_PROXIES.map((p) => p(url))];
  let lastErr: unknown;
  for (const target of attempts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(target, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("请求失败");
}

/** 拼接 osu! 官方头像 URL */
export function buildOsuAvatarUrl(userId: number): string {
  return `https://a.ppy.sh/${userId}`;
}

/** 用 beatmapset_id 拼接 osu! 官方 cover URL */
export function buildBeatmapCoverUrl(beatmapsetId: number): string {
  return `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover.jpg`;
}

/**
 * 获取用户最佳成绩（取 top 1 用于 profile 背景）。
 * 失败返回 null，不影响主流程。
 */
async function fetchTopPlayCover(apiKey: string, userId: number): Promise<string> {
  try {
    const url = `${API_BASE}/get_user_best?k=${apiKey}&u=${userId}&type=id&limit=1`;
    const res = await fetchWithProxies(url, 10000);
    const data = (await res.json()) as Array<Record<string, string>>;
    if (!Array.isArray(data) || data.length === 0) return "";
    const beatmapsetId = Number(data[0].beatmapset_id);
    if (!Number.isFinite(beatmapsetId) || beatmapsetId <= 0) return "";
    return buildBeatmapCoverUrl(beatmapsetId);
  } catch {
    return "";
  }
}

/**
 * 通过 API key + 用户名导入 osu! 官方资料。
 * 返回归一化后的 profile（含头像与背景 cover）。
 */
export async function fetchOsuUser(apiKey: string, username: string): Promise<OsuUserProfile> {
  const key = apiKey.trim();
  const user = encodeURIComponent(username.trim());
  if (!key || !user) throw new Error("缺少 API key 或用户名");

  const url = `${API_BASE}/get_user?k=${key}&u=${user}&type=string`;
  const res = await fetchWithProxies(url);
  const data = (await res.json()) as Array<Record<string, string>>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("未找到该用户");
  }
  const u = data[0];
  const num = (v: string, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  const userId = num(u.user_id);
  const avatarUrl = buildOsuAvatarUrl(userId);

  // 并行拉取 top play cover 作为 profile 背景
  const coverUrl = await fetchTopPlayCover(key, userId);

  return {
    userId,
    username: u.username,
    country: u.country,
    level: num(u.level),
    levelProgress: num(u.level) - Math.floor(num(u.level)),
    accuracy: num(u.accuracy),
    playCount: num(u.playcount),
    totalScore: num(u.total_score),
    rankedScore: num(u.ranked_score),
    pp: Math.round(num(u.pp_raw) * 100) / 100,
    globalRank: num(u.pp_rank),
    countryRank: num(u.pp_country_rank),
    countSS: num(u.count_rank_ss),
    countS: num(u.count_rank_s),
    countA: num(u.count_rank_a),
    avatarUrl,
    coverUrl,
    importedAt: Date.now(),
  };
}
