import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const RELOAD_FLAG = "__chunk_reload_done__";

/** 判断是否为动态导入（chunk 加载）失败：新版本部署后旧 chunk 不存在 */
const isChunkLoadError = (err: Error): boolean => {
  const msg = err.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
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
    // chunk 加载失败：自动刷新一次以拉取最新 index.html（用 sessionStorage 防无限重载）
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const isChunkErr = this.state.error ? isChunkLoadError(this.state.error) : false;
      return (
        <div className="page-shell flex flex-col items-center justify-center py-24 text-center">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {isChunkErr ? "版本已更新" : "出错了"}
          </h2>
          <p className="mt-2 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
            {isChunkErr
              ? "站点已发布新版本，刷新即可加载最新资源。"
              : this.state.error?.message || "页面渲染失败，请刷新重试。"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
