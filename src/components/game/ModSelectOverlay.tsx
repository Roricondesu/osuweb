import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { X, Zap } from "lucide-react";
import type { ModType } from "@/types";
import { MOD_LABEL, MOD_COLOR } from "@/types";

interface ModSelectOverlayProps {
  open: boolean;
  onClose: () => void;
}

/** Mod 分类 */
const MOD_SECTIONS: { title: string; mods: ModType[] }[] = [
  { title: "难度调整", mods: ["easy", "notail", "halfTime", "hardRock", "suddenDeath"] },
  { title: "速度", mods: ["doubleTime"] },
  { title: "视觉", mods: ["hidden", "flashlight"] },
  { title: "辅助", mods: ["relax", "autopilot"] },
];

/** lazer 风格 Mod 选择浮层 */
export const ModSelectOverlay: React.FC<ModSelectOverlayProps> = ({ open, onClose }) => {
  const mods = useGameStore((s) => s.settings.mods);
  const updateSetting = useGameStore((s) => s.updateSetting);

  const toggleMod = (mod: ModType) => {
    const next = mods.includes(mod)
      ? mods.filter((m) => m !== mod)
      : [...mods, mod];
    updateSetting("mods", next);
  };

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        animation: "page-fade-in 0.2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="hud-panel"
        style={{
          width: "min(680px, calc(100% - 24px))",
          maxHeight: "80vh",
          marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
          padding: 20,
          overflow: "auto",
          borderRadius: "20px 20px 0 0",
          animation: "mod-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <style>{`
          @keyframes mod-slide-up {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* 头部 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={18} style={{ color: "var(--lazer-accent)" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Mods</h2>
            {mods.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: "var(--accent)",
                background: "var(--accent-soft)", padding: "2px 8px", borderRadius: 999,
              }}>
                {mods.length} 个已启用
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="hud-btn"
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 分类 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {MOD_SECTIONS.map((section) => (
            <div key={section.title}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
                marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                {section.title}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
                {section.mods.map((mod) => {
                  const active = mods.includes(mod);
                  const color = MOD_COLOR[mod];
                  return (
                    <button
                      key={mod}
                      onClick={() => toggleMod(mod)}
                      style={{
                        position: "relative",
                        padding: "12px 8px",
                        borderRadius: 14,
                        border: `1.5px solid ${active ? color : "var(--glass-border)"}`,
                        background: active ? `${color}22` : "var(--glass-bg)",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: active ? "#fff" : "var(--text-primary)",
                        textShadow: active ? `0 0 8px ${color}88` : "none",
                        textAlign: "center",
                      }}>
                        {MOD_LABEL[mod]}
                      </div>
                      {active && (
                        <div style={{
                          position: "absolute", top: 6, right: 6,
                          width: 8, height: 8, borderRadius: "50%",
                          background: color, boxShadow: `0 0 8px ${color}`,
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部操作 */}
        {mods.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              已启用 {mods.length} 个 Mod
            </span>
            <button
              onClick={() => updateSetting("mods", [])}
              className="hud-btn"
              style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}
            >
              清除全部
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/** 浮动 Mod 按钮（挂在详情页/游戏页右下角） */
export const ModSelectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const mods = useGameStore((s) => s.settings.mods);
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="选择 Mod"
      style={{
        position: "fixed",
        right: "calc(env(safe-area-inset-right, 0px) + 20px)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)",
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "none",
        background: "var(--accent)",
        color: "#fff",
        boxShadow: hover
          ? "0 8px 32px rgba(0, 0, 0, 0.5)"
          : "0 4px 16px rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 35,
        transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
        transform: hover ? "translateY(-2px) scale(1.05)" : "none",
      }}
    >
      <Zap size={24} fill="currentColor" />
      {mods.length > 0 && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          minWidth: 20, height: 20, padding: "0 6px",
          borderRadius: 999, background: "#ff375f",
          color: "#fff", fontSize: 11, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(255, 55, 95, 0.5)",
        }}>
          {mods.length}
        </span>
      )}
    </button>
  );
};
