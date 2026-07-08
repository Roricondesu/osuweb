import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

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
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="page-shell flex flex-col items-center justify-center py-24 text-center">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            出错了
          </h2>
          <p className="mt-2 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
            {this.state.error?.message || "页面渲染失败，请刷新重试。"}
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
