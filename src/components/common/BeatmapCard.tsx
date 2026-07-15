import React, { useState } from "react";
import type { BeatmapSet, LoadedBeatmapSet, Beatmap } from "@/types";
import { StarRatingBar } from "./StarRatingBar";
import { StatusBadge } from "./StatusBadge";
import { BeatmapCover } from "./BeatmapCover";
import { StoryboardBadge, VideoBadge } from "./StoryboardBadge";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, CheckCircle2, Heart } from "lucide-react";
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

  return (
    <div
      onClick={() => navigate(`/set/${data.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
      {/* 底层：lime 面板（整个卡片最底层，hover 时被上层遮挡区域缩小而露出） */}
      {!isLoadedSet(set) && !isDownloaded && (
        <div
          style={{
            position: "absolute",
            top: 0, right: 0, bottom: 0,
            width: 38,
            background: "#D4F792",
            zIndex: 0,
          }}
        />
      )}

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
        {/* 难度计数徽章（左下角黑色圆） */}
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
          {data.beatmaps.length}
        </div>
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
        {/* 深色背景（模糊封面+渐变），hover 时向左收缩露出底层 lime，右边缘圆角即 lime 左边缘形状 */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, bottom: 0,
            right: hover && !isLoadedSet(set) && !isDownloaded ? 38 : 0,
            borderRadius: "10px 20px 20px 10px",
            overflow: "hidden",
            zIndex: 2,
            transition: "right 0.3s cubic-bezier(0.22,1,0.36,1)",
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
        </div>

        {/* 内容层 */}
        <div
          style={{
            position: "relative",
            height: "100%",
            padding: hover && !isLoadedSet(set) && !isDownloaded ? "7px 48px 7px 10px" : "7px 10px",
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

          {/* 下部：状态徽章 + 模式图标 + 星级色点 */}
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
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <StarRatingBar stars={data.maxStars} variant="dots" />
              <span
                className="hud-num font-torus"
                style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}
              >
                {data.maxStars.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧操作按钮（叠在底层 lime 面板上，hover 时淡入） */}
        {!isLoadedSet(set) && !isDownloaded && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 38,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: hover ? 1 : 0,
              transition: "opacity 0.25s cubic-bezier(0.22,1,0.36,1) 0.1s",
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
                color: "#2E3835",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: hover ? 1 : 0,
                transform: hover ? "scale(1)" : "scale(0.7)",
                transition: "all 0.25s cubic-bezier(0.22,1,0.36,1) 0.1s",
              }}
            >
              <Heart size={16} fill={isFavorite ? "#2E3835" : "none"} />
            </button>
            <button
              onClick={handleDownloadClick}
              aria-label={isDownloading ? "下载中" : "后台下载"}
              style={{
                background: "transparent",
                border: "none",
                padding: 4,
                color: "#2E3835",
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
          </div>
        )}

        {/* 已下载标识 */}
        {isDownloaded && !downloaded && (
          <CheckCircle2
            size={18}
            style={{
              position: "absolute", top: "calc(50% + 1px)", left: "50%",
              transform: "translate(-50%, -50%)",
              color: "var(--accent)",
              opacity: hover ? 1 : 0,
              transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
              zIndex: 4,
            }}
          />
        )}
      </div>
    </div>
  );
});
BeatmapCard.displayName = "BeatmapCard";
