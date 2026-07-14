import React from "react";

interface SettingIconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** 外观 / 主题 */
export const AppearanceIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.6" />
    <path d="M12 2a10 10 0 000 20 10 10 0 000-20" fill={color} fillOpacity="0.12" />
  </svg>
);

/** 音频 / 音量 */
export const AudioIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <path
      d="M5 9v6h3l5 4V5L8 9H5z"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M16 9a4 4 0 010 6"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M19 7a7 7 0 010 10"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/** 判定偏移 / 时钟 */
export const TimingIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
    <path d="M12 7v5l3.5 3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M17.5 5l1.2-1.8M6.5 5L5.3 3.2M12 2V0"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/** 游戏 / 手柄 */
export const GameIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="4"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
    />
    <path d="M6 10h2v2H6zm0 3h2v2H6zm3-3h2v2H9zm0 3h2v2H9z" fill={color} />
    <circle cx="16" cy="11" r="1.2" fill={color} />
    <circle cx="18.5" cy="13.5" r="1.2" fill={color} />
  </svg>
);

/** 键位 / 键盘 */
export const KeysIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
    />
    <path
      d="M5 8h2v2H5zm4 0h2v2H9zm4 0h2v2h-2zm4 0h2v2h-2zM5 12h2v2H5zm4 0h2v2H9zm4 0h2v2h-2zm4 0h2v2h-2zM8 16h8v2H8z"
      fill={color}
    />
  </svg>
);

/** Mod / 闪电 */
export const ModIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <path
      d="M13 2L4.09 12.11a.5.5 0 00.38.83H11l-2 9 8.91-10.11a.5.5 0 00-.38-.83H13l2-9z"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

/** 皮肤 / 刷子 */
export const SkinIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <path
      d="M18 3l3 3-9 9-2 4-4 1 1-4 4-2 9-9-2-2z"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M15 6l3 3"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

/** 搜索 */
export const SearchSettingIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.5" />
    <path d="M16 16l4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** 网络 / 连接检测 */
export const NetworkIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <circle cx="12" cy="18" r="1.5" fill={color} />
    <path
      d="M7 14a6 6 0 0110 0"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M4 10a10 10 0 0116 0"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/** 下载 */
export const DownloadIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <path d="M12 3v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path
      d="M7 13l5 5 5-5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 20h16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/** 画面 / 显示 */
export const DisplayIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="12"
      rx="2"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
    />
    <path d="M9 20h6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    <path d="M12 16v4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** 歌词 / 音乐 */
export const LyricsIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <path
      d="M9 18V6.66a1 1 0 01.76-.97l6-1.5a1 1 0 011.24.97V16"
      fill={color}
      fillOpacity="0.12"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="18" r="2" stroke={color} strokeWidth="1.4" />
    <circle cx="15" cy="16" r="2" stroke={color} strokeWidth="1.4" />
  </svg>
);

/** 高级 / 重置 */
export const AdvancedIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
    <path
      d="M17.5 8a7 7 0 00-11 0"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M6.5 16l-1.5 1.5M17.5 16l1.5 1.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

/** 关于 / 信息 */
export const AboutIcon: React.FC<SettingIconProps> = ({
  size = 18,
  color = "currentColor",
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
    <path d="M12 16v-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1.3" fill={color} />
  </svg>
);
