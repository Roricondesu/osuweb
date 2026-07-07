import React from "react";
import { useGameStore } from "@/store/useGameStore";
import { useTheme } from "@/hooks/useTheme";
import { useLocation } from "react-router-dom";
import { Home, Search, Settings, Music2, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";

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
  // 游戏页面隐藏导航
  if (location.pathname.startsWith("/game")) return null;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: theme === "dark" ? "rgba(9,9,12,0.72)" : "rgba(232,234,239,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          maxWidth: 1200,
          margin: "0 auto",
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
          <span>osu! game</span>
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
                  width: 36,
                  height: 36,
                  borderRadius: 12,
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
      </div>
    </header>
  );
};
