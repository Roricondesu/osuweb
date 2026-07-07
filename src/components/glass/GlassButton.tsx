import React from "react";

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  scheme?: "light" | "dark";
  active?: boolean;
  round?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    { scheme = "dark", active = false, round = false, accent = false, children, style, ...rest },
    ref,
  ) => {
    const isDark = scheme === "dark";

    let bg: string | undefined;
    let color: string | undefined;
    if (accent) {
      bg = "var(--accent)";
      color = "#fff";
    } else if (active) {
      bg = isDark ? "rgba(10,132,255,0.16)" : "rgba(10,132,255,0.12)";
      color = "var(--accent)";
    } else {
      bg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
      color = isDark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.82)";
    }

    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        style={{
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: round ? 10 : "10px 18px",
          borderRadius: round ? 9999 : 999,
          cursor: rest.disabled ? "not-allowed" : "pointer",
          opacity: rest.disabled ? 0.4 : 1,
          color,
          background: bg,
          fontWeight: active || accent ? 700 : 600,
          fontSize: 14,
          letterSpacing: "-0.01em",
          transition: "transform 0.18s ease, background 0.18s ease",
          ...style,
        }}
      >
        {children}
      </button>
    );
  },
);
GlassButton.displayName = "GlassButton";
