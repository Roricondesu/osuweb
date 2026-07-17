// === IndexedDB 下载缓存管理 ===

import type { LoadedBeatmapSet } from "@/types";

const DB_NAME = "osuweb-downloads";
const DB_VERSION = 4; // 升级到 4，新增 customSkin
const STORE_NAME = "beatmapsets";
const HITSOUND_STORE_NAME = "hitsounds";
const HITSOUND_KEY = "custom";
const SKIN_STORE_NAME = "customSkin";
const SKIN_KEY = "custom";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "setId" });
      }
      if (!db.objectStoreNames.contains(HITSOUND_STORE_NAME)) {
        db.createObjectStore(HITSOUND_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(SKIN_STORE_NAME)) {
        db.createObjectStore(SKIN_STORE_NAME);
      }
    };
  });
}

/** 序列化：Blob URL 无法直接存 IndexedDB，需要把 Blob 拿出来存 */
type StoredBeatmapSet = Omit<LoadedBeatmapSet, "audioUrl" | "backgroundUrl" | "videoUrl" | "cover" | "assetUrls"> & {
  audioBlob?: Blob;
  backgroundBlob?: Blob;
  videoBlob?: Blob;
  coverBlob?: Blob;
  assetBlobs?: Record<string, Blob>;
  // coverUrl 从 LoadedBeatmapSet 继承，不需 Omit
  // 旧数据可能残留 cover 字段（在线 URL），加载时作为回退
  cover?: string;
};

async function blobFromUrl(url: string): Promise<Blob | undefined> {
  try {
    const res = await fetch(url);
    return await res.blob();
  } catch {
    return undefined;
  }
}

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  flac: "audio/flac",
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  m4v: "video/mp4",
};

const mimeTypeFor = (name: string): string | undefined => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext ? MIME_MAP[ext] : undefined;
};

function urlFromBlob(blob?: Blob, name?: string): string | undefined {
  if (!blob) return undefined;
  const type = mimeTypeFor(name || "") || blob.type;
  if (!type || blob.type === type) return URL.createObjectURL(blob);
  return URL.createObjectURL(new Blob([blob], { type }));
}

export async function saveDownload(set: LoadedBeatmapSet): Promise<void> {
  // 先提取所有 Blob，再开启事务，避免 await 期间事务自动结束
  const [audioBlob, backgroundBlob, videoBlob, coverBlob] = await Promise.all([
    blobFromUrl(set.audioUrl),
    set.backgroundUrl ? blobFromUrl(set.backgroundUrl) : Promise.resolve(undefined),
    set.videoUrl ? blobFromUrl(set.videoUrl) : Promise.resolve(undefined),
    set.cover ? blobFromUrl(set.cover) : Promise.resolve(undefined),
  ]);

  const assetBlobs: Record<string, Blob> = {};
  if (set.assetUrls) {
    const entries = Object.entries(set.assetUrls);
    const blobs = await Promise.all(entries.map(([, url]) => blobFromUrl(url)));
    entries.forEach(([name], i) => {
      const b = blobs[i];
      if (b) assetBlobs[name] = b;
    });
  }

  const stored: StoredBeatmapSet = {
    ...set,
    audioBlob,
    backgroundBlob,
    videoBlob,
    coverBlob,
    assetBlobs,
  };
  // 移除 Blob URL 字段（刷新后失效），保留 coverUrl 作为回退
  delete (stored as Partial<LoadedBeatmapSet>).audioUrl;
  delete (stored as Partial<LoadedBeatmapSet>).backgroundUrl;
  delete (stored as Partial<LoadedBeatmapSet>).videoUrl;
  // cover 是 blob URL，刷新后失效；用 coverUrl 替换，作为 coverBlob 不可用时的回退
  (stored as StoredBeatmapSet).cover = set.coverUrl || "";
  delete (stored as Partial<LoadedBeatmapSet>).assetUrls;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.put(stored);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllDownloads(): Promise<Map<number, LoadedBeatmapSet>> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const storedList = req.result as StoredBeatmapSet[];
      const map = new Map<number, LoadedBeatmapSet>();
      for (const s of storedList) {
        const assetUrls: Record<string, string> = {};
        if (s.assetBlobs) {
          for (const [name, blob] of Object.entries(s.assetBlobs)) {
            assetUrls[name] = urlFromBlob(blob, name) || "";
          }
        }
        const loaded: LoadedBeatmapSet = {
          ...s,
          audioUrl: urlFromBlob(s.audioBlob) || "",
          backgroundUrl: urlFromBlob(s.backgroundBlob),
          videoUrl: urlFromBlob(s.videoBlob),
          // 优先用本地 blob 重建封面 URL；回退到在线 coverUrl / 旧数据中的 cover 字段
          cover: urlFromBlob(s.coverBlob) || s.coverUrl || s.cover || "",
          assetUrls,
        };
        map.set(loaded.setId, loaded);
      }
      resolve(map);
    };
    tx.oncomplete = () => db.close();
  });
}

export async function deleteDownload(setId: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(setId);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

export async function clearAllDownloads(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

/** 局部更新单条下载记录的歌词字段（不触碰 Blob） */
export async function updateDownloadLyrics(
  setId: number,
  lyrics: { time: number; text: string }[],
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const getReq = store.get(setId);
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const record = getReq.result as StoredBeatmapSet | undefined;
      if (!record) {
        resolve();
        return;
      }
      record.lyrics = lyrics;
      const putReq = store.put(record);
      putReq.onerror = () => reject(putReq.error);
      putReq.onsuccess = () => resolve();
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

/** 自定义音效采样：以 Blob 形式持久化 */
export async function saveCustomHitSounds(assetUrls: Record<string, string>): Promise<void> {
  const blobs: Record<string, Blob> = {};
  const entries = Object.entries(assetUrls);
  const fetched = await Promise.all(entries.map(([, url]) => blobFromUrl(url)));
  entries.forEach(([name], i) => {
    const b = fetched[i];
    if (b) blobs[name] = b;
  });

  const db = await openDB();
  const tx = db.transaction(HITSOUND_STORE_NAME, "readwrite");
  const store = tx.objectStore(HITSOUND_STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.put(blobs, HITSOUND_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCustomHitSounds(): Promise<Record<string, string>> {
  const db = await openDB();
  const tx = db.transaction(HITSOUND_STORE_NAME, "readonly");
  const store = tx.objectStore(HITSOUND_STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.get(HITSOUND_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const blobs = (req.result || {}) as Record<string, Blob>;
      const assetUrls: Record<string, string> = {};
      for (const [name, blob] of Object.entries(blobs)) {
        const url = urlFromBlob(blob);
        if (url) assetUrls[name] = url;
      }
      resolve(assetUrls);
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCustomHitSounds(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(HITSOUND_STORE_NAME, "readwrite");
  const store = tx.objectStore(HITSOUND_STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(HITSOUND_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

/** 自定义皮肤：以 Blob 形式持久化（与音效同模式） */
export async function saveCustomSkin(assetUrls: Record<string, string>): Promise<void> {
  const blobs: Record<string, Blob> = {};
  const entries = Object.entries(assetUrls);
  const fetched = await Promise.all(entries.map(([, url]) => blobFromUrl(url)));
  entries.forEach(([name], i) => {
    const b = fetched[i];
    if (b) blobs[name] = b;
  });

  const db = await openDB();
  const tx = db.transaction(SKIN_STORE_NAME, "readwrite");
  const store = tx.objectStore(SKIN_STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.put(blobs, SKIN_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCustomSkin(): Promise<Record<string, string>> {
  const db = await openDB();
  const tx = db.transaction(SKIN_STORE_NAME, "readonly");
  const store = tx.objectStore(SKIN_STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.get(SKIN_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const blobs = (req.result || {}) as Record<string, Blob>;
      const assetUrls: Record<string, string> = {};
      for (const [name, blob] of Object.entries(blobs)) {
        const url = urlFromBlob(blob);
        if (url) assetUrls[name] = url;
      }
      resolve(assetUrls);
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCustomSkin(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SKIN_STORE_NAME, "readwrite");
  const store = tx.objectStore(SKIN_STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(SKIN_KEY);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}
