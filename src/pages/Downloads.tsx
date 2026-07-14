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
    <div className="page-shell">
      {/* 页头 */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <HardDrive size={22} style={{ color: "var(--accent)" }} />
          <h1 className="font-torus text-xl sm:text-2xl" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            下载管理
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlassButton
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={14} className="mr-1.5" />
            <span className="hidden sm:inline">{importing ? "导入中…" : "导入谱面"}</span>
            <span className="sm:hidden">{importing ? "…" : "导入"}</span>
          </GlassButton>
          {items.length > 0 && (
            <GlassButton
              onClick={handleClear}
              style={{ background: "var(--error-soft)", color: "var(--error)" }}
            >
              <Trash2 size={14} className="mr-1.5" />
              <span className="hidden sm:inline">清空全部</span>
              <span className="sm:hidden">清空</span>
            </GlassButton>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center sm:py-16" style={{ color: "var(--text-secondary)" }}>
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center py-10 text-center sm:py-16"
          style={{
            color: "var(--text-secondary)",
            background: "var(--glass-bg)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Music2 size={36} className="mb-3 opacity-50" />
          <div className="text-sm sm:text-base">暂无本地下载</div>
          <div className="mt-1.5 text-xs opacity-70">去搜索页下载谱面吧</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((set) => {
            const isExpanded = expanded.has(set.setId);
            const coverSrc = coverError.has(set.setId) ? (set.backgroundUrl || set.cover) : set.cover;
            return (
              <div
                key={set.setId}
                className="flex flex-col gap-3 p-3 sm:gap-3 sm:p-4"
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div className="flex gap-3">
                  <img
                    src={coverSrc}
                    alt="cover"
                    onError={() => {
                      setCoverError((prev) => new Set(prev).add(set.setId));
                    }}
                    className="h-14 w-14 shrink-0 object-cover sm:h-16 sm:w-16"
                    style={{ borderRadius: "var(--radius-sm)", background: "var(--surface-hover)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-torus truncate text-sm sm:text-base"
                      style={{ color: "var(--text-primary)", fontWeight: 600 }}
                    >
                      {set.title}
                    </div>
                    <div
                      className="mt-1 truncate text-xs sm:text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {set.artist}
                    </div>
                    <div className="mt-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {set.beatmaps.length} 个难度 ·{" "}
                      <span className="hidden sm:inline">下载于 </span>
                      <span className="sm:hidden">· </span>
                      {new Date(set.downloadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5 self-start sm:gap-2">
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
                        background: "var(--error-soft)",
                        color: "var(--error)",
                      }}
                    >
                      <Trash2 size={16} />
                    </GlassButton>
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-2">
                    {set.beatmaps.map((b) => {
                      const mode = MODE_FROM_NUM[b.mode] || "standard";
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between gap-2 px-3 py-2.5"
                          style={{ background: "var(--surface-hover)", borderRadius: "var(--radius-sm)" }}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <ModeBadge mode={mode} />
                            <span
                              className="font-torus truncate text-xs sm:text-sm"
                              style={{ color: "var(--text-primary)", fontWeight: 500 }}
                            >
                              {b.version}
                            </span>
                          </div>
                          <GlassButton
                            onClick={() => handlePlay(set, b)}
                          >
                            <Play size={14} className="mr-1" />
                            <span className="hidden sm:inline">开始</span>
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
        className="mt-6 flex items-center gap-2 text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        <AlertCircle size={14} className="shrink-0" />
        <span>下载数据保存在浏览器 IndexedDB 中，清理浏览器数据会丢失。</span>
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
          className="font-torus fixed left-1/2 z-[100] -translate-x-1/2 px-4 py-2.5 text-sm font-semibold text-white"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            background: importMsg.ok ? "var(--success)" : "var(--error)",
            borderRadius: "var(--radius-sm)",
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
