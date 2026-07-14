import React from "react";
import { useGameStore } from "@/store/useGameStore";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, Link } from "react-router-dom";
import { Home, Search, Settings, Music2, HardDrive, Maximize, Minimize } from "lucide-react";
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

  const isDark = theme === "dark";

  return (
    <header
      className="hud-panel"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 4px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 16px)",
        maxWidth: 1180,
        height: 48,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px 0 16px",
        background: isDark ? "rgba(9,9,12,0.72)" : "rgba(232,234,239,0.72)",
      }}
    >
      {/* 左：Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 no-underline"
        style={{
          color: "var(--accent)",
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: "-0.02em",
        }}
      >
        <Music2 size={18} className="shrink-0" />
        <span className="hidden sm:inline">osu!web</span>
      </Link>

      {/* 中：导航 Tab（带文字标签） */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`hud-btn flex items-center gap-1.5 no-underline ${isActive ? "active" : ""}`}
              style={{
                height: 34,
                padding: "0 10px",
                borderRadius: 8,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 右：全屏按钮 */}
      <button
        onClick={toggle}
        aria-label={active ? "退出全屏" : "进入全屏"}
        className="hud-btn"
        style={{
          width: 34, height: 34, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: active ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        {active ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </header>
  );
};
