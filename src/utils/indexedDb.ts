// === IndexedDB 下载缓存管理 ===

import type { LoadedBeatmapSet } from "@/types";

const DB_NAME = "osuweb-downloads";
const DB_VERSION = 3; // 升级到 3，新增 customHitSounds
const STORE_NAME = "beatmapsets";
const HITSOUND_STORE_NAME = "hitsounds";
const HITSOUND_KEY = "custom";

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
};

async function blobFromUrl(url: string): Promise<Blob | undefined> {
  try {
    const res = await fetch(url);
    return await res.blob();
  } catch {
    return undefined;
  }
}

function urlFromBlob(blob?: Blob): string | undefined {
  if (!blob) return undefined;
  return URL.createObjectURL(blob);
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
  // 序列化时移除 Blob URL 字段，避免存入失效的 URL
  delete (stored as Partial<LoadedBeatmapSet>).audioUrl;
  delete (stored as Partial<LoadedBeatmapSet>).backgroundUrl;
  delete (stored as Partial<LoadedBeatmapSet>).videoUrl;
  delete (stored as Partial<LoadedBeatmapSet>).cover;
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
            assetUrls[name] = urlFromBlob(blob) || "";
          }
        }
        const loaded: LoadedBeatmapSet = {
          ...s,
          audioUrl: urlFromBlob(s.audioBlob) || "",
          backgroundUrl: urlFromBlob(s.backgroundBlob),
          videoUrl: urlFromBlob(s.videoBlob),
          cover: urlFromBlob(s.coverBlob) || "",
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
