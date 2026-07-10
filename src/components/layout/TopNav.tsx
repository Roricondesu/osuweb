import React from "react";
import { useGameStore } from "@/store/useGameStore";
import { useTheme } from "@/hooks/useTheme";
import { useLocation } from "react-router-dom";
import { Home, Search, Settings, Music2, HardDrive, Maximize, Minimize } from "lucide-react";
import { Link } from "react-router-dom";
import { useFullscreen } from "@/hooks/useFullscreen";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "首页" },
  { to: "/search", icon: Search, label: "搜索" },
  { to: "/downloads", icon: HardDrive, label: "下载" },
  { to: "/settings", icon: Settings, label: "设置" },
];

export const TopNav: React.FC = () => {
  useTheme();
  const theme = useGameStore((s) => s.settings.theme);
  const location = useLocation();
  const { toggle, active } = useFullscreen();
  // 游戏页面隐藏导航
  if (location.pathname.startsWith("/game")) return null;

  return (
    <header
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        width: "min(calc(100% - 24px), 720px)",
        borderRadius: 18,
        background: theme === "dark" ? "rgba(9,9,12,0.62)" : "rgba(232,234,239,0.62)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
            textDecoration: "none",
          }}
        >
          <Music2 size={20} />
          <span>osu!web</span>
        </Link>

        <nav style={{ display: "flex", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  textDecoration: "none",
                  transition: "background 0.2s ease",
                }}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>
        <button
          onClick={toggle}
          aria-label={active ? "退出全屏" : "进入全屏"}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: active ? "var(--accent-soft)" : "transparent",
            color: active ? "var(--accent)" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "background 0.2s ease, color 0.2s ease",
          }}
        >
          {active ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </header>
  );
};
