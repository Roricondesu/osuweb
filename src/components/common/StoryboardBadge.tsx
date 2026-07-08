import React from "react";
import { Film } from "lucide-react";

interface StoryboardBadgeProps {
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/** Storyboard 标识徽标 */
export const StoryboardBadge: React.FC<StoryboardBadgeProps> = ({
  size = "sm",
  style,
}) => {
  const iconSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? "2px 6px" : "4px 8px";
  const fontSize = size === "sm" ? 10 : 12;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding,
        borderRadius: 6,
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        fontSize,
        fontWeight: 600,
        ...style,
      }}
    >
      <Film size={iconSize} /> Storyboard
    </span>
  );
};
