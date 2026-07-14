import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard } from "@/components/common";
import { Search as SearchIcon, X, SlidersHorizontal, ChevronDown, ArrowDownUp } from "lucide-react";
import type { GameMode, BeatmapSet } from "@/types";

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

/** 取一个 set 的代表属性（取所有 beatmap 的极值） */
const setStats = (s: BeatmapSet) => {
  const bs = s.beatmaps || [];
  const stars = bs.length ? Math.max(...bs.map((b) => b.difficulty_rating || 0)) : 0;
  const minStars = bs.length ? Math.min(...bs.map((b) => b.difficulty_rating || 0)) : 0;
  const bpm = s.bpm ?? (bs.length ? Math.max(...bs.map((b) => b.bpm || 0)) : 0);
  const ar = bs.length ? Math.max(...bs.map((b) => b.ar || 0)) : 0;
  const cs = bs.length ? Math.max(...bs.map((b) => b.cs || 0)) : 0;
  const od = bs.length ? Math.max(...bs.map((b) => b.od || 0)) : 0;
  const hp = bs.length ? Math.max(...bs.map((b) => b.hp || 0)) : 0;
  const length = bs.length ? Math.max(...bs.map((b) => b.hit_length || b.total_length || 0)) : 0;
  return { stars, minStars, bpm, ar, cs, od, hp, length };
};

/** 双滑块范围组件 */
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
        <div
          style={{
            position: "absolute", left: 0, right: 0, height: 4,
            background: "rgba(255,255,255,0.08)", borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${((lo - min) / (max - min)) * 100}%`,
            right: `${(1 - (hi - min) / (max - min)) * 100}%`,
            height: 4,
            background: "var(--lazer-gradient)",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          style={{
            position: "absolute", left: 0, right: 0, width: "100%",
            appearance: "none", background: "transparent", pointerEvents: "none",
            margin: 0, height: 24,
          }}
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          style={{
            position: "absolute", left: 0, right: 0, width: "100%",
            appearance: "none", background: "transparent", pointerEvents: "none",
            margin: 0, height: 24,
          }}
        />
      </div>
    </div>
  );
};

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

  // 高级筛选
  const [bpmRange, setBpmRange] = useState<[number, number]>([0, 400]);
  const [starRange, setStarRange] = useState<[number, number]>([0, 10]);
  const [arRange, setArRange] = useState<[number, number]>([0, 10]);
  const [csRange, setCsRange] = useState<[number, number]>([0, 10]);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");

  // 渐进式显示
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results.length === 0 && !loading) {
      search("", searchMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜索结果变化时重置显示数量
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results, query, searchType, sortKey, bpmRange, starRange, arRange, csRange]);

  const handleSubmit = useCallback(() => {
    search(query, searchMode);
  }, [query, searchMode, search]);

  const filteredResults = useMemo(() => {
    let list = results.slice();
    // 文本类型筛选
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
    // 数值范围筛选
    list = list.filter((s) => {
      const st = setStats(s);
      if (st.bpm > 0 && (st.bpm < bpmRange[0] || st.bpm > bpmRange[1])) return false;
      if (st.stars < starRange[0] || st.stars > starRange[1]) return false;
      if (st.ar < arRange[0] || st.ar > arRange[1]) return false;
      if (st.cs < csRange[0] || st.cs > csRange[1]) return false;
      return true;
    });
    // 排序
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

  // IntersectionObserver：到底部加载更多
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
          padding: 20,
          animation: "stagger-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}>
          搜索谱面
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          输入歌曲名、艺人名或关键词
        </p>

        {/* 搜索框 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14 }}>
          <div
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <SearchIcon size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="歌曲 / 艺人 / 关键词…"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--text-primary)", fontSize: 14, padding: 0,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="清空"
                style={{
                  border: "none", background: "transparent",
                  color: "var(--text-secondary)", cursor: "pointer", padding: 0,
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleSubmit}
            className="lazer-cta"
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fff" }}
          >
            搜索
          </button>
        </div>

        {/* 模式 Tab */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {MODE_TABS.map((tab) => {
            const active = searchMode === tab.key;
            return (
              <button
                key={tab.label}
                onClick={() => search(query, tab.key)}
                className="hud-btn"
                style={{
                  padding: "6px 14px", fontSize: 12, fontWeight: 600,
                  color: active ? "var(--lazer-accent)" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 第二行：搜索类型 + 高级筛选触发 + 搜索源 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" }}>
          {SEARCH_TYPES.map((t) => {
            const active = searchType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setSearchType(t.key)}
                className="hud-btn"
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600,
                  color: active ? "var(--lazer-accent)" : "var(--text-secondary)",
                }}
              >
                {t.label}
              </button>
            );
          })}

          <span style={{ width: 1, height: 16, background: "var(--glass-border)", margin: "0 4px" }} />

          {/* 高级筛选 */}
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="hud-btn"
            style={{
              padding: "5px 12px", fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
              color: filterActive ? "var(--lazer-accent)" : "var(--text-secondary)",
            }}
          >
            <SlidersHorizontal size={12} />
            筛选
            {filterActive && (
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--lazer-accent)",
                }}
              />
            )}
            <ChevronDown
              size={12}
              style={{
                transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {/* 排序 */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <ArrowDownUp size={12} style={{ color: "var(--text-secondary)", marginRight: -4, pointerEvents: "none" }} />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{
                appearance: "none", background: "transparent",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                borderRadius: 999, padding: "5px 24px 5px 22px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key} style={{ background: "#1a1a1f", color: "#fff" }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <span style={{ width: 1, height: 16, background: "var(--glass-border)", margin: "0 4px" }} />

          {(["all", "osu", "sayobot", "kitsu", "chimu"] as const).map((src) => {
            const active = settings.searchSource === src;
            return (
              <button
                key={src}
                onClick={() => updateSetting("searchSource", src)}
                className="hud-btn"
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 600,
                  color: active ? "var(--lazer-accent)" : "var(--text-secondary)",
                }}
              >
                {src === "all" ? "全部竞速" : src === "osu" ? "osu.direct" : src === "sayobot" ? "Sayobot" : src === "kitsu" ? "Kitsu" : "Chimu"}
              </button>
            );
          })}
        </div>

        {/* 快速搜索 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
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
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--lazer-accent)";
                e.currentTarget.style.borderColor = "var(--lazer-accent)";
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
              marginTop: 14, padding: 16, borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--glass-border)",
              display: "grid", gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
            background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.3)",
            color: "#ff453a", fontSize: 13,
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
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "3px solid var(--glass-border)",
              borderTopColor: "var(--lazer-accent)",
              animation: "spin-slow 0.8s linear infinite",
            }}
          />
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
          <section
            style={{
              marginTop: 16, display: "grid", gap: 12,
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            }}
          >
            {visibleResults.map((set, i) => (
              <BeatmapCard key={set.id} set={set} index={i} />
            ))}
          </section>
          {hasMore && (
            <div
              ref={sentinelRef}
              style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}
            >
              <div
                style={{
                  width: 24, height: 24, borderRadius: "50%",
                  border: "2px solid var(--glass-border)",
                  borderTopColor: "var(--lazer-accent)",
                  animation: "spin-slow 0.8s linear infinite",
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
