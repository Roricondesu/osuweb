import React, { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, Link } from "react-router-dom";
import { Maximize, Minimize, Home, Search, Download, Settings as SettingsIcon } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";

/** osu! cookie logo SVG */
const OsuCookie: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="48" fill="#1a1a1f" stroke="#fff" strokeWidth="2" />
    <circle cx="50" cy="50" r="34" fill="none" stroke="var(--mode-standard)" strokeWidth="6" strokeDasharray="40 12" transform="rotate(-30 50 50)" />
    <circle cx="50" cy="50" r="24" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray="30 10" transform="rotate(60 50 50)" />
    <circle cx="50" cy="50" r="14" fill="var(--mode-standard)" opacity="0.3" />
    <circle cx="50" cy="50" r="6" fill="#fff" />
  </svg>
);

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const TopNav: React.FC = () => {
  useTheme();
  const location = useLocation();
  const { toggle, active } = useFullscreen();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (location.pathname.startsWith("/game")) return null;

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
        padding: "0 12px",
        background: "rgba(21,21,26,0.92)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {/* 左：Cookie logo + osu!web */}
      <Link
        to="/"
        className="flex items-center gap-2 no-underline"
        style={{ color: "#fff", flexShrink: 0 }}
      >
        <OsuCookie size={28} />
        <span
          className="font-torus hidden sm:inline"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: "-0.02em",
          }}
        >
          osu!<span style={{ color: "var(--accent)", fontWeight: 600 }}>web</span>
        </span>
      </Link>

      {/* 中：悬浮图标导航（桌面端 + 移动端共用，始终显示） */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px",
          borderRadius: "var(--radius-pill)",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid var(--glass-border)",
        }}
      >
        {NAV_ITEMS.map((item, idx) => {
          const isActive = location.pathname === item.to;
          const isHovered = hoveredIdx === idx;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="no-underline font-torus"
              style={{
                height: 32,
                minWidth: 32,
                padding: "0 10px",
                borderRadius: "var(--radius-pill)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: isActive ? "#fff" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? "var(--accent)" : isHovered ? "var(--surface-hover)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 右：全屏按钮 */}
      <button
        onClick={toggle}
        aria-label={active ? "退出全屏" : "进入全屏"}
        style={{
          width: 34, height: 34, borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          color: active ? "var(--accent)" : "var(--text-secondary)",
          background: "transparent",
          border: "none",
          transition: "all 0.15s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = active ? "var(--accent)" : "var(--text-secondary)"; }}
      >
        {active ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </header>
  );
};
