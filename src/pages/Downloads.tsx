import React, { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { GlassButton } from "@/components/glass/GlassButton";
import { ModeBadge } from "@/components/common";
import { Trash2, Play, Music2, HardDrive, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GameMode, Beatmap, LoadedBeatmapSet } from "@/types";
import { MODE_FROM_ID } from "@/types";

const MODE_FROM_NUM: Record<number, GameMode> = MODE_FROM_ID;

export default function Downloads() {
  const navigate = useNavigate();
  const downloaded = useGameStore((s) => s.downloaded);
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  const deleteDownload = useGameStore((s) => s.deleteDownload);
  const clearDownloads = useGameStore((s) => s.clearDownloads);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDownloads().finally(() => setLoading(false));
  }, [loadDownloads]);

  const items = Array.from(downloaded.values());

  const handlePlay = (set: LoadedBeatmapSet, beatmap: Beatmap) => {
    const mode = MODE_FROM_NUM[beatmap.mode] || "standard";
    navigate(`/game/${set.setId}/${mode}/${beatmap.id}`);
  };

  const handleDelete = async (setId: number) => {
    await deleteDownload(setId);
  };

  const handleClear = async () => {
    if (confirm("确定清空所有本地下载吗？此操作不可恢复。")) {
      await clearDownloads();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: "calc(56px + env(safe-area-inset-top, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HardDrive size={22} style={{ color: "var(--accent)" }} />
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              下载管理
            </h1>
          </div>
          {items.length > 0 && (
            <GlassButton
              onClick={handleClear}
              style={{ background: "rgba(255,55,95,0.15)", color: "#ff375f" }}
            >
              <Trash2 size={14} style={{ marginRight: 6 }} />
              清空全部
            </GlassButton>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>
            加载中…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 80,
              color: "var(--text-secondary)",
              background: "var(--glass)",
              borderRadius: 20,
              border: "1px solid var(--border)",
            }}
          >
            <Music2 size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: 15 }}>暂无本地下载</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
              去搜索页下载谱面吧
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((set) => (
              <div
                key={set.setId}
                style={{
                  background: "var(--glass)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 14 }}>
                  <img
                    src={set.cover}
                    alt="cover"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      objectFit: "cover",
                      background: "var(--glass-hover)",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {set.title}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {set.artist}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 6,
                      }}
                    >
                      {set.beatmaps.length} 个难度 · 下载于{" "}
                      {new Date(set.downloadedAt).toLocaleString()}
                    </div>
                  </div>
                  <GlassButton
                    onClick={() => handleDelete(set.setId)}
                    style={{
                      alignSelf: "flex-start",
                      background: "rgba(255,55,95,0.12)",
                      color: "#ff375f",
                    }}
                  >
                    <Trash2 size={16} />
                  </GlassButton>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {set.beatmaps.map((b) => {
                    const mode = MODE_FROM_NUM[b.mode] || "standard";
                    return (
                      <div
                        key={b.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 12px",
                          background: "var(--glass-hover)",
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ModeBadge mode={mode} />
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-primary)",
                              fontWeight: 600,
                            }}
                          >
                            {b.version}
                          </span>
                        </div>
                        <GlassButton
                          onClick={() => handlePlay(set, b)}
                        >
                          <Play size={14} style={{ marginRight: 5 }} />
                          开始
                        </GlassButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-tertiary)",
          }}
        >
          <AlertCircle size={14} />
          <span>下载数据保存在浏览器 IndexedDB 中，清理浏览器数据会丢失。</span>
        </div>
      </div>
    </div>
  );
}
