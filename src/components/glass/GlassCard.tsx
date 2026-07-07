import React from "react";
import { cn } from "@/lib/utils";

/** 液态玻璃卡片容器 */
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  style,
  onClick,
}) => {
  return (
    <div
      className={cn("solid-card", className)}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
