import React from "react";

/** 页面懒加载时的居中占位 */
export const PageLoader: React.FC = () => (
  <div className="page-shell flex items-center justify-center py-24">
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "3px solid var(--border)",
        borderTopColor: "var(--accent)",
        animation: "spin-slow 0.8s linear infinite",
      }}
    />
  </div>
);
