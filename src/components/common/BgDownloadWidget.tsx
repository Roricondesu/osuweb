import React, { useState } from "react";
import { useGameStore, type BgDownloadTask } from "@/store/useGameStore";
import { Download, ChevronDown, ChevronUp, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const statusLabel = (t: BgDownloadTask): string => {
  switch (t.status) {
    case "downloading": return "下载中";
    case "extracting": return "解压中";
    case "done": return "已完成";
    case "error": return "失败";
  }
};

export const BgDownloadWidget: React.FC = () => {
  const bgDownloads = useGameStore((s) => s.bgDownloads);
  const cancelBgDownload = useGameStore((s) => s.cancelBgDownload);
  const [expanded, setExpanded] = useState(false);

  // 只在有任务时显示
  if (bgDownloads.length === 0) return null;

  const activeCount = bgDownloads.filter(
    (t) => t.status === "downloading" || t.status === "extracting",
  ).length;
  const errorCount = bgDownloads.filter((t) => t.status === "error").length;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        right: 12,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      {/* 折叠时的汇总条 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: "var(--radius-pill)",
          background: "rgba(21,21,26,0.9)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {activeCount > 0 ? (
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
        ) : errorCount > 0 ? (
          <AlertCircle size={14} style={{ color: "var(--error)" }} />
        ) : (
          <CheckCircle2 size={14} style={{ color: "var(--success, #66cc44)" }} />
        )}
        <span className="font-torus">
          {activeCount > 0
            ? `${activeCount} 个下载中`
            : errorCount > 0
              ? `${errorCount} 个失败`
              : "下载完成"}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* 展开时的任务列表 */}
      {expanded && (
        <div
          style={{
            width: 300,
            maxWidth: "calc(100vw - 24px)",
            padding: 8,
            borderRadius: "var(--radius-md)",
            background: "rgba(21,21,26,0.92)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {bgDownloads.map((t) => (
            <div
              key={t.setId}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Download size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span
                  className="font-torus"
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.title}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      t.status === "error" ? "var(--error)" :
                      t.status === "done" ? "var(--success, #66cc44)" :
                      "var(--text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {statusLabel(t)}
                </span>
                <button
                  onClick={() => cancelBgDownload(t.setId)}
                  aria-label="移除"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
              {t.status === "error" ? (
                <p style={{ fontSize: 10, color: "var(--error)", margin: 0 }}>
                  {t.error || "未知错误"}
                </p>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    className="hud-bar-track"
                    style={{ height: 4, flex: 1, background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="hud-bar-fill"
                      style={{
                        width: `${t.progress * 100}%`,
                        background:
                          t.status === "done"
                            ? "var(--success, #66cc44)"
                            : "linear-gradient(90deg, var(--accent), #ff9100)",
                      }}
                    />
                  </div>
                  <span
                    className="hud-num"
                    style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", minWidth: 30, textAlign: "right" }}
                  >
                    {Math.round(t.progress * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
