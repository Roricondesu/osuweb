import React, { useState } from "react";
import { OsuLogoIcon } from "./OsuLogoIcon";

interface BeatmapCoverProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  placeholderSize?: number;
  loading?: boolean;
  loadingIndicator?: React.ReactNode;
  lazy?: boolean;
}

/** 谱面封面：加载失败或缺失时显示官方 osu! logo */
export const BeatmapCover: React.FC<BeatmapCoverProps> = ({
  src,
  alt,
  className,
  style,
  imgStyle,
  placeholderSize = 64,
  loading,
  loadingIndicator,
  lazy = true,
}) => {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-elevated)",
        color: "var(--text-secondary)",
        overflow: "hidden",
        ...style,
      }}
    >
      {showPlaceholder ? (
        loading && loadingIndicator ? (
          loadingIndicator
        ) : (
          <OsuLogoIcon size={placeholderSize} color="currentColor" />
        )
      ) : (
        <img
          src={src}
          alt={alt || ""}
          loading={lazy ? "lazy" : undefined}
          decoding="async"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", ...imgStyle }}
        />
      )}
    </div>
  );
};
