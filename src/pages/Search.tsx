import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard } from "@/components/common";
import { Search as SearchIcon, X, Filter } from "lucide-react";
import { GlassButton } from "@/components/glass/GlassButton";
import type { GameMode, BeatmapSet } from "@/types";

const MODE_TABS: { key: GameMode | null; label: string }[] = [
  { key: null, label: "全部" },
  { key: "standard", label: "osu!" },
  { key: "taiko", label: "Taiko!" },
  { key: "catch", label: "Catch!" },
  { key: "mania", label: "Mania!" },
];

const SEARCH_TYPES = [
  { key: "all", label: "全部" },
  { key: "title", label: "歌曲" },
  { key: "artist", label: "歌手" },
] as const;

type SearchType = typeof SEARCH_TYPES[number]["key"];

const QUICK_QUERIES = ["HoneyWorks", "YOASOBI", "LiSA", "米津玄師", "DECO*27", "初音ミク"];

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

  useEffect(() => {
    // 进入页面就加载默认列表
    if (results.length === 0 && !loading) {
      search("", searchMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(() => {
    search(query, searchMode);
  }, [query, searchMode, search]);

  const filteredResults = useMemo(() => {
    if (searchType === "all" || !query.trim()) return results;
    const q = query.trim().toLowerCase();
    return results.filter((s: BeatmapSet) => {
      if (searchType === "title") return s.title.toLowerCase().includes(q) || (s.title_unicode?.toLowerCase().includes(q) ?? false);
      if (searchType === "artist") return s.artist.toLowerCase().includes(q) || (s.artist_unicode?.toLowerCase().includes(q) ?? false);
      return true;
    });
  }, [results, searchType, query]);

  return (
    <div className="page-shell">
      <section className="animate-enter animate-enter-1">
        <div className="solid-card p-5 md:p-6">
          <h1 className="text-xl font-bold md:text-2xl" style={{ color: "var(--text-primary)" }}>
            搜索谱面
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            输入歌曲名、艺人名或关键词
          </p>

          <div className="mt-4 flex items-center gap-2">
            <div
              className="flex flex-1 items-center gap-2 rounded-full px-3 py-2.5"
              style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <SearchIcon size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="歌曲 / 艺人 / 关键词…"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)", border: "none", padding: 0 }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="清空"
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <GlassButton onClick={handleSubmit} accent>
              搜索
            </GlassButton>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {MODE_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => {
                  search(query, tab.key);
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95"
                style={{
                  border: "1px solid",
                  borderColor: searchMode === tab.key ? "var(--accent)" : "var(--border)",
                  color: searchMode === tab.key ? "var(--accent)" : "var(--text-primary)",
                  background: searchMode === tab.key ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Filter size={14} style={{ color: "var(--text-secondary)" }} />
            {SEARCH_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setSearchType(t.key)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-transform active:scale-95"
                style={{
                  border: "1px solid",
                  borderColor: searchType === t.key ? "var(--accent)" : "var(--border)",
                  color: searchType === t.key ? "var(--accent)" : "var(--text-primary)",
                  background: searchType === t.key ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
            <span className="mx-1 text-xs" style={{ color: "var(--border)" }}>|</span>
            {(["all", "osu", "sayobot", "kitsu", "chimu"] as const).map((src) => (
              <button
                key={src}
                onClick={() => updateSetting("searchSource", src)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-transform active:scale-95"
                style={{
                  border: "1px solid",
                  borderColor: settings.searchSource === src ? "var(--accent)" : "var(--border)",
                  color: settings.searchSource === src ? "var(--accent)" : "var(--text-primary)",
                  background: settings.searchSource === src ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {src === "all" ? "全部竞速" : src === "osu" ? "osu.direct" : src === "sayobot" ? "Sayobot" : src === "kitsu" ? "Kitsu" : "Chimu"}
              </button>
            ))}
            <span className="mx-1 text-xs" style={{ color: "var(--border)" }}>|</span>
            <button
              onClick={() => updateSetting("storyboardOnly", !settings.storyboardOnly)}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-transform active:scale-95"
              style={{
                border: "1px solid",
                borderColor: settings.storyboardOnly ? "var(--accent)" : "var(--border)",
                color: settings.storyboardOnly ? "var(--accent)" : "var(--text-primary)",
                background: settings.storyboardOnly ? "var(--accent-soft)" : "transparent",
                cursor: "pointer",
              }}
            >
              Storyboard
            </button>
            <button
              onClick={() => updateSetting("videoOnly", !settings.videoOnly)}
              className="rounded-full px-2.5 py-1 text-xs font-medium transition-transform active:scale-95"
              style={{
                border: "1px solid",
                borderColor: settings.videoOnly ? "var(--accent)" : "var(--border)",
                color: settings.videoOnly ? "var(--accent)" : "var(--text-primary)",
                background: settings.videoOnly ? "var(--accent-soft)" : "transparent",
                cursor: "pointer",
              }}
            >
              视频
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  search(q, searchMode);
                }}
                className="rounded-full px-3 py-1 text-xs transition-transform active:scale-95"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="solid-card mt-4 p-4 text-sm" style={{ color: "#ff453a", background: "rgba(255,69,58,0.08)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-16">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              animation: "spin-slow 0.8s linear infinite",
            }}
          />
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="solid-card mt-4 p-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            没有找到结果，试试别的关键词
          </p>
        </div>
      ) : (
        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredResults.map((set, i) => (
            <BeatmapCard key={set.id} set={set} index={i} />
          ))}
        </section>
      )}
    </div>
  );
}
