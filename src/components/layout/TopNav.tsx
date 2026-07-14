import React, { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, Link } from "react-router-dom";
import { Maximize, Minimize, Menu, X } from "lucide-react";
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
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/downloads", label: "Downloads" },
  { to: "/settings", label: "Settings" },
];

export const TopNav: React.FC = () => {
  useTheme();
  const location = useLocation();
  const { toggle, active } = useFullscreen();
  const [menuOpen, setMenuOpen] = useState(false);
  if (location.pathname.startsWith("/game")) return null;

  return (
    <>
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

        {/* 中：桌面端导航 */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="no-underline font-torus"
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 右：全屏 + 移动端菜单按钮 */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <button
            onClick={toggle}
            aria-label={active ? "退出全屏" : "进入全屏"}
            className="hidden sm:flex"
            style={{
              width: 34, height: 34, borderRadius: "var(--radius-sm)",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: active ? "var(--accent)" : "var(--text-secondary)",
              background: "transparent",
              border: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = active ? "var(--accent)" : "var(--text-secondary)"; }}
          >
            {active ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          {/* 移动端汉堡按钮 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
            className="sm:hidden"
            style={{
              width: 34, height: 34, borderRadius: "var(--radius-sm)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              background: "transparent",
              border: "none",
            }}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* 移动端下拉菜单 */}
      {menuOpen && (
        <nav
          className="sm:hidden"
          style={{
            position: "fixed",
            top: "var(--nav-height)",
            left: 0,
            right: 0,
            zIndex: 49,
            background: "rgba(21,21,26,0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--glass-border)",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          onClick={() => setMenuOpen(false)}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="no-underline font-torus"
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "var(--accent-soft)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={toggle}
            className="font-torus"
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: active ? "var(--accent)" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {active ? <Minimize size={16} /> : <Maximize size={16} />}
            {active ? "退出全屏" : "进入全屏"}
          </button>
        </nav>
      )}
    </>
  );
};
