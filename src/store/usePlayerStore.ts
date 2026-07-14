/** 全局音频预览播放器 store
 *  管理"当前试听谱面"，为 NowPlayingBar 和 BeatmapCard hover 预览共用
 */
import { create } from "zustand";
import type { BeatmapSet } from "@/types";

interface PlayerState {
  currentSet: BeatmapSet | null;
  audioEl: HTMLAudioElement | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  /** 预览音频 URL（谱面包内的音频 blob URL） */
  audioUrl: string | null;
  /** 封面 URL */
  coverUrl: string | null;

  /** 设置当前试听的谱面（加载音频） */
  playSet: (set: BeatmapSet, audioUrl: string, coverUrl?: string) => void;
  /** 停止播放 */
  stop: () => void;
  /** 播放/暂停切换 */
  toggle: () => void;
  /** 跳转进度 */
  seek: (time: number) => void;
  /** 设置音量 */
  setVolume: (v: number) => void;
  /** 内部：更新时间 */
  _tick: () => void;
  /** 内部：绑定音频元素 */
  _setAudioEl: (el: HTMLAudioElement | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSet: null,
  audioEl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.5,
  audioUrl: null,
  coverUrl: null,

  playSet: (nextSet, audioUrl, coverUrl) => {
    const el = get().audioEl;
    if (!el) return;
    // 同一谱面则 toggle
    if (get().currentSet?.id === nextSet.id) {
      get().toggle();
      return;
    }
    el.pause();
    el.src = audioUrl;
    el.volume = get().volume;
    el.play().catch(() => {});
    set({
      currentSet: nextSet,
      audioUrl,
      coverUrl: coverUrl || nextSet.covers?.cover || null,
      isPlaying: true,
      currentTime: 0,
    });
  },

  stop: () => {
    const el = get().audioEl;
    if (el) {
      el.pause();
      el.src = "";
    }
    set({ currentSet: null, isPlaying: false, currentTime: 0, audioUrl: null });
  },

  toggle: () => {
    const el = get().audioEl;
    if (!el || !get().currentSet) return;
    if (get().isPlaying) {
      el.pause();
      set({ isPlaying: false });
    } else {
      el.play().catch(() => {});
      set({ isPlaying: true });
    }
  },

  seek: (time) => {
    const el = get().audioEl;
    if (el) el.currentTime = time;
    set({ currentTime: time });
  },

  setVolume: (v) => {
    const el = get().audioEl;
    if (el) el.volume = v;
    set({ volume: v });
  },

  _tick: () => {
    const el = get().audioEl;
    if (!el) return;
    set({ currentTime: el.currentTime, duration: el.duration || 0 });
  },

  _setAudioEl: (el) => {
    if (el) {
      el.volume = get().volume;
      el.addEventListener("timeupdate", () => get()._tick());
      el.addEventListener("ended", () => {
        // 循环播放预览
        el.currentTime = 0;
        el.play().catch(() => {});
      });
    }
    set({ audioEl: el });
  },
}));
