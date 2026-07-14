import React from "react";
import { MODE_COLOR, type GameMode } from "@/types";
import { OsuModeIcon } from "./OsuIcons";

interface ModeBadgeProps {
  mode: GameMode;
  size?: "sm" | "md";
}

/** osu! 模式图标徽标（使用官方图标） */
export const ModeBadge: React.FC<ModeBadgeProps> = ({ mode, size = "sm" }) => {
  const iconSize = size === "sm" ? 14 : 18;
  const color = MODE_COLOR[mode];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: iconSize + 6,
        height: iconSize + 6,
        borderRadius: 6,
        background: `${color}1a`,
      }}
    >
      <OsuModeIcon mode={mode} size={iconSize} color={color} />
    </span>
  );
};
