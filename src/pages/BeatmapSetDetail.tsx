import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { ModeBadge, BeatmapCover, StoryboardBadge, VideoBadge, StarRatingBar } from "@/components/common";
import { ModSelectOverlay, ModSelectButton } from "@/components/game/ModSelectOverlay";
import { ArrowLeft, Download, Play, Loader2, CheckCircle2, Trophy, Heart, Music } from "lucide-react";
import type { GameMode, Beatmap, ScoreRecord } from "@/types";
import { MODE_LABEL, MODE_COLOR } from "@/types";
import { formatTime } from "@/utils/formatTime";
import { getScoresForBeatmap } from "@/utils/scoreStorage";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { usePlayerStore } from "@/store/usePlayerStore";

const MODE_FROM_NUM: Record<number, GameMode> = {
  0: "standard",
  1: "taiko",
  2: "catch",
  3: "mania",
};

const PREVIEW_URL = (setId: number) => `https://b.ppy.sh/preview/${setId}.mp3`;

/** AR/CS/OD/HP 迷你条形图 */
const StatBar: React.FC<{ label: string; value?: number; max?: number; color?: string }> = ({ label, value, max = 10, color = "#8866ff" }) => {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", width: 20, letterSpacing: "0.05em" }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.3s ease" }} />
      </div>
      <span className="hud-num" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", minWidth: 28, textAlign: "right" }}>
        {value != null ? value.toFixed(1) : "-"}
      </span>
    </div>
  );
};

/** 难度卡片 */
const DifficultyCard: React.FC<{
  beatmap: Beatmap;
  mode: GameMode;
  canPlay: boolean;
  bestScore?: ScoreRecord;
  onPlay: () => void;
}> = ({ beatmap, mode, canPlay, bestScore, onPlay }) => {
  const [hover, setHover] = useState(false);
  const starColor = (s: number): string => {
    if (s >= 9) return "#9966ff";
    if (s >= 7) return "#ff375f";
    if (s >= 5.5) return "#ff9100";
    if (s >= 4) return "#ffb800";
    if (s >= 2.5) return "#66cc44";
    return "#0a84ff";
  };
  const sc = starColor(beatmap.difficulty_rating);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        background: "var(--card-info-bg)",
        border: `1px solid ${hover ? sc : "var(--border)"}`,
        transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? `0 8px 24px ${sc}33` : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* 顶部星级条带（osu!web 风格：星级颜色） */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
        <div style={{
          height: "100%",
          width: `${Math.min(100, (beatmap.difficulty_rating / 10) * 100)}%`,
          background: sc,
          transition: "width 0.3s ease",
        }} />
      </div>

      <div style={{ padding: "14px 14px 12px" }}>
        {/* 头部 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <ModeBadge mode={mode} />
          {beatmap.bpm && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
              {beatmap.bpm} BPM
            </span>
          )}
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
            {formatTime(beatmap.total_length)}
          </span>
        </div>

        {/* 版本名 */}
        <div className="font-torus" style={{
          fontSize: 14, fontWeight: 600, color: "#fff",
          letterSpacing: "-0.01em", marginBottom: 10,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {beatmap.version || "Default"}
        </div>

        {/* 星级条 */}
        <div style={{ marginBottom: 10 }}>
          <StarRatingBar stars={beatmap.difficulty_rating} variant="full" />
        </div>

        {/* AR/CS/OD/HP 迷你条 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <StatBar label="AR" value={beatmap.ar} color={sc} />
          {mode === "mania" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", width: 20, letterSpacing: "0.05em" }}>K</span>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (Math.round(beatmap.cs || 4) / 18) * 100)}%`, height: "100%", background: sc, borderRadius: 999 }} />
              </div>
              <span className="hud-num" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", minWidth: 28, textAlign: "right" }}>
                {Math.max(1, Math.round(beatmap.cs || 4))}K
              </span>
            </div>
          ) : (
            <StatBar label="CS" value={beatmap.cs} color="#ff66aa" />
          )}
          <StatBar label="OD" value={beatmap.od} color="#ff9100" />
          <StatBar label="HP" value={beatmap.hp} color="#ff375f" />
        </div>

        {/* 最佳成绩 */}
        {bestScore && (
          <div style={{
            marginTop: 10, padding: "6px 10px", borderRadius: "var(--radius-sm)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 6, fontSize: 11,
          }}>
            <Trophy size={12} style={{ color: sc }} />
            <span style={{ color: sc, fontWeight: 700 }}>{bestScore.score.toLocaleString()}</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>{bestScore.accuracy.toFixed(2)}%</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>{bestScore.maxCombo}x</span>
          </div>
        )}

        {/* 播放按钮 */}
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="lazer-cta"
          style={{
            width: "100%", marginTop: 12, padding: "10px 16px",
            fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            opacity: canPlay ? 1 : 0.4, cursor: canPlay ? "pointer" : "not-allowed",
          }}
        >
          <Play size={15} fill="currentColor" />
          {canPlay ? "游玩" : "需下载"}
        </button>
      </div>
    </div>
  );
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
  const [fullPackage, setFullPackage] = useState(() => useGameStore.getState().settings.downloadFullPackage);
  const [bestScores, setBestScores] = useState<Record<number, ScoreRecord | undefined>>({});
  const [modOpen, setModOpen] = useState(false);

  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const playSet = usePlayerStore((s) => s.playSet);
  const currentSet = usePlayerStore((s) => s.currentSet);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (setId) loadDetail(Number(setId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  const reloadScores = React.useCallback(() => {
    if (!detailSet) return;
    const map: Record<number, ScoreRecord | undefined> = {};
    for (const b of detailSet.beatmaps) {
      const list = getScoresForBeatmap(detailSet.id, b.id);
      if (list.length > 0) {
        map[b.id] = list.reduce((best, cur) => (cur.score > best.score ? cur : best), list[0]);
      }
    }
    setBestScores(map);
  }, [detailSet]);

  useEffect(() => {
    reloadScores();
  }, [reloadScores]);

  useEffect(() => {
    const onFocus = () => reloadScores();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reloadScores]);

  const loaded = setId ? downloaded.get(Number(setId)) : undefined;
  const isFav = detailSet ? favorites.includes(detailSet.id) : false;
  const isCurrentPreview = currentSet?.id === detailSet?.id;

  const handleDownload = async () => {
    if (!detailSet) return;
    setDownloading(true);
    await downloadSet(detailSet, false, fullPackage);
    setDownloading(false);
  };

  const loadedHasVideoMissing = !!loaded && !loaded.videoUrl &&
    (loaded.beatmaps || []).some((b) => b.parsed?.videoFilename);

  const handleDownloadFull = async () => {
    if (!detailSet) return;
    setDownloading(true);
    await downloadSet(detailSet, true, true);
    setDownloading(false);
  };

  const handleStart = (beatmap: Beatmap, mode: GameMode) => {
    if (!detailSet) return;
    startGame(detailSet, beatmap, mode);
    navigate(`/game/${detailSet.id}/${mode}/${beatmap.id}`);
  };

  const handlePreviewToggle = () => {
    if (!detailSet) return;
    playSet(detailSet, PREVIEW_URL(detailSet.id), detailSet.covers?.["cover@2x"] || detailSet.covers?.cover);
  };

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

  const sorted = [...filteredBeatmaps].sort(
    (a, b) => a.difficulty_rating - b.difficulty_rating,
  );

  const cover = detailSet?.covers?.["cover@2x"] || detailSet?.covers?.cover || "";
  const isLoading = detailLoading || !detailSet;

  return (
    <div className="page-shell">
      <section className="animate-enter animate-enter-1">
        <div
          style={{
            overflow: "hidden",
            borderRadius: "var(--radius-lg)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {/* 头部封面区 */}
          <div style={{ position: "relative", aspectRatio: "16/9", maxHeight: 340, overflow: "hidden" }}>
            <BeatmapCover
              src={cover}
              alt={detailSet?.title}
              placeholderSize={72}
              loading={isLoading}
              loadingIndicator={<Loader2 size={40} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
              style={{ position: "absolute", inset: 0 }}
              imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent 55%)",
              pointerEvents: "none",
            }} />
            {/* 返回 */}
            <button
              onClick={() => navigate(-1)}
              aria-label="返回"
              style={{
                position: "absolute", top: 12, left: 12,
                width: 38, height: 38, borderRadius: "var(--radius-md)",
                border: "none", background: "rgba(0,0,0,0.4)", color: "#fff",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={18} />
            </button>
            {/* 收藏 */}
            {detailSet && (
              <button
                onClick={() => toggleFavorite(detailSet.id)}
                aria-label={isFav ? "取消收藏" : "收藏"}
                style={{
                  position: "absolute", top: 12, right: 12,
                  width: 38, height: 38, borderRadius: "var(--radius-md)",
                  border: "none", background: "rgba(0,0,0,0.4)",
                  color: isFav ? "var(--error)" : "#fff",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Heart size={18} fill={isFav ? "currentColor" : "none"} />
              </button>
            )}
            {/* 标题信息 */}
            <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
              {(detailSet?.hasStoryboard || detailSet?.hasVideo) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {detailSet?.hasStoryboard && <StoryboardBadge size="md" />}
                  {detailSet?.hasVideo && <VideoBadge size="md" />}
                </div>
              )}
              <h1 className="font-torus" style={{
                fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em",
                margin: 0,
              }}>
                {detailSet?.title_unicode || detailSet?.title || "加载中…"}
              </h1>
              <p style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0 }}>
                {detailSet?.artist_unicode || detailSet?.artist}
                {detailSet?.creator ? ` · ${detailSet.creator}` : ""}
                {detailSet?.bpm ? ` · ${detailSet.bpm} BPM` : ""}
              </p>
            </div>
          </div>

          {/* 操作区 */}
          <div style={{ padding: "16px 18px" }}>
            {loaded ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <CheckCircle2 size={20} style={{ color: "var(--lazer-accent)" }} />
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>
                    已下载 {loaded.beatmaps.length} 个难度
                  </span>
                  <button
                    onClick={handlePreviewToggle}
                    className="hud-btn"
                    style={{
                      padding: "8px 14px", fontSize: 12, fontWeight: 700,
                      color: isCurrentPreview && isPlaying ? "var(--lazer-accent)" : "var(--text-secondary)",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <Music size={14} />
                    {isCurrentPreview && isPlaying ? "暂停预览" : "试听"}
                  </button>
                </div>
                {loadedHasVideoMissing && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: "var(--radius-md)",
                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  }}>
                    <Download size={14} style={{ color: "var(--lazer-accent)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>
                      当前为 mini 包（无视频），可下载完整包以启用视频背景
                    </span>
                    <button
                      onClick={handleDownloadFull}
                      disabled={downloading}
                      className="hud-btn"
                      style={{
                        padding: "6px 12px", fontSize: 12, fontWeight: 600,
                        color: "var(--lazer-accent)",
                        opacity: downloading ? 0.5 : 1,
                      }}
                    >
                      下载完整包
                    </button>
                  </div>
                )}
              </div>
            ) : downloading ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--text-secondary)" }}>下载中…</span>
                  <span className="hud-num" style={{ color: "var(--lazer-accent)", fontWeight: 700 }}>
                    {Math.round(downloadProgress * 100)}%
                  </span>
                </div>
                <div className="hud-bar-track" style={{ height: 6 }}>
                  <div className="hud-bar-fill" style={{ width: `${downloadProgress * 100}%` }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 14px", borderRadius: "var(--radius-md)",
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>下载类型</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { val: false, label: "mini（小）" },
                      { val: true, label: "full（含 Storyboard）" },
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setFullPackage(opt.val)}
                        className="hud-btn"
                        style={{
                          padding: "5px 12px", fontSize: 12, fontWeight: 600,
                          color: fullPackage === opt.val ? "var(--lazer-accent)" : "var(--text-secondary)",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleDownload} className="lazer-cta" style={{ width: "100%", padding: "12px 20px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Download size={16} /> 下载谱面（{sorted.length} 个难度）
                </button>
              </div>
            )}
            {downloadError && (
              <p style={{ marginTop: 8, fontSize: 12, color: "var(--error)" }}>
                下载失败：{downloadError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 模式过滤 */}
      {availableModes.size > 1 && (
        <section className="mt-4 animate-enter animate-enter-2">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              onClick={() => setFilterMode(null)}
              className="hud-btn"
              style={{
                padding: "6px 14px", fontSize: 12, fontWeight: 600,
                color: filterMode === null ? "var(--lazer-accent)" : "var(--text-secondary)",
              }}
            >
              全部
            </button>
            {Array.from(availableModes).map((m) => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className="hud-btn"
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600,
                  color: filterMode === m ? MODE_COLOR[m] : "var(--text-secondary)",
                }}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 难度卡片网格 */}
      <section className="mt-4 animate-enter animate-enter-3">
        {sorted.length === 0 ? (
          <div style={{
            padding: 32, textAlign: "center", fontSize: 13, color: "var(--text-secondary)",
            borderRadius: "var(--radius-lg)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
          }}>
            {isLoading ? "加载中…" : "无难度"}
          </div>
        ) : (
          <div className="diff-grid">
            {sorted.map((b) => {
              const mode = MODE_FROM_NUM[b.mode];
              const canPlay = !!loaded;
              return (
                <DifficultyCard
                  key={b.id}
                  beatmap={b}
                  mode={mode}
                  canPlay={canPlay}
                  bestScore={bestScores[b.id]}
                  onPlay={() => handleStart(b, mode)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Mod 按钮 + 浮层 */}
      <ModSelectButton onClick={() => setModOpen(true)} />
      <ModSelectOverlay open={modOpen} onClose={() => setModOpen(false)} />
    </div>
  );
}
