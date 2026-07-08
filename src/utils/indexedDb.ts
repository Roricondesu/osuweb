// === IndexedDB 下载缓存管理 ===

import type { LoadedBeatmapSet } from "@/types";

const DB_NAME = "osuweb-downloads";
const DB_VERSION = 2; // 升级到 2，新增 assetBlobs
const STORE_NAME = "beatmapsets";

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
    };
  });
}

/** 序列化：Blob URL 无法直接存 IndexedDB，需要把 Blob 拿出来存 */
type StoredBeatmapSet = Omit<LoadedBeatmapSet, "audioUrl" | "backgroundUrl" | "cover" | "assetUrls"> & {
  audioBlob?: Blob;
  backgroundBlob?: Blob;
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
  const [audioBlob, backgroundBlob, coverBlob] = await Promise.all([
    blobFromUrl(set.audioUrl),
    set.backgroundUrl ? blobFromUrl(set.backgroundUrl) : Promise.resolve(undefined),
    set.cover ? blobFromUrl(set.cover) : Promise.resolve(undefined),
  ]);

  const assetBlobs: Record<string, Blob> = {};
  if (set.assetUrls) {
    const entries = Object.entries(set.assetUrls);
    const blobs = await Promise.all(entries.map(([_, url]) => blobFromUrl(url)));
    entries.forEach(([name], i) => {
      const b = blobs[i];
      if (b) assetBlobs[name] = b;
    });
  }

  const stored: StoredBeatmapSet = {
    ...set,
    audioBlob,
    backgroundBlob,
    coverBlob,
    assetBlobs,
  };

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
  });
}
