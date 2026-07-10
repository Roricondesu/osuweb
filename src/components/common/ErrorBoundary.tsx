import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const RELOAD_FLAG = "__chunk_reload_v2__";

/** 判断是否为动态导入（chunk 加载）失败：新版本部署后旧 chunk 不存在 */
const isChunkLoadError = (err: Error): boolean => {
  const msg = err.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
};

/**
 * 强制绕过 CDN 缓存刷新 index.html。
 * 普通 reload() 仍可能命中 CDN 缓存返回旧 index.html，
 * 改用带时间戳的查询参数使 URL 唯一，强制回源拉取最新版本。
 */
const hardRefresh = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.set("__r", String(Date.now()));
  window.location.replace(url.toString());
};

/** 错误边界：捕获子组件渲染异常，避免整页白屏 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // chunk 加载失败：整个会话最多自动刷新一次，避免反复刷新导致崩溃
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      hardRefresh();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunkErr = this.state.error ? isChunkLoadError(this.state.error) : false;
      const alreadyRetried = !!sessionStorage.getItem(RELOAD_FLAG);
      return (
        <div className="page-shell flex flex-col items-center justify-center py-24 text-center">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {isChunkErr ? "站点已更新" : "出错了"}
          </h2>
          <p className="mt-2 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
            {isChunkErr
              ? alreadyRetried
                ? "检测到新版本资源，请点击下方按钮强制刷新以加载最新内容。"
                : "正在加载最新版本……"
              : this.state.error?.message || "页面渲染失败，请刷新重试。"}
          </p>
          <button
            onClick={hardRefresh}
            className="mt-4 rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            强制刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
