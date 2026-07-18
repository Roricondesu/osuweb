// 测试 Nerinyan 搜索功能（独立可执行，无需浏览器）
// 使用方法：node scripts/test-nerinyan.mjs
//
// 模拟 src/api/osuDirect.ts 中 searchNerinyan 的实现：
//   1. 构造与 Nerinyan 前端一致的 apiJson
//   2. UTF-8 安全的 base64 编码（用 TextEncoder）
//   3. 请求 https://api.nerinyan.moe/search?b64=...&ps=...
//   4. 验证返回结果包含 storyboard / video 字段

const NERINYAN_API = "https://api.nerinyan.moe";

const buildPayload = (query, mode) => ({
  query,
  mode: mode != null ? String(mode) : "",
  sort: "ranked_desc",
  page: 0,
  nsfw: false,
  extra: "",
  ranked: "",
  option: "",
  totalLength: { min: 0, max: 0 },
  maxCombo: { min: 0, max: 0 },
  difficultyRating: { min: 0, max: 0 },
  accuracy: { min: 0, max: 0 },
  ar: { min: 0, max: 0 },
  cs: { min: 0, max: 0 },
  drain: { min: 0, max: 0 },
  bpm: { min: 0, max: 0 },
});

const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa === undefined
    ? Buffer.from(bytes).toString("base64")
    : btoa(binary);
};

const searchNerinyan = async (query, mode, limit) => {
  const b64 = utf8ToBase64(JSON.stringify(buildPayload(query, mode)));
  const url = `${NERINYAN_API}/search?b64=${encodeURIComponent(b64)}&ps=${limit}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 osu-web test" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// 等价于 mapBeatmapSet 的最小提取，便于人工核对
const extract = (s) => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  storyboard: s.storyboard,
  video: s.video,
  bpm: s.bpm,
  beatmaps: (s.beatmaps || []).map((b) => ({
    id: b.id,
    mode: b.mode,
    diff: b.difficulty_rating,
    version: b.version,
  })),
});

const main = async () => {
  console.log("=== Test 1: search 'YOASOBI Songs Mapset' ===");
  const r1 = await searchNerinyan("YOASOBI Songs Mapset", undefined, 10);
  console.log(`  count=${r1.length}`);
  for (const s of r1.slice(0, 3)) {
    const ex = extract(s);
    console.log(
      `  id=${ex.id} title="${ex.title}" artist="${ex.artist}" sb=${ex.storyboard} video=${ex.video} bpm=${ex.bpm}`,
    );
  }

  console.log("\n=== Test 2: search 'HoneyWorks' ===");
  const r2 = await searchNerinyan("HoneyWorks", undefined, 10);
  console.log(`  count=${r2.length}`);
  for (const s of r2.slice(0, 3)) {
    const ex = extract(s);
    console.log(
      `  id=${ex.id} title="${ex.title}" artist="${ex.artist}" sb=${ex.storyboard} video=${ex.video} bpm=${ex.bpm}`,
    );
  }

  console.log("\n=== Test 3: search 'LiSA' mode=0 (osu!) ===");
  const r3 = await searchNerinyan("LiSA", 0, 10);
  console.log(`  count=${r3.length}`);
  for (const s of r3.slice(0, 3)) {
    const ex = extract(s);
    console.log(
      `  id=${ex.id} title="${ex.title}" artist="${ex.artist}" sb=${ex.storyboard} video=${ex.video} modes=${ex.beatmaps.map((b) => b.mode).join(",")}`,
    );
  }

  console.log("\n=== Test 4: empty query (should return latest ranked) ===");
  const r4 = await searchNerinyan("", undefined, 5);
  console.log(`  count=${r4.length}`);
  for (const s of r4.slice(0, 3)) {
    const ex = extract(s);
    console.log(
      `  id=${ex.id} title="${ex.title}" artist="${ex.artist}" sb=${ex.storyboard} video=${ex.video}`,
    );
  }

  console.log("\n=== Test 5: Japanese query '夜に駆ける' ===");
  const r5 = await searchNerinyan("夜に駆ける", undefined, 10);
  console.log(`  count=${r5.length}`);
  for (const s of r5.slice(0, 3)) {
    const ex = extract(s);
    console.log(
      `  id=${ex.id} title="${ex.title}" artist="${ex.artist}" sb=${ex.storyboard} video=${ex.video}`,
    );
  }
};

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
