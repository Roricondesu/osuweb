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
      className="fixed left-1/2 top-2 z-50 -translate-x-1/2"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 8px)",
        width: "min(calc(100% - 24px), 720px)",
        borderRadius: 18,
        background: theme === "dark" ? "rgba(9,9,12,0.62)" : "rgba(232,234,239,0.62)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 sm:px-4">
        <Link
          to="/"
          className="flex items-center gap-2 no-underline"
          style={{
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
          }}
        >
          <Music2 size={20} className="shrink-0" />
          <span>osu!web</span>
        </Link>

        {/* 导航：移动端紧凑图标（带文字标签），桌面端图标+文字 */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 no-underline transition-colors sm:gap-2 sm:px-3"
                style={{
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-xs font-medium sm:text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={toggle}
          aria-label={active ? "退出全屏" : "进入全屏"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-none transition-colors"
          style={{
            background: active ? "var(--accent-soft)" : "transparent",
            color: active ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {active ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </header>
  );
};
