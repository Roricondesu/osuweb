import React, { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard } from "@/components/common";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Search as SearchIcon } from "lucide-react";
import { GlassButton } from "@/components/glass/GlassButton";
import type { GameMode } from "@/types";
import { MODE_LABEL } from "@/types";

const MODE_TABS: { key: GameMode | null; label: string }[] = [
  { key: null, label: "全部" },
  { key: "standard", label: "osu!" },
  { key: "taiko", label: "太鼓" },
  { key: "catch", label: "接水果" },
  { key: "mania", label: "下落式" },
];

export default function Home() {
  const navigate = useNavigate();
  const searchResults = useGameStore((s) => s.searchResults);
  const loading = useGameStore((s) => s.searchLoading);
  const error = useGameStore((s) => s.searchError);
  const searchMode = useGameStore((s) => s.searchMode);
  const loadFeatured = useGameStore((s) => s.loadFeatured);

  useEffect(() => {
    if (searchResults.length === 0 && !loading) {
      loadFeatured(null);
    }
  }, []);

  return (
    <div className="page-shell">
      <section className="animate-enter animate-enter-1">
        <div className="solid-card p-5 md:p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} style={{ color: "var(--accent)" }} />
            <h1 className="text-xl font-bold md:text-2xl" style={{ color: "var(--text-primary)" }}>
              热门谱面
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            从 osu.direct 镜像获取最新上架的谱面，下载后即可游玩
          </p>

          {/* 模式过滤 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {MODE_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => loadFeatured(tab.key)}
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

          <div className="mt-4 flex justify-end">
            <GlassButton onClick={() => navigate("/search")} scheme="dark">
              <SearchIcon size={14} /> 搜索谱面
            </GlassButton>
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
      ) : (
        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {searchResults.map((set, i) => (
            <BeatmapCard key={set.id} set={set} index={i} />
          ))}
        </section>
      )}
    </div>
  );
}
