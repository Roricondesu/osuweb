import React from "react";
import { useGameStore } from "@/store/useGameStore";

/** 全屏背景：基础渐变光斑层 */
export const Background: React.FC = () => {
  const accent = useGameStore((s) => s.settings.accent);

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
      {/* 光斑层 */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "60%",
          height: "60%",
          borderRadius: "50%",
          background: `${accent}40`,
          filter: "blur(80px)",
          opacity: 0.35,
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
          background: `${accent}30`,
          filter: "blur(100px)",
          opacity: 0.25,
        }}
      />
    </div>
  );
};
