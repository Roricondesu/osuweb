import React from "react";
import type { BeatmapSet } from "@/types";
import { DifficultyBadge, ModeBadge } from "@/components/common";
import { Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeatmapCardProps {
  set: BeatmapSet;
  index?: number;
}

export const BeatmapCard: React.FC<BeatmapCardProps> = ({ set, index = 0 }) => {
  const navigate = useNavigate();
  const cover = set.covers?.["cover@2x"] || set.covers?.cover || "";
  const minStars = set.beatmaps.length
    ? Math.min(...set.beatmaps.map((b) => b.difficulty_rating))
    : 0;
  const maxStars = set.beatmaps.length
    ? Math.max(...set.beatmaps.map((b) => b.difficulty_rating))
    : 0;
  const modes = new Set(
    set.beatmaps.map((b) => b.mode).filter((m) => m >= 0 && m <= 3),
  );
  const modeIdx = (modes.values().next().value as number) || 0;
  const modeNames = ["standard", "taiko", "catch", "mania"] as const;
  const primaryMode = modeNames[modeIdx];

  return (
    <div
      onClick={() => navigate(`/set/${set.id}`)}
      className="solid-card glow-card group"
      style={{
        cursor: "pointer",
        overflow: "hidden",
        animation: "stagger-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        animationDelay: `${0.04 + (index % 12) * 0.03}s`,
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden" }}>
        {cover ? (
          <img
            src={cover}
            alt={set.title}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface-elevated)",
              color: "var(--text-secondary)",
            }}
          >
            <Music2 size={32} />
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <ModeBadge mode={primaryMode} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            gap: 4,
          }}
        >
          <DifficultyBadge stars={minStars} />
          {maxStars !== minStars && (
            <>
              <span
                style={{
                  fontSize: 10,
                  color: "#fff",
                  fontWeight: 600,
                  alignSelf: "center",
                }}
              >
                ~
              </span>
              <DifficultyBadge stars={maxStars} />
            </>
          )}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}
        >
          {set.title_unicode || set.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {set.artist_unicode || set.artist} · {set.creator}
        </div>
      </div>
    </div>
  );
};
