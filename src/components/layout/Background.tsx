import React from "react";
import { useGameStore } from "@/store/useGameStore";

/** 全屏背景渐变光斑（参考 yuimusic 的氛围层） */
export const Background: React.FC = () => {
  const theme = useGameStore((s) => s.settings.theme);
  const accent = useGameStore((s) => s.settings.accent);
  const isDark = theme === "dark";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        background: "var(--bg-base)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "60%",
          height: "60%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}40, transparent 70%)`,
          filter: "blur(60px)",
          opacity: isDark ? 0.4 : 0.3,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}30, transparent 70%)`,
          filter: "blur(80px)",
          opacity: isDark ? 0.3 : 0.25,
        }}
      />
    </div>
  );
};
