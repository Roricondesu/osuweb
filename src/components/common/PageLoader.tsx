import React from "react";
import { OsuLogoIcon } from "./OsuLogoIcon";

/** 页面懒加载时的居中占位 */
export const PageLoader: React.FC = () => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <OsuLogoIcon
      size={56}
      color="var(--accent)"
      className="loading-entrance"
    />
  </div>
);
