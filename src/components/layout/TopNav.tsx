import React from "react";
import { useGameStore } from "@/store/useGameStore";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, Link } from "react-router-dom";
import { Maximize, Minimize } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

/** osu! cookie logo SVG（简化版圆形 logo） */
const OsuCookie: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="48" fill="#1a1a1f" stroke="#fff" strokeWidth="2" />
    {/* 内圆分段 */}
    <circle cx="50" cy="50" r="34" fill="none" stroke="#ff66aa" strokeWidth="6" strokeDasharray="40 12" transform="rotate(-30 50 50)" />
    <circle cx="50" cy="50" r="24" fill="none" stroke="#8866ff" strokeWidth="5" strokeDasharray="30 10" transform="rotate(60 50 50)" />
    <circle cx="50" cy="50" r="14" fill="#ff66aa" opacity="0.3" />
    <circle cx="50" cy="50" r="6" fill="#fff" />
  </svg>
);

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/downloads", label: "Downloads" },
  { to: "/settings", label: "Settings" },
];

export const TopNav: React.FC = () => {
  useTheme();
  const theme = useGameStore((s) => s.settings.theme);
  const location = useLocation();
  const { toggle, active } = useFullscreen();
  if (location.pathname.startsWith("/game")) return null;

  const isDark = theme === "dark";

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--nav-height)",
        padding: "0 16px",
        background: isDark ? "rgba(21,21,26,0.92)" : "rgba(21,21,26,0.92)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* 左：Cookie logo + osu!web 文字 */}
      <Link
        to="/"
        className="flex items-center gap-2 no-underline"
        style={{ color: "#fff" }}
      >
        <OsuCookie size={28} />
        <span
          className="font-torus"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          osu!<span style={{ color: "var(--lazer-accent)", fontWeight: 600 }}>web</span>
        </span>
      </Link>

      {/* 中：导航 Tab（osu!web 风格文字标签） */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="no-underline"
              style={{
                height: 34,
                padding: "0 12px",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? "rgba(136,102,255,0.15)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <span className="font-torus">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 右：全屏按钮 */}
      <button
        onClick={toggle}
        aria-label={active ? "退出全屏" : "进入全屏"}
        style={{
          width: 34, height: 34, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          color: active ? "var(--lazer-accent)" : "rgba(255,255,255,0.5)",
          background: "transparent",
          border: "none",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = active ? "var(--lazer-accent)" : "rgba(255,255,255,0.5)";
        }}
      >
        {active ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </header>
  );
};
