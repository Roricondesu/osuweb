import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Background } from "@/components/layout/Background";
import { useGameStore } from "@/store/useGameStore";
import { PageLoader, ErrorBoundary } from "@/components/common";

const Home = lazy(() => import("@/pages/Home"));
const Search = lazy(() => import("@/pages/Search"));
const BeatmapSetDetail = lazy(() => import("@/pages/BeatmapSetDetail"));
const Game = lazy(() => import("@/pages/Game"));
const Settings = lazy(() => import("@/pages/Settings"));
const Downloads = lazy(() => import("@/pages/Downloads"));

export default function App() {
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  return (
    <Router>
      <Background />
      <TopNav />
      <Suspense fallback={<PageLoader />}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/set/:setId" element={<BeatmapSetDetail />} />
            <Route path="/game/:setId/:mode/:diff" element={<Game />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </Router>
  );
}
