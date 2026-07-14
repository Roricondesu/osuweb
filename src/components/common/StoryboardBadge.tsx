import React from "react";
import { Film, Video } from "lucide-react";

interface StoryboardBadgeProps {
  size?: "sm" | "md";
  style?: React.CSSProperties;
}

/** Storyboard 标识徽标（卡片内为图标-only，详情页为带文字） */
export const StoryboardBadge: React.FC<StoryboardBadgeProps> = ({
  size = "sm",
  style,
}) => {
  const iconSize = size === "sm" ? 12 : 14;
  if (size === "sm") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 4,
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          ...style,
        }}
      >
        <Film size={iconSize} />
      </span>
    );
  }
  return (
    <span
      className="font-torus"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.08)",
        color: "#fff",
        fontSize: 12,
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
  const iconSize = size === "sm" ? 12 : 14;
  if (size === "sm") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 4,
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          ...style,
        }}
      >
        <Video size={iconSize} />
      </span>
    );
  }
  return (
    <span
      className="font-torus"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.08)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        ...style,
      }}
    >
      <Video size={iconSize} /> Video
    </span>
  );
};
