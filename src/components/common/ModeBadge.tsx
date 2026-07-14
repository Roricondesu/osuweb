import React from "react";
import { MODE_COLOR, type GameMode } from "@/types";

interface ModeBadgeProps {
  mode: GameMode;
  size?: "sm" | "md";
}

/** osu! 模式图标 SVG 路径 */
const MODE_PATHS: Record<GameMode, string> = {
  standard: "M7 1.5C3.96 1.5 1.5 3.96 1.5 7s2.46 5.5 5.5 5.5 5.5-2.46 5.5-5.5S10.04 1.5 7 1.5zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z",
  taiko: "M2 4h12v2.5H2V4zm0 3.5h12V10H2V7.5zM2 11h12v2.5H2V11z",
  catch: "M7 2C4.5 2 2.5 3.8 2.5 6c0 1 .4 1.9 1 2.6L7 13l3.5-4.4c.6-.7 1-1.6 1-2.6 0-2.2-2-4-4.5-4z",
  mania: "M3 2h2v12H3V2zm3 0h2v12H6V2zm3 0h2v12H9V2zm3 0h2v12h-2V2z",
};

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
      <svg width={iconSize} height={iconSize} viewBox="0 0 14 14" fill="none">
        <path d={MODE_PATHS[mode]} fill={color} />
      </svg>
    </span>
  );
};
