import React from "react";

interface NoteTextureProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** 音符贴图：用作谱面封面缺失/裂图时的占位图 */
export const NoteTexture: React.FC<NoteTextureProps> = ({
  size = 64,
  className,
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* 外圈 */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.35"
      />
      {/* 内圆底 */}
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="currentColor"
        opacity="0.12"
      />
      {/* 音符 */}
      <path
        d="M26 42V24.5L42 20V37.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />
      <circle
        cx="24"
        cy="42"
        r="4"
        fill="currentColor"
        opacity="0.75"
      />
      <circle
        cx="40"
        cy="37.5"
        r="4"
        fill="currentColor"
        opacity="0.75"
      />
      {/* 高光 */}
      <circle
        cx="26"
        cy="24"
        r="4"
        fill="currentColor"
        opacity="0.18"
      />
    </svg>
  );
};
