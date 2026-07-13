import React from "react";
import { Film, Video } from "lucide-react";

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

interface VideoBadgeProps {
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/** 视频背景标识徽标 */
export const VideoBadge: React.FC<VideoBadgeProps> = ({
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
      <Video size={iconSize} /> Video
    </span>
  );
};
