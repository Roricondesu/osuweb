import React from "react";

interface StarRatingBarProps {
  stars: number;
  /** 显示模式：full 宽条 + 数值，compact 窄条 + 数值 */
  variant?: "full" | "compact";
  height?: number;
}

/** 星级渐变色（osu! 官方：绿→黄→红→紫） */
const starColor = (s: number): string => {
  if (s >= 9) return "#9966ff";
  if (s >= 7) return "#ff375f";
  if (s >= 5.5) return "#ff9100";
  if (s >= 4) return "#ffb800";
  if (s >= 2.5) return "#66cc44";
  return "#0a84ff";
};

/** lazer 风格星级条形：横向渐变填充 + 数值 */
export const StarRatingBar: React.FC<StarRatingBarProps> = ({ stars, variant = "full", height }) => {
  const pct = Math.min(100, (stars / 10) * 100);
  const color = starColor(stars);
  const h = height ?? (variant === "full" ? 8 : 6);

  if (variant === "compact") {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 60,
            height: h,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 999,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${color}, ${color}dd)`,
              borderRadius: 999,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span className="hud-num" style={{ fontSize: 11, fontWeight: 700, color }}>
          {stars.toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div
        style={{
          flex: 1,
          height: h,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 999,
            boxShadow: `0 0 8px ${color}66`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span className="hud-num" style={{ fontSize: 13, fontWeight: 800, color, minWidth: 44, textAlign: "right" }}>
        {stars.toFixed(2)}
      </span>
    </div>
  );
};
