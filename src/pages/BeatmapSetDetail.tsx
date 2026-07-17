import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCover, StoryboardBadge, VideoBadge, StarRatingBar, OsuModeIcon, OsuLogoIcon } from "@/components/common";
import { ModSelectOverlay } from "@/components/game/ModSelectOverlay";
import { ArrowLeft, Download, Play, Loader2, CheckCircle2, Trophy, Heart } from "lucide-react";
import type { GameMode, Beatmap, ScoreRecord } from "@/types";
import { MODE_LABEL, MODE_COLOR } from "@/types";
import { formatTime } from "@/utils/formatTime";
import { getScoresForBeatmap } from "@/utils/scoreStorage";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { GRADE_COLOR } from "@/utils/ppCalculator";

const MODE_FROM_NUM: Record<number, GameMode> = {
  0: "standard",
  1: "taiko",
  2: "catch",
  3: "mania",
};

const starColor = (s: number): string => {
  if (s >= 9) return "#9966ff";
  if (s >= 7) return "#ff375f";
  if (s >= 5.5) return "#ff9100";
  if (s >= 4) return "#ffb800";
  if (s >= 2.5) return "#66cc44";
  return "#0a84ff";
};

/** 难度列表项（横向 list 卡片） */
const DifficultyRow: React.FC<{
  beatmap: Beatmap;
  mode: GameMode;
  canPlay: boolean;
  bestScore?: ScoreRecord;
  onPlay: () => void;
}> = ({ beatmap, mode, canPlay, bestScore, onPlay }) => {
  const [hover, setHover] = useState(false);
  const sc = starColor(beatmap.difficulty_rating);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: "var(--card-info-bg)",
        border: `1px solid ${hover ? sc : "var(--border)"}`,
        borderLeft: `3px solid ${sc}`,
        transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
        transform: hover ? "translateX(2px)" : "none",
      }}
    >
      {/* 模式图标 */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${MODE_COLOR[mode]}1a`,
        }}
      >
        <OsuModeIcon mode={mode} size={20} color={MODE_COLOR[mode]} />
      </div>

      {/* 左：版本名 */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 auto" }}>
        <div
          className="font-torus"
          style={{
            fontSize: 13, fontWeight: 600, color: "#fff",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          {beatmap.version || "Default"}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
          {beatmap.bpm && <span>{beatmap.bpm} BPM</span>}
          <span>{formatTime(beatmap.total_length)}</span>
          <span className="hidden sm:inline">AR {beatmap.ar?.toFixed(1) ?? "-"}</span>
          <span className="hidden sm:inline">CS {beatmap.cs?.toFixed(1) ?? "-"}</span>
          <span className="hidden sm:inline">OD {beatmap.od?.toFixed(1) ?? "-"}</span>
          <span className="hidden sm:inline">HP {beatmap.hp?.toFixed(1) ?? "-"}</span>
        </div>
      </div>

      {/* 中：星级条 + 数字 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div style={{ width: 80 }} className="hidden sm:block">
          <StarRatingBar stars={beatmap.difficulty_rating} variant="full" height={5} />
        </div>
        <span
          className="hud-num font-torus"
          style={{ fontSize: 13, fontWeight: 700, color: sc, minWidth: 40, textAlign: "right" }}
        >
          {beatmap.difficulty_rating.toFixed(2)}
        </span>
      </div>

      {/* 最佳成绩 */}
      {bestScore && (
        <div
          className="hidden md:flex"
          style={{ alignItems: "center", gap: 6, fontSize: 11, flexShrink: 0 }}
        >
          {bestScore.pp > 0 && (
            <>
              <span className="hud-num" style={{ color: "var(--accent)", fontWeight: 800 }}>
                {bestScore.pp.toFixed(0)}pp
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
            </>
          )}
          <span
            className="hud-num"
            style={{ color: GRADE_COLOR[bestScore.grade], fontWeight: 900, fontSize: 12 }}
          >
            {bestScore.grade}
          </span>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{bestScore.accuracy.toFixed(2)}%</span>
        </div>
      )}

      {/* 右：播放按钮 */}
      <button
        onClick={onPlay}
        disabled={!canPlay}
        aria-label="游玩"
        style={{
          width: 34, height: 34, borderRadius: "var(--radius-sm)",
          flexShrink: 0,
          border: "none",
          background: canPlay ? sc : "var(--surface-hover)",
          color: canPlay ? "#fff" : "var(--text-secondary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: canPlay ? "pointer" : "not-allowed",
          opacity: canPlay ? 1 : 0.4,
          transition: "all 0.2s ease",
        }}
      >
        <Play size={14} fill="currentColor" />
      </button>
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
  const bgDownloads = useGameStore((s) => s.bgDownloads);
  const bgDownloadSet = useGameStore((s) => s.bgDownloadSet);
  const cancelBgDownload = useGameStore((s) => s.cancelBgDownload);
  const downloadError = useGameStore((s) => s.downloadError);
  const startGame = useGameStore((s) => s.startGame);

  const [filterMode, setFilterMode] = useState<GameMode | null>(null);
  const [fullPackage, setFullPackage] = useState(() => useGameStore.getState().settings.downloadFullPackage);
  const [bestScores, setBestScores] = useState<Record<number, ScoreRecord | undefined>>({});
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

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

  // 当前谱面的后台下载任务
  const bgTask = setId ? bgDownloads.find((t) => t.setId === Number(setId)) : undefined;
  const bgDownloading = !!bgTask && (bgTask.status === "downloading" || bgTask.status === "extracting");

  const handleDownload = () => {
    if (!detailSet) return;
    bgDownloadSet(detailSet, fullPackage);
  };

  const loadedHasVideoMissing = !!loaded && !loaded.videoUrl &&
    (loaded.beatmaps || []).some((b) => b.parsed?.videoFilename);

  const handleDownloadFull = () => {
    if (!detailSet) return;
    bgDownloadSet(detailSet, true);
  };

  const handleStart = (beatmap: Beatmap, mode: GameMode) => {
    if (!detailSet) return;
    startGame(detailSet, beatmap, mode);
    navigate(`/game/${detailSet.id}/${mode}/${beatmap.id}`);
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
          <div style={{ position: "relative", height: "clamp(200px, 30vw, 340px)", overflow: "hidden" }}>
            <BeatmapCover
              src={cover}
              alt={detailSet?.title}
              placeholderSize={72}
              loading={isLoading}
              loadingIndicator={<OsuLogoIcon size={56} color="var(--accent)" className="loading-entrance" />}
              style={{ position: "absolute", inset: 0 }}
              imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.55)",
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
            {loaded && !bgDownloading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={20} style={{ color: "var(--accent)" }} />
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>
                  已下载 {loaded.beatmaps.length} 个难度
                </span>
                {loadedHasVideoMissing && (
                  <button
                    onClick={handleDownloadFull}
                    className="hud-btn"
                    style={{
                      padding: "6px 12px", fontSize: 12, fontWeight: 600,
                      color: "var(--accent)",
                    }}
                  >
                    下载完整包
                  </button>
                )}
              </div>
            ) : bgDownloading ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                    {bgTask?.status === "extracting" ? (
                      <><Loader2 size={13} className="animate-spin" style={{ animationDuration: "1.5s" }} /> 解压中…</>
                    ) : (
                      <><Download size={13} /> 后台下载中…</>
                    )}
                  </span>
                  <span className="hud-num" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    {Math.round((bgTask?.progress ?? 0) * 100)}%
                  </span>
                </div>
                <div className="hud-bar-track" style={{ height: 6 }}>
                  <div className="hud-bar-fill" style={{ width: `${(bgTask?.progress ?? 0) * 100}%` }} />
                </div>
                <button
                  onClick={() => cancelBgDownload(Number(setId))}
                  className="hud-btn"
                  style={{ marginTop: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: "var(--error)" }}
                >
                  取消下载
                </button>
              </div>
            ) : bgTask?.status === "error" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: "var(--error)" }}>
                  下载失败：{bgTask.error}
                </p>
                <button onClick={handleDownload} className="lazer-cta" style={{ width: "100%", padding: "12px 20px", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Download size={16} /> 重试下载
                </button>
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
                          color: fullPackage === opt.val ? "var(--accent)" : "var(--text-secondary)",
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
            {downloadError && !bgTask && (
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
                color: filterMode === null ? "var(--accent)" : "var(--text-secondary)",
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

      {/* 难度列表 */}
      <section className="mt-4 animate-enter animate-enter-3">
        {sorted.length === 0 ? (
          <div style={{
            padding: 32, textAlign: "center", fontSize: 13, color: "var(--text-secondary)",
            borderRadius: "var(--radius-lg)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
          }}>
            {isLoading ? "加载中…" : "无难度"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((b) => {
              const mode = MODE_FROM_NUM[b.mode];
              const canPlay = !!loaded;
              return (
                <DifficultyRow
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

    </div>
  );
}
