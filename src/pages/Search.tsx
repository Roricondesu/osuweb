import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard, OsuLogoIcon } from "@/components/common";
import { Search as SearchIcon, X, SlidersHorizontal, ArrowDownUp, Film, Image } from "lucide-react";
import { OsuModeIcon } from "@/components/common";
import type { GameMode, BeatmapSet } from "@/types";
import { MODE_COLOR } from "@/types";

const MODE_TABS: { key: GameMode | null; label: string }[] = [
  { key: null, label: "全部" },
  { key: "standard", label: "osu!" },
  { key: "taiko", label: "Taiko" },
  { key: "catch", label: "Catch" },
  { key: "mania", label: "Mania" },
];

const SEARCH_TYPES = [
  { key: "all", label: "全部" },
  { key: "title", label: "歌曲" },
  { key: "artist", label: "歌手" },
] as const;

type SearchType = (typeof SEARCH_TYPES)[number]["key"];

const QUICK_QUERIES = ["HoneyWorks", "YOASOBI", "LiSA", "米津玄師", "DECO*27", "初音ミク"];

type SortKey = "relevance" | "stars_desc" | "bpm_desc" | "title" | "recent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "默认" },
  { key: "stars_desc", label: "星级 高→低" },
  { key: "bpm_desc", label: "BPM 高→低" },
  { key: "recent", label: "最新上架" },
  { key: "title", label: "标题 A→Z" },
];

const PAGE_SIZE = 24;

const setStats = (s: BeatmapSet) => {
  const bs = s.beatmaps || [];
  const stars = bs.length ? Math.max(...bs.map((b) => b.difficulty_rating || 0)) : 0;
  const bpm = s.bpm ?? (bs.length ? Math.max(...bs.map((b) => b.bpm || 0)) : 0);
  const ar = bs.length ? Math.max(...bs.map((b) => b.ar || 0)) : 0;
  const cs = bs.length ? Math.max(...bs.map((b) => b.cs || 0)) : 0;
  return { stars, bpm, ar, cs };
};

const RangeFilter: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (v: number) => string;
}> = ({ label, min, max, step, value, onChange, format }) => {
  const [lo, hi] = value;
  const fmt = format ?? ((v: number) => String(v));
  const active = lo > min || hi < max;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
        <button
          onClick={() => onChange([min, max])}
          disabled={!active}
          style={{
            border: "none", background: "transparent", cursor: active ? "pointer" : "default",
            color: active ? "var(--lazer-accent)" : "var(--text-secondary)",
            fontSize: 11, padding: 0, opacity: active ? 1 : 0.4,
          }}
        >
          {fmt(lo)} – {fmt(hi)}{active ? " · 清除" : ""}
        </button>
      </div>
      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999 }} />
        <div
          style={{
            position: "absolute",
            left: `${((lo - min) / (max - min)) * 100}%`,
            right: `${(1 - (hi - min) / (max - min)) * 100}%`,
            height: 4,
            background: "var(--accent)",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          style={{ position: "absolute", left: 0, right: 0, width: "100%", appearance: "none", background: "transparent", pointerEvents: "none", margin: 0, height: 24 }}
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          style={{ position: "absolute", left: 0, right: 0, width: "100%", appearance: "none", background: "transparent", pointerEvents: "none", margin: 0, height: 24 }}
        />
      </div>
    </div>
  );
};

/** 小型可点击筛选标签 */
const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: "5px 12px",
      fontSize: 11,
      fontWeight: 600,
      borderRadius: 999,
      border: `1px solid ${active ? "var(--accent)" : "var(--glass-border)"}`,
      color: active ? "var(--accent)" : "var(--text-secondary)",
      background: active ? "var(--accent-soft)" : "transparent",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 4,
      transition: "all 0.15s ease",
      flexShrink: 0,
    }}
  >
    {icon}
    {label}
  </button>
);

export default function Search() {
  const search = useGameStore((s) => s.search);
  const searchMode = useGameStore((s) => s.searchMode);
  const results = useGameStore((s) => s.searchResults);
  const loading = useGameStore((s) => s.searchLoading);
  const error = useGameStore((s) => s.searchError);
  const settings = useGameStore((s) => s.settings);
  const updateSetting = useGameStore((s) => s.updateSetting);

  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const [bpmRange, setBpmRange] = useState<[number, number]>([0, 400]);
  const [starRange, setStarRange] = useState<[number, number]>([0, 10]);
  const [arRange, setArRange] = useState<[number, number]>([0, 10]);
  const [csRange, setCsRange] = useState<[number, number]>([0, 10]);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length === 0 && !loading) {
      search("", searchMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results, query, searchType, sortKey, bpmRange, starRange, arRange, csRange]);

  const handleSubmit = useCallback(() => {
    search(query, searchMode);
  }, [query, searchMode, search]);

  const filteredResults = useMemo(() => {
    let list = results.slice();
    if (searchType !== "all" && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((s) => {
        if (searchType === "title")
          return s.title.toLowerCase().includes(q) || (s.title_unicode?.toLowerCase().includes(q) ?? false);
        if (searchType === "artist")
          return s.artist.toLowerCase().includes(q) || (s.artist_unicode?.toLowerCase().includes(q) ?? false);
        return true;
      });
    }
    list = list.filter((s) => {
      const st = setStats(s);
      if (st.bpm > 0 && (st.bpm < bpmRange[0] || st.bpm > bpmRange[1])) return false;
      if (st.stars < starRange[0] || st.stars > starRange[1]) return false;
      if (st.ar < arRange[0] || st.ar > arRange[1]) return false;
      if (st.cs < csRange[0] || st.cs > csRange[1]) return false;
      return true;
    });
    if (sortKey !== "relevance") {
      list = list.slice().sort((a, b) => {
        const sa = setStats(a);
        const sb = setStats(b);
        if (sortKey === "stars_desc") return sb.stars - sa.stars;
        if (sortKey === "bpm_desc") return sb.bpm - sa.bpm;
        if (sortKey === "title")
          return (a.title_unicode || a.title).localeCompare(b.title_unicode || b.title);
        if (sortKey === "recent") return (b.ranked || 0) - (a.ranked || 0);
        return 0;
      });
    }
    return list;
  }, [results, searchType, query, bpmRange, starRange, arRange, csRange, sortKey]);

  const visibleResults = filteredResults.slice(0, visibleCount);
  const hasMore = visibleResults.length < filteredResults.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredResults.length));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, filteredResults.length]);

  const filterActive =
    bpmRange[0] > 0 ||
    bpmRange[1] < 400 ||
    starRange[0] > 0 ||
    starRange[1] < 10 ||
    arRange[0] > 0 ||
    arRange[1] < 10 ||
    csRange[0] > 0 ||
    csRange[1] < 10;

  const toggleStoryboard = () => {
    updateSetting("storyboardOnly", !settings.storyboardOnly);
    search(query, searchMode);
  };

  const toggleVideo = () => {
    updateSetting("videoOnly", !settings.videoOnly);
    search(query, searchMode);
  };

  return (
    <div className="page-shell">
      {/* 搜索栏 */}
      <section
        style={{
          borderRadius: "var(--radius-lg)",
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
          padding: "var(--panel-pad, 16px)",
          animation: "stagger-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* 标题 + 搜索框 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <SearchIcon size={20} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="歌曲 / 艺人 / 关键词…"
            className="font-torus"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 16,
              fontWeight: 600,
              padding: 0,
              minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); search("", searchMode); }}
              aria-label="清空"
              style={{
                border: "none", background: "transparent",
                color: "var(--text-secondary)", cursor: "pointer", padding: 4,
                display: "flex", flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={handleSubmit}
            className="lazer-cta"
            style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}
          >
            搜索
          </button>
        </div>

        {/* 模式 Tab */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
          {MODE_TABS.map((tab) => {
            const active = searchMode === tab.key;
            return (
              <button
                key={tab.label}
                onClick={() => search(query, tab.key)}
                className="hud-btn font-torus"
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  display: "flex", alignItems: "center", gap: 5,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {tab.key && (
                  <OsuModeIcon mode={tab.key} size={13} color={active ? "var(--accent)" : MODE_COLOR[tab.key]} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 筛选标签行：搜索类型 + storyboard/video + 高级筛选 + 排序 + 搜索源 */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto", paddingBottom: 2 }}>
          {SEARCH_TYPES.map((t) => (
            <FilterChip
              key={t.key}
              active={searchType === t.key}
              onClick={() => setSearchType(t.key)}
              label={t.label}
            />
          ))}

          <span style={{ width: 1, height: 16, background: "var(--glass-border)", flexShrink: 0 }} />

          <FilterChip
            active={!!settings.storyboardOnly}
            onClick={toggleStoryboard}
            icon={<Image size={12} />}
            label="Storyboard"
          />
          <FilterChip
            active={!!settings.videoOnly}
            onClick={toggleVideo}
            icon={<Film size={12} />}
            label="视频"
          />

          <span style={{ width: 1, height: 16, background: "var(--glass-border)", flexShrink: 0 }} />

          <FilterChip
            active={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
            icon={<SlidersHorizontal size={12} />}
            label="筛选"
          />

          {/* 排序下拉 */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <ArrowDownUp size={12} style={{ color: "var(--text-secondary)", marginRight: -4, pointerEvents: "none", position: "absolute", left: 8 }} />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{
                appearance: "none", background: "transparent",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                borderRadius: 999, padding: "5px 24px 5px 24px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key} style={{ background: "var(--card-bg)", color: "#fff" }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <span style={{ width: 1, height: 16, background: "var(--glass-border)", flexShrink: 0 }} />

          {(["all", "osu", "sayobot", "kitsu", "chimu"] as const).map((src) => (
            <FilterChip
              key={src}
              active={settings.searchSource === src}
              onClick={() => { updateSetting("searchSource", src); search(query, searchMode); }}
              label={src === "all" ? "全部竞速" : src === "osu" ? "osu.direct" : src === "sayobot" ? "Sayobot" : src === "kitsu" ? "Kitsu" : "Chimu"}
            />
          ))}
        </div>

        {/* 快速搜索 */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}>
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                search(q, searchMode);
              }}
              style={{
                padding: "4px 10px", fontSize: 11,
                borderRadius: 999, border: "1px solid var(--glass-border)",
                color: "var(--text-secondary)", background: "transparent",
                cursor: "pointer", transition: "all 0.15s ease",
                flexShrink: 0, whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--glass-border)";
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* 高级筛选面板 */}
        {filterOpen && (
          <div
            style={{
              marginTop: 12, padding: 16, borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--glass-border)",
              display: "grid", gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              animation: "stagger-fade-up 0.3s ease both",
            }}
          >
            <RangeFilter label="BPM" min={0} max={400} step={5} value={bpmRange} onChange={setBpmRange} />
            <RangeFilter label="星级" min={0} max={10} step={0.1} value={starRange} onChange={setStarRange} format={(v) => v.toFixed(1)} />
            <RangeFilter label="AR" min={0} max={10} step={0.5} value={arRange} onChange={setArRange} />
            <RangeFilter label="CS" min={0} max={10} step={0.5} value={csRange} onChange={setCsRange} />
            {filterActive && (
              <button
                onClick={() => {
                  setBpmRange([0, 400]);
                  setStarRange([0, 10]);
                  setArRange([0, 10]);
                  setCsRange([0, 10]);
                }}
                style={{
                  alignSelf: "end", justifySelf: "start",
                  padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  border: "1px solid var(--glass-border)", background: "transparent",
                  color: "var(--text-secondary)", cursor: "pointer",
                }}
              >
                清除全部筛选
              </button>
            )}
          </div>
        )}
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

      {/* 结果统计 */}
      {!loading && !error && filteredResults.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-secondary)" }}>
          共 {filteredResults.length} 个结果
        </div>
      )}

      {/* 加载中 */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <OsuLogoIcon size={48} color="var(--accent)" className="loading-entrance" />
        </div>
      ) : filteredResults.length === 0 ? (
        <div
          style={{
            marginTop: 16, padding: 32, borderRadius: "var(--radius-lg)",
            background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
            没有找到结果，试试别的关键词或调整筛选
          </p>
        </div>
      ) : (
        <>
          <section className="card-grid" style={{ marginTop: 16 }}>
            {visibleResults.map((set, i) => (
              <BeatmapCard key={set.id} set={set} index={i} />
            ))}
          </section>
          {hasMore && (
            <div
              ref={sentinelRef}
              style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}
            >
              <OsuLogoIcon size={32} color="var(--accent)" className="loading-entrance" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
