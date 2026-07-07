import React from "react";
import { MODE_LABEL, MODE_COLOR, type GameMode } from "@/types";

interface ModeBadgeProps {
  mode: GameMode;
  size?: "sm" | "md";
}

export const ModeBadge: React.FC<ModeBadgeProps> = ({ mode, size = "sm" }) => {
  const fontSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? "2px 6px" : "4px 10px";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize,
        fontWeight: 700,
        padding,
        borderRadius: 999,
        background: `${MODE_COLOR[mode]}22`,
        color: MODE_COLOR[mode],
        letterSpacing: "-0.01em",
      }}
    >
      {MODE_LABEL[mode]}
    </span>
  );
};
