import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { Background } from "@/components/layout/Background";
import { useGameStore } from "@/store/useGameStore";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import BeatmapSetDetail from "@/pages/BeatmapSetDetail";
import Game from "@/pages/Game";
import Settings from "@/pages/Settings";
import Downloads from "@/pages/Downloads";

export default function App() {
  const loadDownloads = useGameStore((s) => s.loadDownloads);
  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  return (
    <Router>
      <Background />
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/set/:setId" element={<BeatmapSetDetail />} />
        <Route path="/game/:setId/:mode/:diff" element={<Game />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
