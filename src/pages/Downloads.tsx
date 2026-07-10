import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { GlassButton } from "@/components/glass/GlassButton";
import { ModeBadge } from "@/components/common";
import { Trash2, Play, Music2, HardDrive, AlertCircle, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GameMode, Beatmap, LoadedBeatmapSet } from "@/types";
import { MODE_FROM_ID } from "@/types";

const MODE_FROM_NUM: Record<number, GameMode> = MODE_FROM_ID;

export default function Downloads() {
  const navigate = useNavigate();
  const downloaded = useGameStore((s) => s.downloaded);
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  const deleteDownload = useGameStore((s) => s.deleteDownload);
  const clearDownloads = useGameStore((s) => s.clearDownloads);
  const importBeatmapFile = useGameStore((s) => s.importBeatmapFile);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [coverError, setCoverError] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const loaded = await importBeatmapFile(file);
      if (loaded) {
        setImportMsg({ text: `已导入：${loaded.title}`, ok: true });
      } else {
        setImportMsg({ text: "导入失败，请检查文件格式", ok: false });
      }
    } catch {
      setImportMsg({ text: "导入失败", ok: false });
    }
    setImporting(false);
    // 清空 input 以便重复导入同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setImportMsg(null), 3000);
  }, [importBeatmapFile]);

  useEffect(() => {
    loadDownloads().finally(() => setLoading(false));
  }, [loadDownloads]);

  const items = Array.from(downloaded.values());

  const toggleExpand = (setId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  const handlePlay = (set: LoadedBeatmapSet, beatmap: Beatmap) => {
    const mode = MODE_FROM_NUM[beatmap.mode] || "standard";
    navigate(`/game/${set.setId}/${mode}/${beatmap.id}`);
  };

  const handleDelete = async (setId: number) => {
    await deleteDownload(setId);
  };

  const handleClear = async () => {
    if (confirm("确定清空所有本地下载吗？此操作不可恢复。")) {
      await clearDownloads();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: "calc(56px + env(safe-area-inset-top, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HardDrive size={22} style={{ color: "var(--accent)" }} />
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              下载管理
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <GlassButton
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              {importing ? "导入中…" : "导入谱面"}
            </GlassButton>
            {items.length > 0 && (
              <GlassButton
                onClick={handleClear}
                style={{ background: "rgba(255,55,95,0.15)", color: "#ff375f" }}
              >
                <Trash2 size={14} style={{ marginRight: 6 }} />
                清空全部
              </GlassButton>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
            加载中…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "var(--text-secondary)",
              background: "var(--glass)",
              borderRadius: 20,
              border: "1px solid var(--border)",
            }}
          >
            <Music2 size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 15 }}>暂无本地下载</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
              去搜索页下载谱面吧
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((set) => {
              const isExpanded = expanded.has(set.setId);
              const coverSrc = coverError.has(set.setId) ? (set.backgroundUrl || set.cover) : set.cover;
              return (
              <div
                key={set.setId}
                style={{
                  background: "var(--glass)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 14 }}>
                  <img
                    src={coverSrc}
                    alt="cover"
                    onError={() => {
                      setCoverError((prev) => new Set(prev).add(set.setId));
                    }}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      objectFit: "cover",
                      background: "var(--glass-hover)",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {set.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {set.artist}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 6,
                      }}
                    >
                      {set.beatmaps.length} 个难度 · 下载于{" "}
                      {new Date(set.downloadedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignSelf: "flex-start" }}>
                    <GlassButton
                      onClick={() => toggleExpand(set.setId)}
                      style={{ background: "var(--surface-elevated)", color: "var(--text-secondary)" }}
                      aria-label={isExpanded ? "折叠" : "展开"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleDelete(set.setId)}
                      style={{
                        background: "rgba(255,55,95,0.12)",
                        color: "#ff375f",
                      }}
                    >
                      <Trash2 size={16} />
                    </GlassButton>
                  </div>
                </div>

                {isExpanded && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {set.beatmaps.map((b) => {
                    const mode = MODE_FROM_NUM[b.mode] || "standard";
                    return (
                      <div
                        key={b.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          background: "var(--glass-hover)",
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ModeBadge mode={mode} />
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {b.version}
                          </span>
                        </div>
                        <GlassButton
                          onClick={() => handlePlay(set, b)}
                        >
                          <Play size={14} style={{ marginRight: 5 }} />
                          开始
                        </GlassButton>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          <AlertCircle size={14} />
          <span>下载数据保存在浏览器 IndexedDB 中，清理浏览器数据会丢失。</span>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".osz,.osk"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />
      {importMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            borderRadius: 12,
            background: importMsg.ok ? "rgba(74,222,128,0.9)" : "rgba(255,55,95,0.9)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {importMsg.text}
        </div>
      )}
    </div>
  );
}
