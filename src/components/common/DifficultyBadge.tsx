import React from "react";

interface DifficultyBadgeProps {
  stars: number;
  size?: "sm" | "md";
}

/** 难度星级显示，颜色随星级递进 */
export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ stars, size = "sm" }) => {
  const fontSize = size === "sm" ? 11 : 13;
  const padding = size === "sm" ? "2px 8px" : "4px 12px";

  let color = "#66cc44";
  if (stars >= 6) color = "#ff375f";
  else if (stars >= 5) color = "#ff9100";
  else if (stars >= 4) color = "#ffb800";
  else if (stars >= 2.5) color = "#66cc44";
  else color = "#0a84ff";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize,
        fontWeight: 700,
        padding,
        borderRadius: 999,
        background: `${color}1f`,
        color,
        letterSpacing: "-0.01em",
      }}
    >
      ★ {stars.toFixed(2)}
    </span>
  );
};
