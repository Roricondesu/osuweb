import React, { useState } from "react";
import type { BeatmapSet } from "@/types";
import { StarRatingBar } from "./StarRatingBar";
import { StatusBadge } from "./StatusBadge";
import { BeatmapCover } from "./BeatmapCover";
import { StoryboardBadge, VideoBadge } from "./StoryboardBadge";
import { useNavigate } from "react-router-dom";
import { useFavoritesStore } from "@/store/useFavoritesStore";
import { Heart, Play } from "lucide-react";

interface BeatmapCardProps {
  set: BeatmapSet;
  index?: number;
}

/** osu! 模式图标（白色 SVG，14×14） */
const ModeIcon: React.FC<{ mode: number }> = ({ mode }) => {
  // 0=osu! 1=taiko 2=catch 3=mania
  const paths: Record<number, string> = {
    0: "M7 1.5C3.96 1.5 1.5 3.96 1.5 7s2.46 5.5 5.5 5.5 5.5-2.46 5.5-5.5S10.04 1.5 7 1.5zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z",
    1: "M2 4h12v2.5H2V4zm0 3.5h12V10H2V7.5zM2 11h12v2.5H2V11z",
    2: "M7 2C4.5 2 2.5 3.8 2.5 6c0 1 .4 1.9 1 2.6L7 13l3.5-4.4c.6-.7 1-1.6 1-2.6 0-2.2-2-4-4.5-4z",
    3: "M3 2h2v12H3V2zm3 0h2v12H6V2zm3 0h2v12H9V2zm3 0h2v12h-2V2z",
  };
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d={paths[mode] || paths[0]} fill="#fff" />
    </svg>
  );
};

export const BeatmapCard: React.FC<BeatmapCardProps> = React.memo(({ set, index = 0 }) => {
  const navigate = useNavigate();
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [hover, setHover] = useState(false);

  const cover = set.covers?.["cover@2x"] || set.covers?.cover || set.covers?.card || "";
  const maxStars = set.beatmaps.length
    ? Math.max(...set.beatmaps.map((b) => b.difficulty_rating))
    : 0;
  const modes = new Set(
    set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3),
  );
  const modeList = Array.from(modes);
  const isFav = favorites.includes(set.id);

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
          ? "0 6px 20px rgba(0,0,0,0.35)"
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
          src={cover}
          alt={set.title}
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
        {cover && (
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${cover})`,
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
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, #2E3835 0%, rgba(46,56,53,0.1) 100%)",
          }}
        />

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
              {set.title_unicode || set.title}
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
              {set.artist_unicode || set.artist}
            </div>
            <div
              style={{
                fontSize: 11, fontWeight: 500,
                color: "#dbefe8",
                marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              by {set.creator}
            </div>
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
            <StatusBadge status={set.status} />
            {modeList.map((m) => (
              <ModeIcon key={m} mode={m} />
            ))}
            {set.hasStoryboard && <StoryboardBadge />}
            {set.hasVideo && <VideoBadge />}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <StarRatingBar stars={maxStars} variant="dots" />
              <span
                className="hud-num font-torus"
                style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}
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
            transform: hover ? "translateY(-50%) scale(1)" : "translateY(-50%) scale(0.6)",
            width: 30, height: 30, borderRadius: "50%",
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            opacity: hover ? 1 : 0,
            transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
            zIndex: 4,
          }}
        >
          <Play size={13} fill="currentColor" />
        </button>
      </div>
    </div>
  );
});
BeatmapCard.displayName = "BeatmapCard";
