import { useEffect, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";

function isFullscreenEnabled(): boolean {
  return document.fullscreenEnabled;
}

function isFullscreenActive(): boolean {
  return !!document.fullscreenElement;
}

async function enterFullscreen(): Promise<void> {
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  try {
    await el.requestFullscreen();
  } catch {
    // 某些浏览器/环境下可能拒绝（如 iframe 未授权）
  }
}

async function exitFullscreen(): Promise<void> {
  if (!document.exitFullscreen) return;
  try {
    await document.exitFullscreen();
  } catch {
    // 忽略
  }
}

export function useFullscreen(): { toggle: () => void; enabled: boolean; active: boolean } {
  const fullscreen = useGameStore((s) => s.settings.fullscreen);
  const updateSetting = useGameStore((s) => s.updateSetting);

  // 同步设置 -> 实际全屏状态
  useEffect(() => {
    if (!isFullscreenEnabled()) return;
    if (fullscreen && !isFullscreenActive()) {
      enterFullscreen();
    } else if (!fullscreen && isFullscreenActive()) {
      exitFullscreen();
    }
  }, [fullscreen]);

  // 监听用户通过 Esc / 浏览器 UI 退出全屏，同步回设置
  useEffect(() => {
    if (!isFullscreenEnabled()) return;
    const onChange = () => {
      const active = isFullscreenActive();
      if (active !== fullscreen) {
        updateSetting("fullscreen", active);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [fullscreen, updateSetting]);

  const toggle = useCallback(() => {
    updateSetting("fullscreen", !fullscreen);
  }, [fullscreen, updateSetting]);

  return { toggle, enabled: isFullscreenEnabled(), active: isFullscreenActive() };
}
