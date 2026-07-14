import React, { useRef, useState } from "react";
import type { BeatmapSet } from "@/types";
import { StarRatingBar } from "./StarRatingBar";
import { StatusBadge } from "./StatusBadge";
import { BeatmapCover } from "./BeatmapCover";
import { StoryboardBadge, VideoBadge } from "./StoryboardBadge";
import { useNavigate } from "react-router-dom";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Heart, Play } from "lucide-react";

interface BeatmapCardProps {
  set: BeatmapSet;
  index?: number;
}

const PREVIEW_URL = (setId: number) => `https://b.ppy.sh/preview/${setId}.mp3`;

/** osu! 模式图标 SVG（白色，14×14） */
const ModeIcon: React.FC<{ mode: number }> = ({ mode }) => {
  // 0=osu! 1=taiko 2=catch 3=mania
  const labels = ["osu!", "taiko", "catch", "mania"];
  const colors = ["#66ccff", "#ff66aa", "#66e0aa", "#cc99ff"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: `${colors[mode]}22`,
        color: colors[mode],
        fontSize: 8,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {labels[mode][0].toUpperCase()}
    </span>
  );
};

export const BeatmapCard: React.FC<BeatmapCardProps> = React.memo(({ set, index = 0 }) => {
  const navigate = useNavigate();
  const playSet = usePlayerStore((s) => s.playSet);
  const currentSet = usePlayerStore((s) => s.currentSet);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [hover, setHover] = useState(false);
  const previewTimer = useRef<number | null>(null);

  const cover = set.covers?.["cover@2x"] || set.covers?.cover || set.covers?.card || "";
  const maxStars = set.beatmaps.length
    ? Math.max(...set.beatmaps.map((b) => b.difficulty_rating))
    : 0;
  const modes = new Set(
    set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3),
  );
  const modeList = Array.from(modes);
  const isFav = favorites.includes(set.id);
  const isCurrent = currentSet?.id === set.id;

  const handleMouseEnter = () => {
    setHover(true);
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => {
      if (!isCurrent) {
        playSet(set, PREVIEW_URL(set.id), cover);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    setHover(false);
    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/set/${set.id}`);
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(set.id);
  };

  return (
    <div
      onClick={() => navigate(`/set/${set.id}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hover
          ? "0 8px 24px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* 左侧方形封面 */}
      <div
        style={{
          position: "relative",
          width: 100,
          minWidth: 100,
          height: "100%",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <BeatmapCover
          src={cover}
          alt={set.title}
          placeholderSize={32}
          style={{ position: "absolute", inset: 0 }}
          imgStyle={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: hover ? "scale(1.06)" : "scale(1)",
            transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        {/* 播放计数徽章（左上角黑色圆） */}
        <div
          style={{
            position: "absolute", top: 5, left: 5,
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 400, color: "#fff",
            backdropFilter: "blur(4px)",
          }}
        >
          {set.beatmaps.length}
        </div>
        {/* 收藏按钮（右上角） */}
        <button
          onClick={handleFavClick}
          aria-label={isFav ? "取消收藏" : "收藏"}
          style={{
            position: "absolute", top: 5, right: 5,
            width: 22, height: 22, borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.5)",
            color: isFav ? "#ff375f" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            opacity: hover || isFav ? 1 : 0,
            transform: hover ? "scale(1)" : "scale(0.8)",
          }}
        >
          <Heart size={11} fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>

      {/* 右侧信息盒（osu!web 风格：深色底 + 模糊封面渐变叠层） */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          marginLeft: -7,
          borderRadius: 10,
          overflow: "hidden",
          background: "#1a231f",
        }}
      >
        {/* 模糊封面作为背景渐变 */}
        {cover && (
          <>
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(20px) brightness(0.3) saturate(1.4)",
                transform: "scale(1.2)",
                opacity: hover ? 0.5 : 0.35,
                transition: "opacity 0.3s ease",
              }}
            />
            <div
              style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(120deg, rgba(26,35,31,0.85) 0%, rgba(26,35,31,0.6) 100%)",
              }}
            />
          </>
        )}

        {/* 内容层 */}
        <div
          style={{
            position: "relative",
            height: "100%",
            padding: "6px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* 上部：标题 + 艺人 + mapper */}
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: 15, fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                letterSpacing: "-0.01em",
                lineHeight: 1.25,
              }}
            >
              {set.title_unicode || set.title}
            </div>
            <div
              style={{
                fontSize: 12, fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              {set.artist_unicode || set.artist}
            </div>
            <div
              style={{
                fontSize: 11, fontWeight: 500,
                color: "#dbefe8",
                marginTop: 2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              by {set.creator}
            </div>
          </div>

          {/* 下部：状态徽章 + 模式 + 星级色点 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <StatusBadge status={set.status} />
            {modeList.map((m) => (
              <ModeIcon key={m} mode={m} />
            ))}
            {set.hasStoryboard && <StoryboardBadge />}
            {set.hasVideo && <VideoBadge />}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <StarRatingBar stars={maxStars} variant="dots" />
              <span
                className="hud-num"
                style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}
              >
                {maxStars.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* hover 快开按钮 */}
        <button
          onClick={handlePlayClick}
          aria-label="打开"
          style={{
            position: "absolute", top: "50%", right: 10,
            transform: hover ? "translateY(-50%) scale(1)" : "translateY(-50%) scale(0.7)",
            width: 32, height: 32, borderRadius: "50%",
            border: "none",
            background: "var(--lazer-gradient)",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(136,102,255,0.5)",
            opacity: hover ? 1 : 0,
            transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <Play size={14} fill="currentColor" />
        </button>

        {/* 播放指示器 */}
        {isCurrent && isPlaying && (
          <div
            style={{
              position: "absolute", bottom: 6, right: 10,
              display: "flex", alignItems: "center", gap: 3,
              padding: "2px 7px", borderRadius: 999,
              background: "var(--lazer-gradient)",
              color: "#fff", fontSize: 9, fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 4, height: 4, borderRadius: "50%", background: "#fff",
                animation: "pulse-dot 1s ease-in-out infinite",
              }}
            />
            播放中
          </div>
        )}
      </div>
    </div>
  );
});
BeatmapCard.displayName = "BeatmapCard";
