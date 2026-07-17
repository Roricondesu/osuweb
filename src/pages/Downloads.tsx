import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/store/useGameStore";
import { BeatmapCard, OsuLogoIcon } from "@/components/common";
import {
  HardDrive,
  Upload,
  Trash2,
  Music2,
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Type,
  Star,
} from "lucide-react";
import type { LoadedBeatmapSet } from "@/types";
import { useTranslation } from "@/i18n";

type SortBy = "newest" | "oldest" | "title" | "stars";

const SORT_OPTIONS: { key: SortBy; label: string; icon: React.ElementType }[] = [
  { key: "newest", label: "最新下载", icon: Calendar },
  { key: "oldest", label: "最早下载", icon: Calendar },
  { key: "title", label: "标题", icon: Type },
  { key: "stars", label: "星级", icon: Star },
];

const SortButton: React.FC<{
  sort: SortBy;
  onChange: (s: SortBy) => void;
  labelOf: (s: SortBy) => string;
}> = ({ sort, onChange, labelOf }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = SORT_OPTIONS.find((o) => o.key === sort)!;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hud-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 12px",
          borderRadius: "var(--radius-pill)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          border: "1px solid var(--glass-border)",
          background: "var(--glass-bg)",
          cursor: "pointer",
        }}
      >
        <ArrowUpDown size={13} />
        <span className="font-torus">{labelOf(active.key)}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            minWidth: 130,
            padding: 6,
            borderRadius: "var(--radius-md)",
            background: "var(--glass-bg)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {SORT_OPTIONS.map((o) => {
            const Icon = o.icon;
            const selected = sort === o.key;
            return (
              <button
                key={o.key}
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  color: selected ? "var(--accent)" : "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: selected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={13} />
                {labelOf(o.key)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DownloadCard: React.FC<{
  set: LoadedBeatmapSet;
  index: number;
  onDelete: () => void;
}> = React.memo(({ set, index, onDelete }) => {
  return (
    <BeatmapCard set={set} index={index} downloaded onDelete={onDelete} />
  );
});
DownloadCard.displayName = "DownloadCard";

export default function Downloads() {
  const downloaded = useGameStore((s) => s.downloaded);
  const downloadsReady = useGameStore((s) => s.downloadsReady);
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  const deleteDownload = useGameStore((s) => s.deleteDownload);
  const clearDownloads = useGameStore((s) => s.clearDownloads);
  const importBeatmapFile = useGameStore((s) => s.importBeatmapFile);
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const sortLabelOf = (s: SortBy): string => {
    if (s === "newest") return t("downloads.sortNewest");
    if (s === "oldest") return t("downloads.sortOldest");
    if (s === "title") return t("downloads.sortTitle");
    return t("downloads.sortStars");
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const items = useMemo(() => {
    const arr = Array.from(downloaded.values());
    switch (sortBy) {
      case "newest":
        return arr.sort((a, b) => b.downloadedAt - a.downloadedAt);
      case "oldest":
        return arr.sort((a, b) => a.downloadedAt - b.downloadedAt);
      case "title":
        return arr.sort((a, b) => a.title.localeCompare(b.title, "zh-Hans-CN"));
      case "stars": {
        const starsOf = (s: LoadedBeatmapSet) =>
          s.beatmaps.length ? Math.max(...s.beatmaps.map((b) => b.difficulty_rating || 0)) : 0;
        return arr.sort((a, b) => starsOf(b) - starsOf(a));
      }
      default:
        return arr;
    }
  }, [downloaded, sortBy]);

  const handleDelete = async (setId: number) => {
    await deleteDownload(setId);
  };

  const handleClear = async () => {
    if (confirm(t("downloads.clearConfirm"))) {
      await clearDownloads();
    }
  };

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportMsg(null);
      try {
        const loaded = await importBeatmapFile(file);
        if (loaded) {
          setImportMsg({ text: t("downloads.importSuccess", { title: loaded.title }), ok: true });
        } else {
          setImportMsg({ text: t("downloads.importFailFormat"), ok: false });
        }
      } catch {
        setImportMsg({ text: t("downloads.importFail"), ok: false });
      }
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setImportMsg(null), 3000);
    },
    [importBeatmapFile, t],
  );

  return (
    <div className="page-shell">
      {/* 页头 */}
      <div
        className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center"
        style={{ justifyContent: "space-between" }}
      >
        <div className="flex items-center gap-2.5">
          <HardDrive size={22} style={{ color: "var(--accent)" }} />
          <h1 className="font-torus text-xl sm:text-2xl" style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {t("downloads.title")}
          </h1>
          <span
            className="font-torus"
            style={{
              marginLeft: 4,
              padding: "2px 9px",
              borderRadius: "var(--radius-pill)",
              fontSize: 12,
              fontWeight: 700,
              background: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {items.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SortButton sort={sortBy} onChange={setSortBy} labelOf={sortLabelOf} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="hud-btn font-torus"
            style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
          >
            <Upload size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            {importing ? t("downloads.importing") : t("downloads.importBeatmap")}
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClear}
              className="hud-btn font-torus"
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "var(--error-soft)",
                color: "var(--error)",
              }}
            >
              <Trash2 size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              {t("downloads.clearAll")}
            </button>
          )}
        </div>
      </div>

      {!downloadsReady ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 0",
          }}
        >
          <OsuLogoIcon size={48} color="var(--accent)" className="loading-entrance" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center py-10 text-center sm:py-16"
          style={{
            color: "var(--text-secondary)",
            background: "var(--glass-bg)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <Music2 size={36} className="mb-3 opacity-50" />
          <div className="text-sm sm:text-base">{t("downloads.empty")}</div>
          <div className="mt-1.5 text-xs opacity-70">{t("downloads.emptyHint")}</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {items.map((set, idx) => (
            <DownloadCard
              key={set.setId}
              set={set}
              index={idx}
              onDelete={() => handleDelete(set.setId)}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
        <AlertCircle size={14} className="shrink-0" />
        <span>{t("downloads.storageHint")}</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".osz,.osk"
        style={{ display: "none" }}
        onChange={handleImportFile}
      />
      {importMsg && (
        <div
          className="font-torus fixed left-1/2 z-[100] -translate-x-1/2 px-4 py-2.5 text-sm font-semibold text-white"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
            background: importMsg.ok ? "var(--success)" : "var(--error)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {importMsg.text}
        </div>
      )}
    </div>
  );
}
