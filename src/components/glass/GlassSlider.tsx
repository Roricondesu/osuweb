import React from "react";

export interface GlassSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  scheme?: "light" | "dark";
  ariaLabel?: string;
}

/** macOS 风滑块 */
export const GlassSlider: React.FC<GlassSliderProps> = ({
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  scheme = "dark",
  ariaLabel,
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const isDark = scheme === "dark";

  return (
    <div style={{ position: "relative", width: "100%", height: 28, display: "flex", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: 6,
          borderRadius: 3,
          background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          height: 6,
          borderRadius: 3,
          background: "var(--accent)",
          width: `${pct}%`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          left: `calc(${pct}% - 11px)`,
          pointerEvents: "none",
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        style={{
          position: "absolute",
          width: "100%",
          height: 28,
          margin: 0,
          opacity: 0,
          cursor: "pointer",
        }}
      />
    </div>
  );
};
