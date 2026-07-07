import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { createEngine, type GameEngine, type ScoreState } from "@/engine";
import { GlassButton } from "@/components/glass/GlassButton";
import { RotateCcw, ArrowLeft, Pause, Play } from "lucide-react";
import type { GameMode } from "@/types";
import { MODE_LABEL } from "@/types";
import { useOrientation } from "@/hooks/useOrientation";

type Phase = "loading" | "ready" | "playing" | "paused" | "finished";

export default function Game() {
  const { setId, mode, diff } = useParams<{ setId: string; mode: string; diff: string }>();
  const navigate = useNavigate();
  const isLandscape = useOrientation();

  const downloaded = useGameStore((s) => s.downloaded);
  const set = setId ? downloaded.get(Number(setId)) : undefined;
  const beatmap = set?.beatmaps.find((b) => String(b.id) === diff) || set?.beatmaps[0];
  // 优先以谱面文件自身声明的 mode 为准，避免 URL/缓存中的 mode 错误
  const gameMode = (beatmap?.parsed?.mode || mode || "standard") as GameMode;

  const volume = useGameStore((s) => s.settings.volume);
  const offset = useGameStore((s) => s.settings.offset);
  const auto = useGameStore((s) => s.settings.auto);
  const showCursor = useGameStore((s) => s.settings.showCursor);
  const updateRuntime = useGameStore((s) => s.updateRuntime);
  const endGame = useGameStore((s) => s.endGame);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [score, setScore] = useState<ScoreState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // 加载谱面 + 创建引擎
  useEffect(() => {
    if (!setId || !set) {
      setErrorMsg("谱面未下载，请先返回详情页下载");
      setPhase("loading");
      return;
    }
    if (!beatmap?.parsed) {
      setErrorMsg("谱面数据损坏");
      return;
    }

    // 等待 canvas + audio mount
    const init = () => {
      const canvas = canvasRef.current;
      const audio = audioRef.current;
      if (!canvas || !audio) return;

      audio.src = set.audioUrl;
      audio.volume = volume;
      audio.preload = "auto";

      const engine = createEngine(gameMode, {
        canvas,
        audio,
        beatmap: beatmap.parsed,
        offset,
        isLandscape,
        backgroundUrl: set.backgroundUrl || set.cover,
        auto,
        showCursor,
        callbacks: {
          onScoreUpdate: (s) => {
            setScore({ ...s });
            updateRuntime({
              score: s.score,
              combo: s.combo,
              maxCombo: s.maxCombo,
              accuracy: s.accuracy,
              health: s.health,
              judgements: s.judgements,
            });
          },
          onFinish: (s) => {
            setScore({ ...s });
            setPhase("finished");
            endGame();
          },
        },
      });
      engineRef.current = engine;
      setPhase("ready");
    };

    // 等下一帧让 canvas/audio 挂载
    requestAnimationFrame(init);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [set, beatmap, gameMode, isLandscape, auto, showCursor]);

  // 同步音量
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // 启动游戏
  const handleStart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    // 用户交互后再 start，确保 audio 可播
    setPhase("playing");
    engine.start();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
    setPhase("paused");
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
    setPhase("playing");
  }, []);

  const handleRestart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.restart();
    setPhase("playing");
  }, []);

  // 输入处理
  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const getPos = (e: PointerEvent | Touch | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e as PointerEvent).clientX - rect.left,
        y: (e as PointerEvent).clientY - rect.top,
      };
    };

    let activePointerId: number | null = null;
    let pointerDown = false;

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      if (activePointerId === null) activePointerId = e.pointerId;
      pointerDown = true;
      const p = getPos(e);
      engine.setCursorPos(p.x, p.y);
      engine.onPointerDown(p.x, p.y);
    };
    const onMove = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      const p = getPos(e);
      engine.setCursorPos(p.x, p.y);
      if (pointerDown) engine.onPointerMove?.(p.x, p.y);
    };
    const onUp = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      pointerDown = false;
      activePointerId = null;
      const p = getPos(e);
      engine.setCursorPos(p.x, p.y);
      engine.onPointerUp?.(p.x, p.y);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      engine.onKeyDown(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      engine.onKeyUp?.(e.key);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [phase]);

  // 离开页面销毁引擎
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // === 渲染 ===

  if (errorMsg) {
    return (
      <div className="page-shell">
        <div className="solid-card p-6 text-center">
          <p className="text-sm" style={{ color: "#ff453a" }}>{errorMsg}</p>
          <GlassButton onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft size={14} /> 返回
          </GlassButton>
        </div>
      </div>
    );
  }

  // 结算页
  if (phase === "finished" && score) {
    return <ResultScreen score={score} onRetry={handleRestart} onBack={() => navigate(-1)} mode={gameMode} />;
  }

  return (
    <div className="game-shell" style={{ width: "100%", height: "100dvh", overflow: "hidden" }}>
      <audio ref={audioRef} crossOrigin="anonymous" preload="auto" />

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
        }}
      />

      {/* HUD 浮层（左上角控制按钮） */}
      <div
        style={{
          position: "absolute",
          top: "env(safe-area-inset-top, 0px)",
          left: 0,
          right: 0,
          padding: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="退出"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "none",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <ArrowLeft size={18} />
        </button>

        {phase === "playing" && (
          <button
            onClick={handlePause}
            aria-label="暂停"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "none",
              background: "rgba(0,0,0,0.4)",
              color: "#fff",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            <Pause size={18} fill="currentColor" />
          </button>
        )}
      </div>

      {/* 准备页 / 暂停页 浮层 */}
      {(phase === "ready" || phase === "paused") && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 20,
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              {MODE_LABEL[gameMode]} 模式
            </p>
            <h2 className="mt-1 text-2xl font-bold" style={{ color: "#fff" }}>
              {phase === "ready" ? "准备好了吗？" : "已暂停"}
            </h2>
            {phase === "ready" && (
              <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                点击开始后立即播放音频
              </p>
            )}
          </div>
          <GlassButton onClick={phase === "ready" ? handleStart : handleResume} accent style={{ padding: "14px 28px", fontSize: 16 }}>
            <Play size={18} fill="currentColor" />
            {phase === "ready" ? "开始游戏" : "继续"}
          </GlassButton>
          {phase === "paused" && (
            <GlassButton onClick={handleRestart} style={{ padding: "10px 20px" }}>
              <RotateCcw size={14} /> 重新开始
            </GlassButton>
          )}
        </div>
      )}
    </div>
  );
}

// === 结算页 ===
const ResultScreen: React.FC<{
  score: ScoreState;
  mode: GameMode;
  onRetry: () => void;
  onBack: () => void;
}> = ({ score, mode, onRetry, onBack }) => {
  const total =
    score.judgements["300"] +
    score.judgements["100"] +
    score.judgements["50"] +
    score.judgements.miss;

  let rank = "D";
  if (score.accuracy >= 95) rank = "S";
  else if (score.accuracy >= 90) rank = "A";
  else if (score.accuracy >= 80) rank = "B";
  else if (score.accuracy >= 70) rank = "C";

  return (
    <div className="page-shell">
      <div className="solid-card p-6 md:p-8 animate-enter">
        <div className="text-center">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {MODE_LABEL[mode]} · 结算
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl" style={{ color: "var(--accent)" }}>
            完成！
          </h1>

          {/* 评级 */}
          <div
            className="mx-auto my-6 flex items-center justify-center"
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              border: "3px solid var(--accent)",
            }}
          >
            <span style={{ fontSize: 56, fontWeight: 800, color: "var(--accent)" }}>{rank}</span>
          </div>
        </div>

        {/* 主要数据 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="分数" value={Math.round(score.score).toLocaleString()} />
          <Stat label="准确率" value={`${score.accuracy.toFixed(2)}%`} />
          <Stat label="最大连击" value={`${score.maxCombo}x`} />
          <Stat label="总命中" value={String(total)} />
        </div>

        {/* 判定明细 */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          <Judgement label="300" count={score.judgements["300"]} color="#66cc44" />
          <Judgement label="100" count={score.judgements["100"]} color="#0a84ff" />
          <Judgement label="50" count={score.judgements["50"]} color="#ff9100" />
          <Judgement label="Miss" count={score.judgements.miss} color="#ff375f" />
        </div>

        {/* 操作 */}
        <div className="mt-8 flex gap-3">
          <GlassButton onClick={onBack} style={{ flex: 1 }}>
            <ArrowLeft size={14} /> 返回
          </GlassButton>
          <GlassButton onClick={onRetry} accent style={{ flex: 1 }}>
            <RotateCcw size={14} /> 再来一次
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="solid-card p-3 text-center" style={{ borderRadius: 14 }}>
    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
    <div className="mt-1 text-base font-bold md:text-lg" style={{ color: "var(--text-primary)" }}>
      {value}
    </div>
  </div>
);

const Judgement: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div
    className="p-2 text-center"
    style={{
      borderRadius: 10,
      background: `${color}1a`,
    }}
  >
    <div className="text-xs font-bold" style={{ color }}>{label}</div>
    <div className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{count}</div>
  </div>
);
