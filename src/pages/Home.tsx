import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard, BeatmapCover, StarRatingBar, ModeBadge, OsuModeIcon, StoryboardBadge, VideoBadge } from "@/components/common";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search as SearchIcon, Flame, Heart } from "lucide-react";
import type { GameMode, BeatmapSet } from "@/types";
import { MODE_COLOR } from "@/types";
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

/** Hero 推荐（移动端紧凑，桌面端卡片化） */
const HeroCarousel: React.FC<{ sets: BeatmapSet[] }> = ({ sets }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [sets]);

  const goTo = useCallback((i: number) => {
    setIndex(((i % sets.length) + sets.length) % sets.length);
  }, [sets.length]);

  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

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

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
        background: "var(--card-bg)",
        cursor: "pointer",
      }}
      onClick={() => navigate(`/set/${set.id}`)}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "stretch",
          minHeight: isMobile ? 0 : 200,
          maxHeight: isMobile ? "none" : 240,
        }}
      >
        {/* 左侧/顶部封面 */}
        <div
          style={{
            position: "relative",
            width: isMobile ? "100%" : 260,
            minWidth: isMobile ? "100%" : 260,
            aspectRatio: isMobile ? "16/9" : undefined,
            height: isMobile ? "auto" : 240,
            alignSelf: isMobile ? "auto" : "stretch",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <BeatmapCover
            src={cover}
            alt={set.title}
            placeholderSize={48}
            style={{ position: "absolute", inset: 0 }}
            imgStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* 右侧信息 */}
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            padding: isMobile ? 16 : 20,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 10,
            overflow: "hidden",
            borderRadius: isMobile ? "0 0 var(--radius-lg) var(--radius-lg)" : "0 var(--radius-lg) var(--radius-lg) 0",
          }}
        >
          {/* 背景模糊封面 */}
          {cover && (
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${cover})`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "blur(28px) brightness(0.35) saturate(1.2)",
                transform: "scale(1.2)", opacity: 0.45,
                pointerEvents: "none",
              }}
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(30,30,38,0.95) 0%, rgba(30,30,38,0.75) 100%)", pointerEvents: "none" }} />

          {/* 顶部：标签 */}
          <div style={{ position: "relative", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {modes.map((m) => (
              <ModeBadge key={m} mode={modeNames[m]} />
            ))}
            {set.hasStoryboard && <StoryboardBadge size="sm" />}
            {set.hasVideo && <VideoBadge size="sm" />}
          </div>

          {/* 中部：标题信息 */}
          <div style={{ position: "relative", minWidth: 0 }}>
            <h1
              className="font-torus"
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: 0,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {set.title_unicode || set.title}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.72)",
                margin: "4px 0 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {set.artist_unicode || set.artist} · {set.creator}
            </p>
          </div>

          {/* 底部：星级 + 查看 */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 120, flexShrink: 0 }}>
              <StarRatingBar stars={maxStars} variant="full" height={5} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/set/${set.id}`); }}
              className="hud-btn"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "#fff",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                flexShrink: 0,
                borderRadius: "var(--radius-sm)",
              }}
            >
              查看详情
            </button>
          </div>
        </div>
      </div>

      {/* 指示点 + 箭头 */}
      {sets.length > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "10px 14px" : "10px 16px",
            borderTop: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="上一个"
            className="hud-btn"
            style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: "flex", gap: 5 }}>
            {sets.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                aria-label={`第 ${i + 1} 个`}
                style={{
                  width: i === index ? 18 : 5,
                  height: 5,
                  borderRadius: 999,
                  background: i === index ? "var(--accent)" : "rgba(255,255,255,0.35)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="下一个"
            className="hud-btn"
            style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
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
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {tab.key && (
                  <OsuModeIcon
                    mode={tab.key}
                    size={13}
                    color={active ? "var(--accent)" : MODE_COLOR[tab.key]}
                  />
                )}
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
              borderTopColor: "var(--accent)",
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
