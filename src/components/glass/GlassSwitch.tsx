import React from "react";

export interface GlassSwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  scheme?: "light" | "dark";
}

/** macOS 风开关（简化版，纯 CSS） */
export const GlassSwitch: React.FC<GlassSwitchProps> = ({
  checked,
  onCheckedChange,
  disabled,
  ariaLabel,
  scheme = "dark",
}) => {
  const isDark = scheme === "dark";
  const trackWidth = 48;
  const trackHeight = 28;
  const thumbSize = 22;
  const travel = trackWidth - thumbSize - 6;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      style={{
        position: "relative",
        width: trackWidth,
        height: trackHeight,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        background: checked
          ? "var(--accent)"
          : isDark
            ? "rgba(255,255,255,0.18)"
            : "rgba(0,0,0,0.12)",
        transition: "background 0.25s ease",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: thumbSize,
          height: thumbSize,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          transform: `translateX(${checked ? travel : 0}px)`,
          transition: "transform 0.28s cubic-bezier(0.34, 1.36, 0.42, 1)",
        }}
      />
    </button>
  );
};
