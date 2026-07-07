import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { GlassButton } from "@/components/glass/GlassButton";
import { DifficultyBadge, ModeBadge } from "@/components/common";
import { ArrowLeft, Download, Play, Loader2, Music2, CheckCircle2 } from "lucide-react";
import type { GameMode, Beatmap, BeatmapSet } from "@/types";
import { MODE_LABEL, MODE_COLOR } from "@/types";
import { formatTime } from "@/utils/formatTime";

const MODE_FROM_NUM: Record<number, GameMode> = {
  0: "standard",
  1: "taiko",
  2: "catch",
  3: "mania",
};

export default function BeatmapSetDetail() {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const detailSet = useGameStore((s) => s.detailSet);
  const detailLoading = useGameStore((s) => s.detailLoading);
  const loadDetail = useGameStore((s) => s.loadDetail);
  const downloaded = useGameStore((s) => s.downloaded);
  const downloadSet = useGameStore((s) => s.downloadSet);
  const downloadProgress = useGameStore((s) => s.downloadProgress);
  const downloadError = useGameStore((s) => s.downloadError);
  const startGame = useGameStore((s) => s.startGame);

  const [downloading, setDownloading] = useState(false);
  const [filterMode, setFilterMode] = useState<GameMode | null>(null);

  useEffect(() => {
    if (setId) loadDetail(Number(setId));
  }, [setId]);

  const loaded = setId ? downloaded.get(Number(setId)) : undefined;

  const handleDownload = async () => {
    if (!detailSet) return;
    setDownloading(true);
    await downloadSet(detailSet);
    setDownloading(false);
  };

  const handleStart = (beatmap: Beatmap, mode: GameMode) => {
    if (!detailSet) return;
    startGame(detailSet, beatmap, mode);
    navigate(`/game/${detailSet.id}/${mode}/${beatmap.id}`);
  };

  // 收集可用的模式
  const availableModes = new Set<GameMode>();
  (detailSet?.beatmaps || []).forEach((b) => {
    const m = MODE_FROM_NUM[b.mode];
    if (m) availableModes.add(m);
  });

  const filteredBeatmaps = (detailSet?.beatmaps || []).filter((b) => {
    const m = MODE_FROM_NUM[b.mode];
    if (filterMode && m !== filterMode) return false;
    return true;
  });

  // 排序：按星级升序
  const sorted = [...filteredBeatmaps].sort(
    (a, b) => a.difficulty_rating - b.difficulty_rating,
  );

  const cover = detailSet?.covers?.["cover@2x"] || detailSet?.covers?.cover || "";
  const isLoading = detailLoading || !detailSet;

  return (
    <div className="page-shell">
      <section className="animate-enter animate-enter-1">
        <div className="solid-card overflow-hidden">
          {/* 头部封面区 */}
          <div style={{ position: "relative", aspectRatio: "16/9", maxHeight: 320, overflow: "hidden" }}>
            {cover ? (
              <img
                src={cover}
                alt={detailSet?.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--surface-elevated)",
                }}
              >
                {isLoading ? (
                  <Loader2 size={40} className="animate-spin" style={{ color: "var(--text-secondary)" }} />
                ) : (
                  <Music2 size={40} style={{ color: "var(--text-secondary)" }} />
                )}
              </div>
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <button
              onClick={() => navigate(-1)}
              aria-label="返回"
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                width: 36,
                height: 36,
                borderRadius: 12,
                border: "none",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={18} />
            </button>

            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
              }}
            >
              <h1 className="text-xl font-bold md:text-2xl" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
                {detailSet?.title_unicode || detailSet?.title || "加载中…"}
              </h1>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                {detailSet?.artist_unicode || detailSet?.artist}
                {detailSet?.creator ? ` · ${detailSet.creator}` : ""}
                {detailSet?.bpm ? ` · ${detailSet.bpm} BPM` : ""}
              </p>
            </div>
          </div>

          {/* 下载操作区 */}
          <div className="p-4 md:p-5">
            {loaded ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: "var(--accent)" }} />
                <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>
                  已下载 {loaded.beatmaps.length} 个难度
                </span>
                <GlassButton onClick={() => {}} active>
                  <Play size={14} /> 已就绪
                </GlassButton>
              </div>
            ) : downloading ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>下载中…</span>
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {Math.round(downloadProgress * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    borderRadius: 3,
                    background: "var(--surface-elevated)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${downloadProgress * 100}%`,
                      height: "100%",
                      background: "var(--accent)",
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
              </div>
            ) : (
              <GlassButton onClick={handleDownload} accent style={{ width: "100%" }}>
                <Download size={16} /> 下载谱面（{sorted.length} 个难度）
              </GlassButton>
            )}
            {downloadError && (
              <p className="mt-2 text-xs" style={{ color: "#ff453a" }}>
                下载失败：{downloadError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 模式过滤 */}
      <section className="mt-4 animate-enter animate-enter-2">
        <div className="solid-card p-4">
          <div className="mb-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            选择模式
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterMode(null)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
              style={{
                border: "1px solid",
                borderColor: filterMode === null ? "var(--accent)" : "var(--border)",
                color: filterMode === null ? "var(--accent)" : "var(--text-primary)",
                background: filterMode === null ? "var(--accent-soft)" : "transparent",
                cursor: "pointer",
              }}
            >
              全部
            </button>
            {Array.from(availableModes).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
                style={{
                  border: "1px solid",
                  borderColor: filterMode === m ? MODE_COLOR[m] : "var(--border)",
                  color: filterMode === m ? MODE_COLOR[m] : "var(--text-primary)",
                  background: filterMode === m ? `${MODE_COLOR[m]}22` : "transparent",
                  cursor: "pointer",
                }}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 难度列表 */}
      <section className="mt-4 animate-enter animate-enter-3">
        <div className="solid-card divide-y" style={{ borderColor: "var(--border)" }}>
          {sorted.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              {isLoading ? "加载中…" : "无难度"}
            </div>
          ) : (
            sorted.map((b) => {
              const mode = MODE_FROM_NUM[b.mode];
              const canPlay = !!loaded;
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 md:p-4"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ModeBadge mode={mode} />
                      <DifficultyBadge stars={b.difficulty_rating} />
                      {b.bpm && (
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {b.bpm} BPM
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {formatTime(b.total_length)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {b.version}
                    </div>
                    <div className="mt-0.5 flex gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      <span>AR {b.ar?.toFixed(1) ?? "-"}</span>
                      <span>CS {b.cs?.toFixed(1) ?? "-"}</span>
                      <span>OD {b.od?.toFixed(1) ?? "-"}</span>
                      <span>HP {b.hp?.toFixed(1) ?? "-"}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStart(b, mode)}
                    disabled={!canPlay}
                    aria-label={`游玩 ${b.version}`}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      border: "none",
                      background: canPlay ? "var(--accent)" : "var(--surface-elevated)",
                      color: canPlay ? "#fff" : "var(--text-secondary)",
                      cursor: canPlay ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
