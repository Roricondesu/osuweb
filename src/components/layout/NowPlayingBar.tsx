import React, { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useNavigate } from "react-router-dom";
import { Play, Pause, SkipForward, Volume2, VolumeX } from "lucide-react";

/** 底部 NOW PLAYING 播放条（osu!lazer 风格） */
export const NowPlayingBar: React.FC = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSet, isPlaying, currentTime, duration, volume,
    toggle, seek, setVolume, stop, _setAudioEl,
  } = usePlayerStore();

  useEffect(() => {
    if (audioRef.current) _setAudioEl(audioRef.current);
  }, [_setAudioEl]);

  if (!currentSet) return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div style={{ height: 0 }} />
    </>
  );

  const cover = currentSet.covers?.["cover@2x"] || currentSet.covers?.cover || "";
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fmtTime = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <div
        className="hud-panel"
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 16px)",
          maxWidth: 1180,
          height: 68,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 16px",
          overflow: "hidden",
        }}
      >
        {/* 封面 */}
        <div
          onClick={() => navigate(`/set/${currentSet.id}`)}
          style={{
            width: 46, height: 46, borderRadius: 12, overflow: "hidden",
            cursor: "pointer", flexShrink: 0, position: "relative",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {cover ? (
            <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "var(--surface-elevated)" }} />
          )}
        </div>

        {/* 标题 + 进度 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-torus" style={{
            fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}>
            {currentSet.title_unicode || currentSet.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span className="hud-num" style={{ fontSize: 10, color: "var(--text-secondary)", minWidth: 28 }}>
              {fmtTime(currentTime)}
            </span>
            <div
              className="hud-bar-track"
              style={{ flex: 1, height: 4, cursor: "pointer" }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seek(pct * duration);
              }}
            >
              <div className="hud-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="hud-num" style={{ fontSize: 10, color: "var(--text-secondary)", minWidth: 28, textAlign: "right" }}>
              {fmtTime(duration)}
            </span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            onClick={toggle}
            aria-label={isPlaying ? "暂停" : "播放"}
            className="lazer-cta"
            style={{
              width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={stop}
            aria-label="停止"
            className="hud-btn"
            style={{
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            <SkipForward size={15} />
          </button>
        </div>

        {/* 音量 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, width: 84 }} className="hidden sm:flex">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.5)}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
          >
            {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{ width: 52, height: 4, accentColor: "var(--lazer-accent)", cursor: "pointer" }}
          />
        </div>
      </div>
    </>
  );
};
