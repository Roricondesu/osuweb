import React, { useState, useRef, useEffect, useCallback } from "react";
import type { BeatmapSet, LoadedBeatmapSet, Beatmap } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { BeatmapCover } from "./BeatmapCover";
import { StoryboardBadge, VideoBadge } from "./StoryboardBadge";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, CheckCircle2, Heart, Play, Pause } from "lucide-react";
import { OsuModeIconById } from "./OsuIcons";
import { useGameStore } from "@/store/useGameStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";

interface BeatmapCardProps {
  set: BeatmapSet | LoadedBeatmapSet;
  index?: number;
  /** 是否作为已下载卡片展示（带下载完成标识） */
  downloaded?: boolean;
}

const isLoadedSet = (s: BeatmapSet | LoadedBeatmapSet): s is LoadedBeatmapSet =>
  "setId" in s && typeof s.setId === "number";

/** 星级渐变色（osu! 官方：绿→黄→红→紫） */
const starColor = (s: number): string => {
  if (s >= 9) return "#9966ff";
  if (s >= 7) return "#ff375f";
  if (s >= 5.5) return "#ff9100";
  if (s >= 4) return "#ffb800";
  if (s >= 2.5) return "#66cc44";
  return "#0a84ff";
};

/** 获取试听音频 URL */
const getPreviewUrl = (set: BeatmapSet | LoadedBeatmapSet): string | null => {
  if (isLoadedSet(set)) {
    return set.audioUrl || null;
  }
  return `https://b.ppy.sh/preview/${set.id}.mp3`;
};

const getCardData = (s: BeatmapSet | LoadedBeatmapSet) => {
  if (isLoadedSet(s)) {
    const beatmaps: Beatmap[] = s.beatmaps || [];
    const maxStars = beatmaps.length
      ? Math.max(...beatmaps.map((b) => b.difficulty_rating || 0))
      : 0;
    const modes = new Set(beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3));
    const creator = beatmaps[0]?.parsed?.creator || beatmaps[0]?.version || "";
    return {
      id: s.setId,
      title: s.title,
      artist: s.artist,
      creator,
      cover: s.cover,
      status: "downloaded",
      beatmaps,
      hasStoryboard: s.hasStoryboard,
      hasVideo: s.videoUrl !== undefined,
      maxStars,
      modes: Array.from(modes),
    };
  }
  const beatmaps = s.beatmaps || [];
  const maxStars = beatmaps.length
    ? Math.max(...beatmaps.map((b) => b.difficulty_rating || 0))
    : 0;
  const modes = new Set(beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3));
  return {
    id: s.id,
    title: s.title_unicode || s.title,
    artist: s.artist_unicode || s.artist,
    creator: s.creator,
    cover: s.covers?.["cover@2x"] || s.covers?.cover || s.covers?.card || "",
    status: s.status,
    beatmaps,
    hasStoryboard: s.hasStoryboard,
    hasVideo: s.hasVideo,
    maxStars,
    modes: Array.from(modes),
  };
};

export const BeatmapCard: React.FC<BeatmapCardProps> = React.memo(({ set, index = 0, downloaded = false }) => {
  const navigate = useNavigate();
  const data = getCardData(set);
  const setId = data.id;
  const bgDownloadSet = useGameStore((s) => s.bgDownloadSet);
  const isDownloaded = useGameStore((s) => s.downloaded.has(setId));
  const bgTask = useGameStore((s) => s.bgDownloads.find((t) => t.setId === setId));
  const [hover, setHover] = useState(false);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(data.id));

  // 试听音频状态
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const previewUrl = getPreviewUrl(set);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  }, []);

  // 组件卸载时清理音频
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!previewUrl) return;

    if (playing) {
      stopPreview();
      return;
    }

    // 停止其他可能正在播放的音频
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(previewUrl);
    audio.volume = 0.7;
    audioRef.current = audio;

    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("error", () => setPlaying(false));

    audio.play().then(() => {
      setPlaying(true);
      // 10 秒后自动停止
      setTimeout(() => {
        if (audioRef.current === audio) {
          stopPreview();
        }
      }, 10000);
    }).catch(() => setPlaying(false));
  };

  const isDownloading = bgTask && (bgTask.status === "downloading" || bgTask.status === "extracting");

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoadedSet(set) && !isDownloaded && !isDownloading) {
      bgDownloadSet(set);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(data.id);
  };

  // 难度按星级排序，最多显示 8 个
  const sortedDiffs = [...data.beatmaps]
    .sort((a, b) => (a.difficulty_rating || 0) - (b.difficulty_rating || 0))
    .slice(0, 8);

  return (
    <div
      onClick={() => navigate(`/set/${data.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); if (playing) stopPreview(); }}
      style={{
        cursor: "pointer",
        position: "relative",
        display: "flex",
        width: "100%",
        height: 100,
        borderRadius: 10,
        overflow: "hidden",
        animation: "stagger-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        animationDelay: `${0.04 + (index % 12) * 0.03}s`,
        transition: "transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover
          ? `0 6px 20px rgba(0,0,0,0.35)`
          : "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      {/* 左侧方形封面（100×100） */}
      <div
        style={{
          position: "relative",
          width: 100,
          minWidth: 100,
          height: "100%",
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <BeatmapCover
          src={data.cover}
          alt={data.title}
          placeholderSize={32}
          style={{ position: "absolute", inset: 0 }}
          imgStyle={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: hover ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        {/* hover 变暗遮罩 */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.45)",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.25s ease",
            zIndex: 3,
          }}
        />
        {/* 播放按钮 */}
        {previewUrl && (
          <button
            onClick={handlePlayClick}
            aria-label={playing ? "停止试听" : "试听 10 秒"}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: hover
                ? "translate(-50%, -50%) scale(1)"
                : "translate(-50%, -50%) scale(0.5)",
              width: 38, height: 38, borderRadius: "50%",
              border: "none",
              background: playing ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              opacity: hover ? 1 : 0,
              transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
              zIndex: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {playing ? (
              <Pause size={18} fill="#2E3835" color="#2E3835" />
            ) : (
              <Play size={18} fill="#2E3835" color="#2E3835" style={{ marginLeft: 2 }} />
            )}
          </button>
        )}
      </div>

      {/* 右侧信息盒：封面叠 7px，深灰渐变半透明遮罩 + 模糊封面透过 */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          marginLeft: -7,
          borderRadius: 10,
          overflow: "hidden",
          zIndex: 3,
        }}
      >
        {/* 模糊封面作为背景（透过渐变可见） */}
        {data.cover && (
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${data.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(18px) brightness(0.4) saturate(1.3)",
              transform: "scale(1.3)",
              opacity: hover ? 0.6 : 0.45,
              transition: "opacity 0.3s ease",
            }}
          />
        )}
        {/* 深灰渐变半透明遮罩：左 #2E3835 → 右 70%透明（封面透过） */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #2E3835 0%, rgba(46,56,53,0.1) 70%)",
          }}
        />

        {/* 内容层 */}
        <div
          style={{
            position: "relative",
            height: "100%",
            padding: hover && !isLoadedSet(set) && !downloaded ? "7px 40px 7px 10px" : "7px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            transition: "padding 0.3s cubic-bezier(0.22,1,0.36,1)",
            zIndex: 3,
          }}
        >
          {/* 上部：标题 + 艺人 + mapper */}
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <div
              className="font-torus"
              style={{
                fontSize: 15, fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {data.title}
            </div>
            <div
              style={{
                fontSize: 12, fontWeight: 500,
                color: "rgba(255,255,255,0.7)",
                marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              {data.artist}
            </div>
            {data.creator && (
              <div
                style={{
                  fontSize: 11, fontWeight: 500,
                  color: "#dbefe8",
                  marginTop: 1,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  lineHeight: 1.3,
                }}
              >
                by {data.creator}
              </div>
            )}
          </div>

          {/* 下部：状态徽章 + 模式图标 + 难度色块 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexWrap: "nowrap",
              overflow: "hidden",
            }}
          >
            <StatusBadge status={data.status} />
            {data.modes.map((m) => (
              <OsuModeIconById key={m} mode={m} size={14} color="#fff" />
            ))}
            {data.hasStoryboard && <StoryboardBadge />}
            {data.hasVideo && <VideoBadge />}
            {/* 难度色块：每个难度一个竖条，颜色按星级 */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
              {sortedDiffs.map((b) => (
                <div
                  key={b.id}
                  title={`${b.version} ★${(b.difficulty_rating || 0).toFixed(2)}`}
                  style={{
                    width: 4,
                    height: 14,
                    borderRadius: 2,
                    background: starColor(b.difficulty_rating || 0),
                    opacity: 0.9,
                  }}
                />
              ))}
              <span
                className="hud-num font-torus"
                style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginLeft: 4 }}
              >
                {data.maxStars.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧操作面板：hover 时从右侧滑入；未下载灰、下载完成后丝滑切 lime */}
        {!isLoadedSet(set) && !downloaded && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 32,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: isDownloaded ? "#D4F792" : "#5C6970",
              transition: "background 0.45s cubic-bezier(0.22,1,0.36,1), transform 0.3s cubic-bezier(0.22,1,0.36,1)",
              transform: hover ? "translateX(0)" : "translateX(100%)",
              zIndex: 4,
            }}
          >
            <button
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? "取消收藏" : "收藏"}
              style={{
                background: "transparent",
                border: "none",
                padding: 4,
                color: isDownloaded ? "#2E3835" : "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: hover ? 1 : 0,
                transform: hover ? "scale(1)" : "scale(0.7)",
                transition: "color 0.45s cubic-bezier(0.22,1,0.36,1), all 0.25s cubic-bezier(0.22,1,0.36,1) 0.1s",
              }}
            >
              <Heart size={16} fill={isFavorite ? (isDownloaded ? "#2E3835" : "#fff") : "none"} />
            </button>
            {isDownloaded ? (
              <span
                aria-label="已下载"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2E3835",
                  opacity: hover ? 1 : 0,
                  transform: hover ? "scale(1)" : "scale(0.7)",
                  transition: "all 0.25s cubic-bezier(0.22,1,0.36,1) 0.15s",
                }}
              >
                <CheckCircle2 size={16} />
              </span>
            ) : (
              <button
                onClick={handleDownloadClick}
                aria-label={isDownloading ? "下载中" : "后台下载"}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 4,
                  color: "#fff",
                  cursor: isDownloading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: hover ? 1 : 0,
                  transform: hover ? "scale(1)" : "scale(0.7)",
                  transition: "all 0.25s cubic-bezier(0.22,1,0.36,1) 0.15s",
                }}
              >
                {isDownloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
BeatmapCard.displayName = "BeatmapCard";
