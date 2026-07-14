import React from "react";

interface StatusBadgeProps {
  status?: string;
  size?: "sm" | "md";
}

/** osu!web 状态徽章配色（药丸形，彩色底 + 深色文字） */
const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  ranked: { label: "RANKED", bg: "#b3ff66", text: "#1a231f" },
  approved: { label: "APPROVED", bg: "#b3ff66", text: "#1a231f" },
  qualified: { label: "QUALIFIED", bg: "#66e0ff", text: "#0d2433" },
  loved: { label: "LOVED", bg: "#ff66aa", text: "#2a0f1a" },
  pending: { label: "PENDING", bg: "#ffcc44", text: "#2a2008" },
  wip: { label: "WIP", bg: "#aaaacc", text: "#15151f" },
  graveyard: { label: "GRAVEYARD", bg: "#888899", text: "#15151a" },
  downloaded: { label: "DOWNLOADED", bg: "#66cc44", text: "#fff" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  if (!status) return null;
  const meta = STATUS_META[status.toLowerCase()] || STATUS_META.pending;
  const fontSize = size === "sm" ? 10 : 12;
  const padding = size === "sm" ? "2px 8px" : "3px 10px";

  return (
    <span
      className="font-torus"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize,
        fontWeight: 600,
        padding,
        borderRadius: 999,
        background: meta.bg,
        color: meta.text,
        letterSpacing: "0.04em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
};
