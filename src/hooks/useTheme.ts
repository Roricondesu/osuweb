import { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";

/** 同步主题到 <html> 的 dark 类与 --accent 变量 */
export const useTheme = () => {
  const theme = useGameStore((s) => s.settings.theme);
  const accent = useGameStore((s) => s.settings.accent);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty("--accent", accent);
    // 解析 hex → rgba 软色
    const m = accent.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      const r = parseInt(m[1].slice(0, 2), 16);
      const g = parseInt(m[1].slice(2, 4), 16);
      const b = parseInt(m[1].slice(4, 6), 16);
      html.style.setProperty("--accent-soft", `rgba(${r},${g},${b},0.14)`);
      html.style.setProperty("--accent-strong", `rgba(${r},${g},${b},0.28)`);
    }
  }, [accent]);
};
