// === 字体持久化：IndexedDB 缓存字体 Blob ===
// 首次加载时从服务器获取字体文件，存入 IndexedDB
// 后续直接从 IndexedDB 读取，用 FontFace API 注入

const DB_NAME = "osuweb-fonts";
const DB_VERSION = 1;
const STORE_NAME = "fonts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getCachedFont(key: string): Promise<Blob | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return undefined;
  }
}

async function setCachedFont(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch {
    // 存储失败不阻断应用
  }
}

interface FontConfig {
  family: string;
  url: string;
  format: string;
  weight?: string;
  /** 可变字体范围，如 "100 900" */
  weightRange?: string;
}

const FONTS: FontConfig[] = [
  {
    family: "Torus Pro",
    url: "/fonts/AlimamaFangYuanTiVF-Thin-2.ttf",
    format: "truetype",
    weightRange: "100 900",
  },
  {
    family: "Code Pro",
    url: "/fonts/code-pro.otf",
    format: "opentype",
    weight: "400",
  },
];

/** 加载单个字体：优先 IndexedDB 缓存，回退到网络 */
async function loadFont(config: FontConfig): Promise<void> {
  const cacheKey = config.url;

  // 尝试从 IndexedDB 获取
  let blob = await getCachedFont(cacheKey);

  // 缓存未命中，从网络获取
  if (!blob) {
    const res = await fetch(config.url);
    if (!res.ok) throw new Error(`字体加载失败: ${config.url}`);
    blob = await res.blob();
    // 异步写入缓存
    void setCachedFont(cacheKey, blob);
  }

  // 用 FontFace API 注册
  const fontFace = new FontFace(
    config.family,
    `url(${URL.createObjectURL(blob)})`,
    {
      style: "normal",
      ...(config.weightRange ? { weight: config.weightRange } : {}),
      ...(config.weight ? { weight: config.weight } : {}),
    },
  );

  await fontFace.load();
  (document.fonts as FontFaceSet).add(fontFace);
}

let loaded = false;

/** 加载所有持久化字体（在应用启动时调用一次） */
export async function loadFonts(): Promise<void> {
  if (loaded) return;
  loaded = true;

  await Promise.all(
    FONTS.map((config) =>
      loadFont(config).catch((e) => {
        console.warn(`字体加载失败: ${config.family}`, e);
      }),
    ),
  );
}
