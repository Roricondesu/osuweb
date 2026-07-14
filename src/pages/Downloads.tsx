import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCover, ModeBadge, StarRatingBar } from "@/components/common";
import {
  HardDrive,
  Upload,
  Trash2,
  Music2,
  AlertCircle,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Calendar,
  Type,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GameMode, Beatmap, LoadedBeatmapSet } from "@/types";
import { MODE_FROM_ID } from "@/types";

const MODE_FROM_NUM: Record<number, GameMode> = MODE_FROM_ID;

type SortBy = "newest" | "oldest" | "title" | "stars";

const SORT_OPTIONS: { key: SortBy; label: string; icon: React.ElementType }[] = [
  { key: "newest", label: "最新下载", icon: Calendar },
  { key: "oldest", label: "最早下载", icon: Calendar },
  { key: "title", label: "标题", icon: Type },
  { key: "stars", label: "星级", icon: Star },
];

const SortButton: React.FC<{
  sort: SortBy;
  onChange: (s: SortBy) => void;
}> = ({ sort, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = SORT_OPTIONS.find((o) => o.key === sort)!;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hud-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          borderRadius: "var(--radius-pill)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          border: "1px solid var(--glass-border)",
          background: "var(--glass-bg)",
          cursor: "pointer",
        }}
      >
        <ArrowUpDown size={13} />
        <span className="font-torus">{active.label}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            minWidth: 130,
            padding: 6,
            borderRadius: "var(--radius-md)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {SORT_OPTIONS.map((o) => {
            const Icon = o.icon;
            const selected = sort === o.key;
            return (
              <button
                key={o.key}
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  color: selected ? "var(--accent)" : "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={13} />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DownloadRow: React.FC<{
  set: LoadedBeatmapSet;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onPlay: (beatmap: Beatmap) => void;
}> = React.memo(({ set, expanded, onToggle, onDelete, onPlay }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const modes = useMemo(
    () => Array.from(new Set(set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3))).sort(),
    [set.beatmaps],
  );
  const maxStars = useMemo(
    () => (set.beatmaps.length ? Math.max(...set.beatmaps.map((b) => b.difficulty_rating || 0)) : 0),
    [set.beatmaps],
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        contentVisibility: "auto",
        containIntrinsicHeight: "92px",
        borderBottom: "1px solid var(--border)",
        background: hover ? "var(--surface-hover)" : "transparent",
        transition: "background 0.15s ease",
      }}
    >
      {/* 主行 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          cursor: "pointer",
        }}
        onClick={() => navigate(`/set/${set.setId}`)}
      >
        {/* 封面 */}
        <div
          style={{
            position: "relative",
            width: 72,
            height: 72,
            minWidth: 72,
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--surface-elevated)",
          }}
        >
          <BeatmapCover
            src={set.cover}
            alt={set.title}
            placeholderSize={28}
            lazy
            style={{ position: "absolute", inset: 0 }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 4,
              left: 4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              padding: "0 4px",
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {set.beatmaps.length}
          </div>
        </div>

        {/* 信息 */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div
            className="font-torus"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "-0.01em",
            }}
          >
            {set.title}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {set.artist}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {new Date(set.downloadedAt).toLocaleDateString()}
          </div>
        </div>

        {/* 模式 + 星级 */}
        <div
          className="hidden sm:flex"
          style={{ alignItems: "center", gap: 8, marginLeft: "auto", paddingRight: 8 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {modes.slice(0, 3).map((m) => {
              const modeName: GameMode = MODE_FROM_NUM[m] || "standard";
              return <ModeBadge key={m} mode={modeName} />;
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <StarRatingBar stars={maxStars} variant="compact" />
            <span className="hud-num font-torus" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              {maxStars.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={expanded ? "折叠" : "展开"}
            className="hud-btn"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              border: "1px solid transparent",
              background: "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="删除"
            className="hud-btn"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--error)",
              border: "1px solid transparent",
              background: "transparent",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--error-soft)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 展开难度列表 */}
      {expanded && (
        <div
          style={{
            padding: "0 12px 12px 96px",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            animation: "stagger-fade-up 0.25s ease both",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {set.beatmaps.map((b) => {
            const mode = MODE_FROM_NUM[b.mode] || "standard";
            return (
              <button
                key={b.id}
                onClick={() => onPlay(b)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              >
                <ModeBadge mode={mode} />
                <span
                  className="font-torus"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    maxWidth: 160,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {b.version}
                </span>
                <StarRatingBar stars={b.difficulty_rating || 0} variant="compact" />
                <Play size={11} style={{ color: "var(--accent)", flexShrink: 0 }} fill="currentColor" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
DownloadRow.displayName = "DownloadRow";

export default function Downloads() {
  const navigate = useNavigate();
  const downloaded = useGameStore((s) => s.downloaded);
  const downloadsReady = useGameStore((s) => s.downloadsReady);
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  const deleteDownload = useGameStore((s) => s.deleteDownload);
  const clearDownloads = useGameStore((s) => s.clearDownloads);
  const importBeatmapFile = useGameStore((s) => s.importBeatmapFile);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const items = useMemo(() => {
    const arr = Array.from(downloaded.values());
    switch (sortBy) {
      case "newest":
        return arr.sort((a, b) => b.downloadedAt - a.downloadedAt);
      case "oldest":
        return arr.sort((a, b) => a.downloadedAt - b.downloadedAt);
      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
      case "stars": {
        const starsOf = (s: LoadedBeatmapSet) =>
          s.beatmaps.length ? Math.max(...s.beatmaps.map((b) => b.difficulty_rating || 0)) : 0;
        return arr.sort((a, b) => starsOf(b) - starsOf(a));
      }
      default:
        return arr;
    }
  }, [downloaded, sortBy]);

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
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });
  };

  const handleClear = async () => {
    if (confirm("确定清空所有本地下载吗？此操作不可恢复。")) {
      await clearDownloads();
      setExpanded(new Set());
    }
  };

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [importBeatmapFile],
  );

  return (
    <div className="page-shell">
      {/* 页头 */}
      <div
        className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center"
        style={{ justifyContent: "space-between" }}
      >
        <div className="flex items-center gap-2.5">
          <HardDrive size={22} style={{ color: "var(--accent)" }} />
          <h1 className="font-torus text-xl sm:text-2xl" style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            下载管理
          </h1>
          <span
            className="font-torus"
            style={{
              marginLeft: 4,
              padding: "2px 9px",
              borderRadius: "var(--radius-pill)",
              fontSize: 12,
              fontWeight: 700,
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {items.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SortButton sort={sortBy} onChange={setSortBy} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="hud-btn font-torus"
            style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
          >
            <Upload size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            {importing ? "导入中…" : "导入谱面"}
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="hud-btn font-torus"
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--error-soft)",
                color: "var(--error)",
              }}
            >
              <Trash2 size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              清空全部
            </button>
          )}
        </div>
      </div>

      {!downloadsReady ? (
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
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          {items.map((set) => (
            <DownloadRow
              key={set.setId}
              set={set}
              expanded={expanded.has(set.setId)}
              onToggle={() => toggleExpand(set.setId)}
              onDelete={() => handleDelete(set.setId)}
              onPlay={(b) => handlePlay(set, b)}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
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
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {importMsg.text}
        </div>
      )}
    </div>
  );
}
