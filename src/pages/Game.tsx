import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { createEngine, type GameEngine, type ScoreState } from "@/engine";
import { GlassButton } from "@/components/glass/GlassButton";
import { RotateCcw, ArrowLeft, Pause, Play, Menu, X, Maximize, Minimize, Eye, Home } from "lucide-react";
import type { GameMode, Replay, ScoreRecord } from "@/types";
import { MODE_LABEL } from "@/types";
import { useOrientation } from "@/hooks/useOrientation";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { LyricLine } from "@/utils/lyricsProvider";
import { fetchLyrics } from "@/utils/lyricsProvider";
import { getReplaysForBeatmap, saveReplay } from "@/utils/replayStorage";
import { saveScore } from "@/utils/scoreStorage";

type Phase = "loading" | "ready" | "playing" | "paused" | "finished";

export default function Game() {
  const { setId, mode, diff } = useParams<{ setId: string; mode: string; diff: string }>();
  const navigate = useNavigate();
  const forceLandscape = useGameStore((s) => s.settings.forceLandscape);
  const isLandscape = useOrientation(forceLandscape);

  const downloaded = useGameStore((s) => s.downloaded);
  const set = setId ? downloaded.get(Number(setId)) : undefined;
  const beatmap = set?.beatmaps.find((b) => String(b.id) === diff) || set?.beatmaps[0];
  // 优先以谱面文件自身声明的 mode 为准，避免 URL/缓存中的 mode 错误
  const gameMode = (beatmap?.parsed?.mode || mode || "standard") as GameMode;

  const volume = useGameStore((s) => s.settings.volume);
  const offset = useGameStore((s) => s.settings.offset);
  const auto = useGameStore((s) => s.settings.auto);
  const showCursor = useGameStore((s) => s.settings.showCursor);
  const showStoryboard = useGameStore((s) => s.settings.showStoryboard);
  const showVideo = useGameStore((s) => s.settings.showVideo);
  const backgroundDim = useGameStore((s) => s.settings.backgroundDim);
  const showLyrics = useGameStore((s) => s.settings.showLyrics);
  const lyricsEffect = useGameStore((s) => s.settings.lyricsEffect);
  const lyricsSize = useGameStore((s) => s.settings.lyricsSize);
  const spectatorMode = useGameStore((s) => s.settings.spectatorMode);
  const keyBindings = useGameStore((s) => s.settings.keyBindings);
  const showCursorTrail = useGameStore((s) => s.settings.showCursorTrail);
  const showCursorPress = useGameStore((s) => s.settings.showCursorPress);
  const autoCursorSpeed = useGameStore((s) => s.settings.autoCursorSpeed);
  const autoCircleMode = useGameStore((s) => s.settings.autoCircleMode);
  const hitSoundVolume = useGameStore((s) => s.settings.hitSoundVolume);
  const useHitSamples = useGameStore((s) => s.settings.useHitSamples);
  const defaultSampleSet = useGameStore((s) => s.settings.defaultSampleSet);
  const customHitSoundUrls = useGameStore((s) => s.settings.customHitSoundUrls);
  const approachMultiplier = useGameStore((s) => s.settings.approachMultiplier);
  const backgroundBlur = useGameStore((s) => s.settings.backgroundBlur);
  const showFollowPoints = useGameStore((s) => s.settings.showFollowPoints);
  const showApproachCircles = useGameStore((s) => s.settings.showApproachCircles);
  const showComboNumbers = useGameStore((s) => s.settings.showComboNumbers);
  const showHitEffects = useGameStore((s) => s.settings.showHitEffects);
  const showFPS = useGameStore((s) => s.settings.showFPS);
  const hudScale = useGameStore((s) => s.settings.hudScale);
  const cursorSize = useGameStore((s) => s.settings.cursorSize);
  const playbackRate = useGameStore((s) => s.settings.playbackRate);
  const mods = useGameStore((s) => s.settings.mods);
  const useBeatmapSkin = useGameStore((s) => s.settings.useBeatmapSkin);
  const useCustomSkin = useGameStore((s) => s.settings.useCustomSkin);
  const customSkinAssetUrls = useGameStore((s) => s.settings.customSkinAssetUrls);
  const customComboColors = useGameStore((s) => s.settings.customComboColors);
  const useCustomComboColors = useGameStore((s) => s.settings.useCustomComboColors);
  const circleBorderWidth = useGameStore((s) => s.settings.circleBorderWidth);
  const sliderBorderWidth = useGameStore((s) => s.settings.sliderBorderWidth);
  const sliderBallScale = useGameStore((s) => s.settings.sliderBallScale);
  const hitCircleScale = useGameStore((s) => s.settings.hitCircleScale);
  const updateRuntime = useGameStore((s) => s.updateRuntime);
  const endGame = useGameStore((s) => s.endGame);
  const { toggle: toggleFullscreen, active: isFullscreen } = useFullscreen();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [score, setScore] = useState<ScoreState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [availableReplays, setAvailableReplays] = useState<Replay[]>([]);
  const [selectedReplay, setSelectedReplay] = useState<Replay | null>(null);
  const [justSavedReplay, setJustSavedReplay] = useState(false);
  const lastReplayRef = useRef<Replay | null>(null);
  const autoStartRef = useRef(false);

  // 加载歌词（优先使用下载时预加载的，没有则实时拉取）
  useEffect(() => {
    if (!showLyrics || !set) return;
    if (set.lyrics && set.lyrics.length > 0) {
      setLyrics(set.lyrics as LyricLine[]);
      return;
    }
    let cancelled = false;
    fetchLyrics(set.title, set.artist).then((lines) => {
      if (!cancelled) setLyrics(lines);
    });
    return () => { cancelled = true; };
  }, [set, showLyrics]);

  // 加载该谱面已有的回放
  useEffect(() => {
    if (!set || !beatmap) {
      setAvailableReplays([]);
      setSelectedReplay(null);
      return;
    }
    const replays = getReplaysForBeatmap(set.setId, beatmap.id);
    setAvailableReplays(replays);
    setSelectedReplay(null);
    setJustSavedReplay(false);
  }, [set, beatmap]);

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

      try {
        audio.src = set.audioUrl;
        audio.volume = volume;
        audio.preload = "auto";
        audio.onerror = () => {
          // 主音频加载失败时允许继续进入准备状态，避免页面卡住
          console.warn("主音频加载失败", set.audioUrl);
        };

        const engine = createEngine(gameMode, {
          canvas,
          audio,
          beatmap: beatmap.parsed,
          offset,
          isLandscape,
          backgroundUrl: set.backgroundUrl || set.cover,
          assetUrls: set.assetUrls,
          auto,
          showCursor,
          showStoryboard,
          showVideo,
          videoUrl: set.videoUrl,
          backgroundDim,
          showLyrics,
          lyricsEffect,
          lyricsSize,
          spectatorMode,
          keyBindings,
          lyrics,
          showCursorTrail,
          showCursorPress,
          autoCursorSpeed,
          autoCircleMode,
          hitSoundVolume,
          useHitSamples,
          defaultSampleSet,
          customHitSoundUrls,
          approachMultiplier,
          backgroundBlur,
          showFollowPoints,
          showApproachCircles,
          showComboNumbers,
          showHitEffects,
          showFPS,
          hudScale,
          cursorSize,
          playbackRate,
          mods,
          useBeatmapSkin,
          customSkinAssetUrls: useCustomSkin ? customSkinAssetUrls : undefined,
          customComboColors,
          useCustomComboColors,
          circleBorderWidth,
          sliderBorderWidth,
          sliderBallScale,
          hitCircleScale,
          replay: selectedReplay ?? undefined,
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
              // 非回放模式下自动保存本次回放与分数记录
              const engine = engineRef.current;
              if (engine && !engine.getIsReplay() && set && beatmap) {
                const replayScore = engine.buildReplayScore();
                const replay: Replay = {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  setId: set.setId,
                  beatmapId: beatmap.id,
                  mode: gameMode,
                  version: beatmap.version,
                  createdAt: Date.now(),
                  events: engine.getReplayEvents(),
                  score: replayScore,
                };
                saveReplay(replay);
                lastReplayRef.current = replay;
                setJustSavedReplay(true);
                setAvailableReplays(getReplaysForBeatmap(set.setId, beatmap.id));
                // 独立保存分数记录，用于历史成绩展示
                const record: ScoreRecord = {
                  id: replay.id,
                  setId: set.setId,
                  beatmapId: beatmap.id,
                  mode: gameMode,
                  version: beatmap.version,
                  createdAt: Date.now(),
                  score: replayScore.score,
                  accuracy: replayScore.accuracy,
                  maxCombo: replayScore.maxCombo,
                  counts: { ...replayScore.counts },
                  mods: [...mods],
                };
                saveScore(record);
              }
            },
          },
        });
        engineRef.current = engine;
        setPhase("ready");
      } catch (e) {
        console.error("引擎创建失败", e);
        setErrorMsg(e instanceof Error ? e.message : "引擎初始化失败");
        setPhase("loading");
      }
    };

    // 等下一帧让 canvas/audio 挂载
    requestAnimationFrame(init);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // 引擎创建依赖较多，避免音量/offset 等运行时可调设置导致整引擎重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, beatmap, gameMode, isLandscape, auto, showCursor, showStoryboard, showVideo, backgroundDim, showLyrics, lyricsEffect, lyricsSize, spectatorMode, keyBindings, lyrics, showCursorTrail, showCursorPress, autoCursorSpeed, autoCircleMode, hitSoundVolume, useHitSamples, defaultSampleSet, customHitSoundUrls, approachMultiplier, backgroundBlur, showFollowPoints, showApproachCircles, showComboNumbers, showHitEffects, showFPS, hudScale, cursorSize, playbackRate, mods, useBeatmapSkin, useCustomSkin, customSkinAssetUrls, customComboColors, useCustomComboColors, circleBorderWidth, sliderBorderWidth, sliderBallScale, hitCircleScale, selectedReplay]);

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

  // 查看刚结束游戏的回放：用录制的回放重建引擎并自动开始
  const handleWatchReplay = useCallback(() => {
    const replay = lastReplayRef.current;
    if (!replay) return;
    autoStartRef.current = true;
    setJustSavedReplay(false);
    setSelectedReplay(replay);
    setPhase("loading");
  }, []);

  // 引擎重建后若标记了自动开始，则立即启动
  useEffect(() => {
    if (phase === "ready" && autoStartRef.current) {
      const engine = engineRef.current;
      if (engine) {
        autoStartRef.current = false;
        setPhase("playing");
        engine.start();
      }
    }
  }, [phase]);

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

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      if (activePointerId === null) activePointerId = e.pointerId;
      const p = getPos(e);
      engine.setCursorPos(p.x, p.y);
      engine.onPointerDown(p.x, p.y);
    };
    const onMove = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      const p = getPos(e);
      engine.setCursorPos(p.x, p.y);
      engine.onPointerMove?.(p.x, p.y);
    };
    const onUp = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
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
    return (
      <ResultScreen
        score={score}
        onRetry={handleRestart}
        onBack={() => navigate(-1)}
        mode={gameMode}
        justSaved={justSavedReplay}
        canWatchReplay={justSavedReplay && !!lastReplayRef.current}
        onWatchReplay={handleWatchReplay}
      />
    );
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

      {/* 回放模式标识 */}
      {selectedReplay && phase === "playing" && (
        <div
          style={{
            position: "absolute",
            top: "env(safe-area-inset-top, 0px)",
            left: 12,
            paddingTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#ff9100",
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: "none",
            zIndex: 10,
            marginTop: 4,
          }}
        >
          <Eye size={14} /> 回放中
        </div>
      )}

      {/* HUD 浮层（右上角聚合菜单） */}
      <div
        style={{
          position: "absolute",
          top: "env(safe-area-inset-top, 0px)",
          right: 12,
          paddingTop: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="菜单"
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
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {menuOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              pointerEvents: "auto",
            }}
          >
            {phase === "playing" && (
              <button
                onClick={() => {
                  handlePause();
                  setMenuOpen(false);
                }}
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
                }}
              >
                <Pause size={18} fill="currentColor" />
              </button>
            )}
            <button
              onClick={() => {
                toggleFullscreen();
                setMenuOpen(false);
              }}
              aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
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
              }}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
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
              }}
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {/* 准备页浮层 */}
      {phase === "ready" && (
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
              准备好了吗？
            </h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {selectedReplay ? "回放模式：将按录制输入自动游玩" : "点击开始后立即播放音频"}
            </p>
          </div>
          {availableReplays.length > 0 && (
            <select
              value={selectedReplay?.id || ""}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedReplay(id ? availableReplays.find((r) => r.id === id) || null : null);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                fontSize: 14,
                outline: "none",
                minWidth: 220,
              }}
            >
              <option value="">新游戏</option>
              {availableReplays.map((r) => (
                <option key={r.id} value={r.id}>
                  回放 {new Date(r.createdAt).toLocaleString()} · {r.score.accuracy.toFixed(2)}%
                </option>
              ))}
            </select>
          )}
          <GlassButton onClick={handleStart} accent style={{ padding: "14px 28px", fontSize: 16 }}>
            <Play size={18} fill="currentColor" />
            {selectedReplay ? "播放回放" : "开始游戏"}
          </GlassButton>
        </div>
      )}

      {/* 暂停页浮层 */}
      {phase === "paused" && (
        <PauseOverlay
          mode={gameMode}
          score={score}
          onResume={handleResume}
          onRestart={handleRestart}
          onBack={() => navigate(-1)}
          onHome={() => navigate("/")}
        />
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
  justSaved?: boolean;
  canWatchReplay?: boolean;
  onWatchReplay?: () => void;
}> = ({ score, mode, onRetry, onBack, justSaved, canWatchReplay, onWatchReplay }) => {
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

  const failed = score.health <= 0;

  return (
    <div className="page-shell">
      <div className="solid-card p-6 md:p-8 animate-enter">
        <div className="text-center">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {MODE_LABEL[mode]} · 结算
          </p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl" style={{ color: failed ? "#ff375f" : "var(--accent)" }}>
            {failed ? "失败" : "完成！"}
          </h1>
          {justSaved && (
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              回放已自动保存
            </p>
          )}

          {/* 评级 */}
          <div
            className="mx-auto my-4 flex h-24 w-24 items-center justify-center sm:my-6 sm:h-28 sm:w-28"
            style={{
              borderRadius: "50%",
              background: "var(--accent-soft)",
              border: "3px solid var(--accent)",
            }}
          >
            <span className="text-5xl font-extrabold sm:text-6xl" style={{ color: "var(--accent)" }}>{rank}</span>
          </div>
        </div>

        {/* 主要数据 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Stat label="分数" value={Math.round(score.score).toLocaleString()} />
          <Stat label="准确率" value={`${score.accuracy.toFixed(2)}%`} />
          <Stat label="最大连击" value={`${score.maxCombo}x`} />
          <Stat label="总命中" value={String(total)} />
        </div>

        {/* 判定明细 */}
        <div className="mt-5 grid grid-cols-4 gap-1.5 sm:mt-6 sm:gap-2">
          <Judgement label="300" count={score.judgements["300"]} color="#66cc44" />
          <Judgement label="100" count={score.judgements["100"]} color="#0a84ff" />
          <Judgement label="50" count={score.judgements["50"]} color="#ff9100" />
          <Judgement label="Miss" count={score.judgements.miss} color="#ff375f" />
        </div>

        {/* 操作：移动端纵向排列，桌面端横向 */}
        <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
          <GlassButton onClick={onBack} className="w-full sm:flex-1">
            <ArrowLeft size={14} /> 返回
          </GlassButton>
          {canWatchReplay && onWatchReplay && (
            <GlassButton onClick={onWatchReplay} className="w-full sm:flex-1">
              <Eye size={14} /> 查看回放
            </GlassButton>
          )}
          <GlassButton onClick={onRetry} accent className="w-full sm:flex-1">
            <RotateCcw size={14} /> 再来一次
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

// === 暂停页 ===
const PauseOverlay: React.FC<{
  mode: GameMode;
  score: ScoreState | null;
  onResume: () => void;
  onRestart: () => void;
  onBack: () => void;
  onHome: () => void;
}> = ({ mode, score, onResume, onRestart, onBack, onHome }) => {
  const judgements = score?.judgements ?? { "300": 0, "100": 0, "50": 0, miss: 0 };
  const total = judgements["300"] + judgements["100"] + judgements["50"] + judgements.miss;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        padding: 20,
      }}
    >
      <div
        className="solid-card"
        style={{
          width: "min(420px, 92vw)",
          borderRadius: 22,
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{MODE_LABEL[mode]} 模式</p>
          <h2 className="mt-1 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>已暂停</h2>
        </div>

        {score && (
          <div className="grid grid-cols-3 gap-3">
            <PauseStat label="分数" value={Math.round(score.score).toLocaleString()} />
            <PauseStat label="准确率" value={`${score.accuracy.toFixed(2)}%`} />
            <PauseStat label="连击" value={`${score.combo}x / ${score.maxCombo}x`} />
          </div>
        )}

        {score && total > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <PauseJudgement label="300" count={judgements["300"]} color="#66cc44" />
            <PauseJudgement label="100" count={judgements["100"]} color="#0a84ff" />
            <PauseJudgement label="50" count={judgements["50"]} color="#ff9100" />
            <PauseJudgement label="Miss" count={judgements.miss} color="#ff375f" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <GlassButton onClick={onResume} accent style={{ padding: "12px 0", fontSize: 15 }}>
            <Play size={16} fill="currentColor" /> 继续
          </GlassButton>
          <GlassButton onClick={onRestart} style={{ padding: "12px 0", fontSize: 15 }}>
            <RotateCcw size={16} /> 重开
          </GlassButton>
          <GlassButton onClick={onBack} style={{ padding: "12px 0", fontSize: 15 }}>
            <ArrowLeft size={16} /> 返回选歌
          </GlassButton>
          <GlassButton onClick={onHome} style={{ padding: "12px 0", fontSize: 15 }}>
            <Home size={16} /> 主页
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

const PauseStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    className="p-3 text-center"
    style={{
      borderRadius: 14,
      background: "rgba(255,255,255,0.06)",
    }}
  >
    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
    <div className="mt-1 text-sm font-bold md:text-base" style={{ color: "var(--text-primary)" }}>{value}</div>
  </div>
);

const PauseJudgement: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div
    className="p-2 text-center"
    style={{
      borderRadius: 10,
      background: `${color}1a`,
    }}
  >
    <div className="text-xs font-bold" style={{ color }}>{label}</div>
    <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{count}</div>
  </div>
);

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
