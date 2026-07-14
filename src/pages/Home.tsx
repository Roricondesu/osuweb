import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard, BeatmapCover, StarRatingBar, ModeBadge } from "@/components/common";
import { useNavigate } from "react-router-dom";
import { Play, ChevronLeft, ChevronRight, Download, Search as SearchIcon, Flame, Heart } from "lucide-react";
import type { GameMode, BeatmapSet, LoadedBeatmapSet } from "@/types";
import { useFavoritesStore } from "@/store/useFavoritesStore";

const MODE_TABS: { key: GameMode | null; label: string }[] = [
  { key: null, label: "全部" },
  { key: "standard", label: "osu!" },
  { key: "taiko", label: "Taiko" },
  { key: "catch", label: "Catch" },
  { key: "mania", label: "Mania" },
];

const HERO_ROTATE_MS = 6000;

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onMore?: () => void;
}> = ({ icon, title, subtitle, onMore }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 30, height: 30, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--accent-soft)", color: "var(--accent)",
        }}
      >
        {icon}
      </span>
      <div>
        <h2 className="font-torus" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{subtitle}</p>
        )}
      </div>
    </div>
    {onMore && (
      <button
        onClick={onMore}
        className="hud-btn"
        style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}
      >
        查看更多
      </button>
    )}
  </div>
);

/** Hero 轮播 */
const HeroCarousel: React.FC<{ sets: BeatmapSet[] }> = ({ sets }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  // 当 sets 改变时重置
  useEffect(() => {
    setIndex(0);
  }, [sets]);

  const goTo = useCallback((i: number) => {
    setIndex(((i % sets.length) + sets.length) % sets.length);
  }, [sets.length]);

  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  // 自动轮播
  useEffect(() => {
    if (sets.length <= 1) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % sets.length);
    }, HERO_ROTATE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, sets.length]);

  // 卸载时清除定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (sets.length === 0) return null;
  const set = sets[index];
  if (!set) return null;

  const cover = set.covers?.["cover@2x"] || set.covers?.cover || "";
  const maxStars = set.beatmaps.length ? Math.max(...set.beatmaps.map((b) => b.difficulty_rating || 0)) : 0;
  const modes = Array.from(new Set(set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3))).slice(0, 2);
  const modeNames = ["standard", "taiko", "catch", "mania"] as const;

  const handlePlay = () => {
    navigate(`/set/${set.id}`);
  };

  return (
    <div
      style={{
        position: "relative", overflow: "hidden", borderRadius: "var(--radius-lg)",
        aspectRatio: "16/7", minHeight: 220, cursor: "pointer",
        border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)",
      }}
      onClick={handlePlay}
    >
      {/* 背景封面 */}
      <BeatmapCover
        src={cover}
        alt={set.title}
        placeholderSize={56}
        style={{ position: "absolute", inset: 0 }}
        imgStyle={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: "scale(1.04)",
          transition: "transform 0.8s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      {/* 渐变遮罩 */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.6)",
          pointerEvents: "none",
        }}
      />
      {/* 内容 */}
      <div
        style={{
          position: "absolute", inset: 0, padding: "clamp(16px, 4vw, 32px)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {modes.map((m) => (
            <ModeBadge key={m} mode={modeNames[m]} />
          ))}
          {set.hasStoryboard && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: "var(--accent)", color: "#fff",
            }}>
              STORYBOARD
            </span>
          )}
        </div>
        <h1
          className="font-torus"
          style={{
            fontSize: "clamp(20px, 3.5vw, 32px)", fontWeight: 700,
            letterSpacing: "-0.02em", color: "#fff", margin: 0,
            textShadow: "0 2px 12px rgba(0,0,0,0.4)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: "80%",
          }}
        >
          {set.title_unicode || set.title}
        </h1>
        <p
          style={{
            fontSize: "clamp(12px, 1.5vw, 14px)", color: "rgba(255,255,255,0.78)",
            margin: "4px 0 0",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: "80%",
          }}
        >
          {set.artist_unicode || set.artist} · {set.creator}
        </p>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 140 }}>
            <StarRatingBar stars={maxStars} variant="full" height={6} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handlePlay(); }}
            className="lazer-cta"
            style={{
              padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Play size={14} fill="currentColor" />
            立即游玩
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/set/${set.id}`); }}
            className="hud-btn"
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#fff",
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)",
            }}
          >
            查看详情
          </button>
        </div>
      </div>

      {/* 左右箭头 */}
      {sets.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="上一个"
            style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              width: 36, height: 36, borderRadius: "50%",
              border: "1px solid var(--glass-border)",
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
              color: "#fff", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="下一个"
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              width: 36, height: 36, borderRadius: "50%",
              border: "1px solid var(--glass-border)",
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)",
              color: "#fff", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <ChevronRight size={18} />
          </button>

          {/* 指示点 */}
          <div
            style={{
              position: "absolute", bottom: 12, right: 16, display: "flex", gap: 6,
            }}
          >
            {sets.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                aria-label={`第 ${i + 1} 个`}
                style={{
                  width: i === index ? 20 : 6, height: 6,
                  borderRadius: 999,
                  background: i === index ? "var(--accent)" : "rgba(255,255,255,0.4)",
                  border: "none", cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/** 最近下载的横向卡片（osu!web 风格） */
const DownloadedCard: React.FC<{ loaded: LoadedBeatmapSet }> = ({ loaded }) => {
  const navigate = useNavigate();
  const modes = Array.from(new Set(loaded.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3)));
  const maxStars = loaded.beatmaps.length ? Math.max(...loaded.beatmaps.map((b) => b.difficulty_rating || 0)) : 0;

  return (
    <div
      onClick={() => navigate(`/set/${loaded.setId}`)}
      style={{
        flexShrink: 0, width: "min(360px, 85vw)", height: 100, cursor: "pointer",
        display: "flex",
        borderRadius: "var(--radius-sm)", overflow: "hidden",
        transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      }}
    >
      {/* 方形封面 */}
      <div style={{ position: "relative", width: 100, minWidth: 100, height: "100%", overflow: "hidden", zIndex: 1 }}>
        <BeatmapCover
          src={loaded.cover}
          alt={loaded.title}
          placeholderSize={32}
          style={{ position: "absolute", inset: 0 }}
          imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {/* 信息盒 */}
      <div
        style={{
          position: "relative", flex: 1, height: "100%", marginLeft: -7,
          borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--card-info-bg)",
        }}
      >
        {loaded.cover && (
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${loaded.cover})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(25px) brightness(0.4) saturate(1.3)",
              transform: "scale(1.3)", opacity: 0.5,
            }}
          />
        )}
        {/* 深灰渐变半透明遮罩：左 #2E3835 → 右 90%透明（封面透过） */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #2E3835 0%, rgba(46,56,53,0.1) 100%)" }} />
        <div
          style={{
            position: "relative", height: "100%", padding: "6px 10px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}
        >
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: 15, fontWeight: 600, color: "#fff",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                letterSpacing: "-0.01em", lineHeight: 1.25,
              }}
            >
              {loaded.title}
            </div>
            <div
              style={{
                fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)",
                marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                lineHeight: 1.3,
              }}
            >
              {loaded.artist}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarRatingBar stars={maxStars} variant="dots" />
            <span className="hud-num" style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
              {maxStars.toFixed(2)}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
              {modes.length} 模式
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const searchResults = useGameStore((s) => s.searchResults);
  const loading = useGameStore((s) => s.searchLoading);
  const error = useGameStore((s) => s.searchError);
  const searchMode = useGameStore((s) => s.searchMode);
  const loadFeatured = useGameStore((s) => s.loadFeatured);
  const downloaded = useGameStore((s) => s.downloaded);
  const favorites = useFavoritesStore((s) => s.favorites);

  useEffect(() => {
    if (searchResults.length === 0 && !loading) {
      loadFeatured(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hero 选取：取前 6 个，有封面且星级较高的优先
  const heroSets = useMemo(() => {
    return searchResults
      .filter((s) => s.covers?.cover || s.covers?.["cover@2x"])
      .slice(0, 6);
  }, [searchResults]);

  // 最近下载（按 downloadedAt 倒序，最多 10 个）
  const recentDownloads = useMemo(() => {
    return Array.from(downloaded.values())
      .sort((a, b) => b.downloadedAt - a.downloadedAt)
      .slice(0, 10);
  }, [downloaded]);

  // 收藏的谱面（在 searchResults 或 downloaded 中能找到的）
  const favSets = useMemo(() => {
    if (favorites.length === 0) return [];
    const favInResults = searchResults.filter((s) => favorites.includes(s.id));
    const favInDownloads: BeatmapSet[] = [];
    for (const fav of favorites) {
      const d = downloaded.get(fav);
      if (d && !favInResults.some((s) => s.id === d.setId)) {
        // LoadedBeatmapSet → BeatmapSet 简易映射
        favInDownloads.push({
          id: d.setId,
          title: d.title,
          artist: d.artist,
          creator: "",
          covers: { cover: d.cover },
          beatmaps: d.beatmaps,
          hasStoryboard: d.hasStoryboard,
        });
      }
    }
    return [...favInResults, ...favInDownloads].slice(0, 10);
  }, [favorites, searchResults, downloaded]);

  return (
    <div className="page-shell">
      {/* Hero */}
      <section style={{ animation: "stagger-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
        <HeroCarousel sets={heroSets} />
      </section>

      {/* 模式过滤 + 搜索入口 */}
      <section
        style={{
          marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8,
          alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MODE_TABS.map((tab) => {
            const active = searchMode === tab.key;
            return (
              <button
                key={tab.label}
                onClick={() => loadFeatured(tab.key)}
                className="hud-btn"
                style={{
                  padding: "7px 16px", fontSize: 12, fontWeight: 600,
                  color: active ? "var(--lazer-accent)" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => navigate("/search")}
          className="hud-btn"
          style={{
            padding: "7px 14px", fontSize: 12, fontWeight: 600,
            color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <SearchIcon size={12} />
          搜索谱面
        </button>
      </section>

      {/* 错误 */}
      {error && (
        <div
            style={{
              marginTop: 16, padding: 14, borderRadius: "var(--radius-md)",
              background: "var(--error-soft)", border: "1px solid var(--error)",
              color: "var(--error)", fontSize: 13,
            }}
          >
            {error}
          </div>
      )}

      {/* 加载中 */}
      {loading && searchResults.length === 0 ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "3px solid var(--glass-border)",
              borderTopColor: "var(--lazer-accent)",
              animation: "spin-slow 0.8s linear infinite",
            }}
          />
        </div>
      ) : (
        <>
          {/* 热门谱面 */}
          <section style={{ marginTop: 20 }}>
            <SectionHeader
              icon={<Flame size={16} />}
              title="热门谱面"
              subtitle="从 osu.direct 镜像获取最新上架的谱面"
              onMore={() => navigate("/search")}
            />
            <div className="card-grid">
              {searchResults.map((set, i) => (
                <BeatmapCard key={set.id} set={set} index={i} />
              ))}
            </div>
          </section>

          {/* 最近下载 */}
          {recentDownloads.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <SectionHeader
                icon={<Download size={16} />}
                title="最近下载"
                subtitle={`${recentDownloads.length} 个已下载的谱面`}
                onMore={() => navigate("/downloads")}
              />
              <div className="h-scroll">
                {recentDownloads.map((d) => (
                  <DownloadedCard key={d.setId} loaded={d} />
                ))}
              </div>
            </section>
          )}

          {/* 我的收藏 */}
          {favSets.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <SectionHeader
                icon={<Heart size={16} />}
                title="我的收藏"
                subtitle={`${favSets.length} 个收藏的谱面`}
              />
              <div className="card-grid">
                {favSets.map((set, i) => (
                  <BeatmapCard key={set.id} set={set} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* 空状态 */}
          {!loading && searchResults.length === 0 && !error && (
            <div
              style={{
                marginTop: 16, padding: 32, borderRadius: "var(--radius-lg)",
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                暂无内容，去搜索页找找看吧
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
