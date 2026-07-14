import React, { useRef, useState } from "react";
import type { BeatmapSet } from "@/types";
import { StarRatingBar } from "./StarRatingBar";
import { ModeBadge } from "./ModeBadge";
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

export const BeatmapCard: React.FC<BeatmapCardProps> = React.memo(({ set, index = 0 }) => {
  const navigate = useNavigate();
  const playSet = usePlayerStore((s) => s.playSet);
  const currentSet = usePlayerStore((s) => s.currentSet);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [hover, setHover] = useState(false);
  const previewTimer = useRef<number | null>(null);

  const cover = set.covers?.["cover@2x"] || set.covers?.cover || "";
  const minStars = set.beatmaps.length
    ? Math.min(...set.beatmaps.map((b) => b.difficulty_rating))
    : 0;
  const modes = new Set(
    set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3),
  );
  const modeList = Array.from(modes).slice(0, 2);
  const modeNames = ["standard", "taiko", "catch", "mania"] as const;
  const isFav = favorites.includes(set.id);
  const isCurrent = currentSet?.id === set.id;

  const handleMouseEnter = () => {
    setHover(true);
    // 延迟 300ms 播放预览（避免快速划过）
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
        overflow: "hidden",
        borderRadius: 16,
        animation: "stagger-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        animationDelay: `${0.04 + (index % 12) * 0.03}s`,
        transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover
          ? "0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px var(--glass-border)"
          : "var(--glass-shadow)",
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* 封面区 */}
      <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden" }}>
        <BeatmapCover
          src={cover}
          alt={set.title}
          placeholderSize={48}
          style={{ position: "absolute", inset: 0 }}
          imgStyle={{
            width: "100%", height: "100%", objectFit: "cover",
            transform: hover ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        {/* 左上：模式/标识 */}
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
          {modeList.map((m) => (
            <ModeBadge key={m} mode={modeNames[m]} />
          ))}
          {set.hasStoryboard && <StoryboardBadge />}
          {set.hasVideo && <VideoBadge />}
        </div>
        {/* 右上：收藏 */}
        <button
          onClick={handleFavClick}
          aria-label={isFav ? "取消收藏" : "收藏"}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: isFav ? "#ff375f" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            transform: hover ? "scale(1)" : "scale(0.85)",
            opacity: hover || isFav ? 1 : 0.7,
          }}
        >
          <Heart size={14} fill={isFav ? "currentColor" : "none"} />
        </button>
        {/* 右下：快开按钮（hover 显示） */}
        <button
          onClick={handlePlayClick}
          aria-label="打开"
          style={{
            position: "absolute", bottom: 8, right: 8,
            width: 36, height: 36, borderRadius: "50%",
            border: "none",
            background: "var(--lazer-gradient)",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(136,102,255,0.5)",
            opacity: hover ? 1 : 0,
            transform: hover ? "scale(1)" : "scale(0.7)",
            transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <Play size={16} fill="currentColor" />
        </button>
        {/* 播放指示器 */}
        {isCurrent && isPlaying && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 999,
            background: "var(--lazer-gradient)",
            color: "#fff", fontSize: 10, fontWeight: 700,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%", background: "#fff",
              animation: "pulse-dot 1s ease-in-out infinite",
            }} />
            播放中
          </div>
        )}
        <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>

      {/* 信息区 */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: "var(--text-primary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          letterSpacing: "-0.01em",
        }}>
          {set.title_unicode || set.title}
        </div>
        <div style={{
          fontSize: 12, color: "var(--text-secondary)",
          marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {set.artist_unicode || set.artist} · {set.creator}
        </div>
        {/* 星级条 */}
        <div style={{ marginTop: 8 }}>
          <StarRatingBar stars={minStars} variant="compact" />
        </div>
      </div>
    </div>
  );
});
BeatmapCard.displayName = "BeatmapCard";
