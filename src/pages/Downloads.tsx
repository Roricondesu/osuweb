import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCover, ModeBadge, StarRatingBar } from "@/components/common";
import { Trash2, Play, Music2, HardDrive, AlertCircle, ChevronDown, ChevronUp, Upload, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GameMode, Beatmap, LoadedBeatmapSet } from "@/types";
import { MODE_FROM_ID } from "@/types";

const MODE_FROM_NUM: Record<number, GameMode> = MODE_FROM_ID;

/** 已下载卡片（基于 osu!web BeatmapCard 风格，适配 LoadedBeatmapSet） */
const DownloadedCard: React.FC<{
  set: LoadedBeatmapSet;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onPlay: (beatmap: Beatmap) => void;
}> = ({ set, expanded, onToggle, onDelete, onPlay }) => {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const modes = Array.from(new Set(set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3)));
  const maxStars = set.beatmaps.length ? Math.max(...set.beatmaps.map((b) => b.difficulty_rating || 0)) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        transition: "transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "0 6px 20px rgba(0,0,0,0.35)" : "0 2px 6px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* 卡片主体（横向：封面 + 信息盒） */}
      <div style={{ display: "flex", height: 100, cursor: "pointer" }} onClick={() => navigate(`/set/${set.setId}`)}>
        {/* 左侧方形封面 */}
        <div style={{ position: "relative", width: 100, minWidth: 100, height: "100%", overflow: "hidden", zIndex: 2 }}>
          <BeatmapCover
            src={set.cover}
            alt={set.title}
            placeholderSize={32}
            style={{ position: "absolute", inset: 0 }}
            imgStyle={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: hover ? "scale(1.05)" : "scale(1)",
              transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
          {/* 已下载指示徽章 */}
          <div
            style={{
              position: "absolute", top: 5, left: 5,
              display: "flex", alignItems: "center", gap: 3,
              padding: "2px 6px", borderRadius: 999,
              background: "rgba(0,0,0,0.75)",
              fontSize: 9, fontWeight: 700, color: "var(--success)",
            }}
          >
            <CheckCircle2 size={10} />
          </div>
          {/* 难度数徽章 */}
          <div
            style={{
              position: "absolute", bottom: 5, left: 5,
              minWidth: 20, height: 20, borderRadius: 10,
              padding: "0 5px",
              background: "rgba(0,0,0,0.75)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff",
              lineHeight: 1,
            }}
          >
            {set.beatmaps.length}
          </div>
        </div>

        {/* 右侧信息盒 */}
        <div
          style={{
            position: "relative",
            flex: 1,
            height: "100%",
            marginLeft: -7,
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--card-info-bg)",
            zIndex: 3,
          }}
        >
          {set.cover && (
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${set.cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(25px) brightness(0.4) saturate(1.3)",
                transform: "scale(1.3)",
                opacity: hover ? 0.6 : 0.45,
                transition: "opacity 0.3s ease",
              }}
            />
          )}
          {/* 深灰渐变半透明遮罩：左 #2E3835 → 右 90%透明（封面透过） */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #2E3835 0%, rgba(46,56,53,0.1) 100%)" }} />

          {/* 内容层 */}
          <div
            style={{
              position: "relative",
              height: "100%",
              padding: "7px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            {/* 上部：标题 + 艺人 */}
            <div style={{ minHeight: 0, overflow: "hidden" }}>
              <div
                className="font-torus"
                style={{
                  fontSize: 15, fontWeight: 600, color: "#fff",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  letterSpacing: "-0.01em", lineHeight: 1.2,
                }}
              >
                {set.title}
              </div>
              <div
                style={{
                  fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)",
                  marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                {set.artist}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>
                {new Date(set.downloadedAt).toLocaleDateString()}
              </div>
            </div>

            {/* 下部：模式 + 星级 + 操作按钮 */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
              {modes.slice(0, 2).map((m) => {
                const modeName: GameMode = MODE_FROM_NUM[m] || "standard";
                return <ModeBadge key={m} mode={modeName} />;
              })}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <StarRatingBar stars={maxStars} variant="dots" />
                <span className="hud-num font-torus" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
                  {maxStars.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ position: "absolute", top: 5, right: 5, display: "flex", gap: 4, zIndex: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              aria-label={expanded ? "折叠" : "展开"}
              style={{
                width: 22, height: 22, borderRadius: "50%", border: "none",
                background: "rgba(0,0,0,0.5)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s ease",
              }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              aria-label="删除"
              style={{
                width: 22, height: 22, borderRadius: "50%", border: "none",
                background: "rgba(0,0,0,0.5)", color: "var(--error)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s ease",
              }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 展开的难度列表 */}
      {expanded && (
        <div
          className="diff-grid"
          style={{ padding: 8, borderTop: "1px solid var(--border)", animation: "stagger-fade-up 0.3s ease both" }}
        >
          {set.beatmaps.map((b) => {
            const mode = MODE_FROM_NUM[b.mode] || "standard";
            return (
              <button
                key={b.id}
                onClick={() => onPlay(b)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: "var(--radius-sm)",
                  background: "var(--surface-hover)", border: "1px solid var(--border)",
                  cursor: "pointer", transition: "all 0.15s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
              >
                <ModeBadge mode={mode} />
                <span
                  className="font-torus"
                  style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {b.version}
                </span>
                <StarRatingBar stars={b.difficulty_rating || 0} variant="compact" />
                <Play size={12} style={{ color: "var(--accent)", flexShrink: 0 }} fill="currentColor" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function Downloads() {
  const navigate = useNavigate();
  const downloaded = useGameStore((s) => s.downloaded);
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  const deleteDownload = useGameStore((s) => s.deleteDownload);
  const clearDownloads = useGameStore((s) => s.clearDownloads);
  const importBeatmapFile = useGameStore((s) => s.importBeatmapFile);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="hud-btn font-torus"
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
          >
            <Upload size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            {importing ? "导入中…" : "导入谱面"}
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="hud-btn font-torus"
              style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "var(--error-soft)", color: "var(--error)" }}
            >
              <Trash2 size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              清空全部
            </button>
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
        <div className="card-grid">
          {items.map((set) => (
            <DownloadedCard
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
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {importMsg.text}
        </div>
      )}
    </div>
  );
}
