import React, { useState } from "react";
import { NoteTexture } from "./NoteTexture";

interface BeatmapCoverProps {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  placeholderSize?: number;
  loading?: boolean;
  loadingIndicator?: React.ReactNode;
}

/** 谱面封面：加载失败或缺失时显示音符贴图 */
export const BeatmapCover: React.FC<BeatmapCoverProps> = ({
  src,
  alt,
  className,
  style,
  imgStyle,
  placeholderSize = 64,
  loading,
  loadingIndicator,
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
          <NoteTexture size={placeholderSize} />
        )
      ) : (
        <img
          src={src}
          alt={alt || ""}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", ...imgStyle }}
        />
      )}
    </div>
  );
};
