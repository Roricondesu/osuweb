import React, { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, Link } from "react-router-dom";
import { Maximize, Minimize, Home, Search, Download, Settings as SettingsIcon, User } from "lucide-react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useTranslation } from "@/i18n";
import type { TranslationKey } from "@/i18n";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.home" as TranslationKey, icon: Home },
  { to: "/search", labelKey: "nav.search" as TranslationKey, icon: Search },
  { to: "/downloads", labelKey: "nav.downloads" as TranslationKey, icon: Download },
  { to: "/profile", labelKey: "nav.profile" as TranslationKey, icon: User },
  { to: "/settings", labelKey: "nav.settings" as TranslationKey, icon: SettingsIcon },
];

export const TopNav: React.FC = () => {
  useTheme();
  const { t } = useTranslation();
  const location = useLocation();
  const { toggle, active } = useFullscreen();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (location.pathname.startsWith("/game")) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: "var(--radius-pill)",
        background: "rgba(21,21,26,0.85)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        maxWidth: "calc(100vw - 20px)",
      }}
    >
      {/* 文字 logo */}
      <Link
        to="/"
        className="font-torus no-underline"
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "-0.02em",
          padding: "0 8px",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        osu!<span style={{ color: "var(--accent)", fontWeight: 600 }}>web</span>
      </Link>

      {/* 分隔线 */}
      <span style={{ width: 1, height: 20, background: "var(--glass-border)", flexShrink: 0 }} />

      {/* 悬浮图标导航 */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {NAV_ITEMS.map((item, idx) => {
          const isActive = location.pathname === item.to;
          const isHovered = hoveredIdx === idx;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={t(item.labelKey)}
              title={t(item.labelKey)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="no-underline"
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-pill)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isActive ? "#fff" : "var(--text-secondary)",
                background: isActive ? "var(--accent)" : isHovered ? "var(--surface-hover)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
            </Link>
          );
        })}
      </nav>

      {/* 分隔线 */}
      <span style={{ width: 1, height: 20, background: "var(--glass-border)", flexShrink: 0 }} />

      {/* 全屏按钮 */}
      <button
        onClick={toggle}
        aria-label={active ? t("nav.exitFullscreen") : t("nav.enterFullscreen")}
        style={{
          width: 36, height: 36, borderRadius: "var(--radius-pill)",
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
    </div>
  );
};
