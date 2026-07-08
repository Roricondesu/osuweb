import { useEffect, useState } from "react";

/** 检测当前是否横屏；force 为 true 时强制返回横屏 */
export const useOrientation = (force = false) => {
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== "undefined" ? window.innerWidth > window.innerHeight : true,
  );

  useEffect(() => {
    if (force) {
      setIsLandscape(true);
      return;
    }
    const handler = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, [force]);

  return force || isLandscape;
};
