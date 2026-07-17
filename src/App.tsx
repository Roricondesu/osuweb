import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, Suspense, lazy, useState, useCallback, useRef } from "react";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import { TopNav } from "@/components/layout/TopNav";
import { Background } from "@/components/layout/Background";
import { useGameStore } from "@/store/useGameStore";
import { useFullscreen } from "@/hooks/useFullscreen";
import { PageLoader, ErrorBoundary, BgDownloadWidget } from "@/components/common";
import { SplashScreen } from "@/components/SplashScreen";
import { loadFonts } from "@/utils/fontLoader";

const Home = lazy(() => import("@/pages/Home"));
const Search = lazy(() => import("@/pages/Search"));
const BeatmapSetDetail = lazy(() => import("@/pages/BeatmapSetDetail"));
const Game = lazy(() => import("@/pages/Game"));
const Settings = lazy(() => import("@/pages/Settings"));
const Downloads = lazy(() => import("@/pages/Downloads"));

function AppRoutes() {
  const location = useLocation();
  return (
    <TransitionGroup component={null}>
      <CSSTransition
        key={location.pathname}
        timeout={280}
        classNames="page-switch"
        unmountOnExit
      >
        <div className="page-transition-wrap">
          <Suspense fallback={<PageLoader />}>
            <ErrorBoundary>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/set/:setId" element={<BeatmapSetDetail />} />
                <Route path="/game/:setId/:mode/:diff" element={<Game />} />
                <Route path="/downloads" element={<Downloads />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        </div>
      </CSSTransition>
    </TransitionGroup>
  );
}

export default function App() {
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  const pageScale = useGameStore((s) => s.settings.pageScale);
  const language = useGameStore((s) => s.settings.language);

  // 启动画面状态
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  const [splashExited, setSplashExited] = useState(false);
  const fontProgressRef = useRef(0);
  const downloadsDoneRef = useRef(false);

  // 加载资源：字体 + 下载
  useEffect(() => {
    const startTime = Date.now();
    const MIN_DISPLAY_MS = 1200; // 最小显示时间，避免秒加载时画面一闪而过

    // 字体加载（50% 权重）
    loadFonts((r) => {
      fontProgressRef.current = r;
      updateProgress();
    }).catch(() => {
      // 字体加载彻底失败也算完成，避免 splash 卡住
      fontProgressRef.current = 1;
      updateProgress();
    });

    // 下载列表加载（50% 权重）
    loadDownloads()
      .then(() => {
        downloadsDoneRef.current = true;
        updateProgress();
      })
      .catch(() => {
        downloadsDoneRef.current = true;
        updateProgress();
      });

    function updateProgress() {
      const fp = fontProgressRef.current;
      const dp = downloadsDoneRef.current ? 1 : 0;
      const combined = fp * 0.5 + dp * 0.5;
      setSplashProgress(Math.min(0.95, combined));
      if (fp >= 1 && downloadsDoneRef.current) {
        finishSplash();
      }
    }

    function finishSplash() {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setSplashProgress(1);
      setTimeout(() => setSplashDone(true), remaining + 200);
    }

    // 安全超时：最多等 8 秒就进入
    const timeout = setTimeout(() => {
      setSplashProgress(1);
      setSplashDone(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loadDownloads]);

  const handleSplashExited = useCallback(() => {
    setSplashExited(true);
  }, []);

  // 全局页面缩放：实时生效
  useEffect(() => {
    const html = document.documentElement;
    const scale = Number.isFinite(pageScale) && pageScale > 0 ? pageScale : 1;
    html.style.zoom = String(scale);
    return () => {
      html.style.zoom = "";
    };
  }, [pageScale]);

  // 同步 <html lang>，便于无障碍与浏览器翻译识别
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useFullscreen();

  return (
    <Router>
      {!splashExited && (
        <SplashScreen
          progress={splashProgress}
          done={splashDone}
          onExited={handleSplashExited}
        />
      )}
      <Background />
      <TopNav />
      <BgDownloadWidget />
      <AppRoutes />
    </Router>
  );
}
