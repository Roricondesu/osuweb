import React from "react";
import { useGameStore } from "@/store/useGameStore";
import { usePlayerStore } from "@/store/usePlayerStore";

/** 全屏背景：默认渐变光斑 + 谱面封面模糊层 */
export const Background: React.FC = () => {
  const accent = useGameStore((s) => s.settings.accent);
  const coverUrl = usePlayerStore((s) => s.coverUrl);

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
      {/* 模糊封面层 */}
      {coverUrl && (
        <div
          style={{
            position: "absolute",
            inset: "-10%",
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(60px) brightness(0.3) saturate(1.2)",
            opacity: 0.7,
            transition: "opacity 0.6s ease, background-image 0.6s ease",
          }}
        />
      )}
      {/* 暗化遮罩 */}
      {coverUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(21,21,26,0.55)",
          }}
        />
      )}
      {/* 光斑层 */}
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
          opacity: 0.4,
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
          opacity: 0.3,
        }}
      />
    </div>
  );
};
