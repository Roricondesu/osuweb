import React, { useEffect, useState } from "react";

interface SplashScreenProps {
  /** 0-1 加载进度 */
  progress: number;
  /** 是否已完成加载，触发淡出 */
  done: boolean;
  /** 淡出完成回调 */
  onExited: () => void;
}

/**
 * 启动画面：osu!web 字标从上方弹入 + 进度条
 * 资源加载完成后淡出
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ progress, done, onExited }) => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setHidden(true);
        onExited();
      }, 450);
      return () => clearTimeout(t);
    }
  }, [done, onExited]);

  if (hidden) return null;

  const pct = Math.round(progress * 100);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#15151a",
        transition: "opacity 0.4s cubic-bezier(0.22,1,0.36,1)",
        opacity: done ? 0 : 1,
        pointerEvents: done ? "none" : "auto",
      }}
    >
      {/* osu!web 字标 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 2,
          marginBottom: 32,
          animation: "splash-drop-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        }}
      >
        <span
          className="font-torus"
          style={{
            fontSize: "clamp(36px, 8vw, 56px)",
            fontWeight: 900,
            color: "#ff66aa",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            textShadow: "0 4px 24px rgba(255, 102, 170, 0.3)",
          }}
        >
          osu!
        </span>
        <span
          className="font-torus"
          style={{
            fontSize: "clamp(20px, 4.5vw, 32px)",
            fontWeight: 700,
            color: "rgba(255, 255, 255, 0.9)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          web
        </span>
      </div>

      {/* 进度条 */}
      <div
        style={{
          width: "min(220px, 60vw)",
          height: 4,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #ff66aa, #ff9100)",
            transition: "width 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
      <span
        className="hud-num"
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.35)",
          fontWeight: 600,
        }}
      >
        {pct}%
      </span>
    </div>
  );
};
