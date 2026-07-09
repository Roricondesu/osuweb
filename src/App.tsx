import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Background } from "@/components/layout/Background";
import { useGameStore } from "@/store/useGameStore";
import { useFullscreen } from "@/hooks/useFullscreen";
import { PageLoader, ErrorBoundary } from "@/components/common";

const Home = lazy(() => import("@/pages/Home"));
const Search = lazy(() => import("@/pages/Search"));
const BeatmapSetDetail = lazy(() => import("@/pages/BeatmapSetDetail"));
const Game = lazy(() => import("@/pages/Game"));
const Settings = lazy(() => import("@/pages/Settings"));
const Downloads = lazy(() => import("@/pages/Downloads"));

function AppRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-transition">
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
  );
}

export default function App() {
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);
  useFullscreen();

  return (
    <Router>
      <Background />
      <TopNav />
      <AppRoutes />
    </Router>
  );
}
