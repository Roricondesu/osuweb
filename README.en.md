<div align="center">

<p>
  <img src="public/favicon.svg" width="120" height="120" alt="osu!web logo" />
</p>

# osu!web

**Play osu! beatmaps right in your browser**

`Standard` · `Taiko` · `Catch` · `Mania` · `Storyboard` · `Lyrics` · `Auto` · `Replay`

<p>
  <a href="./README.md">简体中文</a> · <strong>English</strong>
</p>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-osu.yuiro.top-ff9ecf?style=for-the-badge)](https://osu.yuiro.top)
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-EF9421?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff9ecf?style=for-the-badge)](./CONTRIBUTING.md)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-FF9ECF?style=for-the-badge)](https://github.com/pmndrs/zustand)

</div>

---

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg> Introduction

osu!web is a browser-based osu! client — no installation, no backend. Open the browser and start playing osu! beatmaps. The project implements a complete game engine with native Canvas 2D, supports all four osu! game modes, and integrates beatmap search, download, Storyboard, lyrics, and replay features.

> This is a non-commercial open-source project for learning and communication only. It is not affiliated with osu! official. All beatmaps are copyrighted by their respective authors.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/></svg> Features

| Module | Description |
| --- | --- |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M7 12h4M9 10v4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg> **Multi-mode gameplay** | osu!standard / taiko / catch / mania, with follow points, hit feedback, big notes, falling-key layout |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg> **Beatmap search** | Multi-source search via osu.direct, Sayobot, Kitsu, Chimu; filter by keyword / song / artist |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg> **Local download manager** | IndexedDB persistence, background downloads, collapsible list, play locally; supports local `.osz` import |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/></svg> **Storyboard support** | Parses `.osb` and `Events` sections, supports Sprite / Animation and F / M / S / R / C / P commands |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg> **Lyrics system** | LRCLIB open lyrics API, in-game bottom lyrics display (fade / slide effects) |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg> **Video background** | Supports beatmap-bundled video backgrounds |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> **Replay system** | Review input replays right after game ends; supports local save & management |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/></svg> **Auto demo** | Auto for all modes; Standard cursor spring physics + trail feedback |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg> **Mod system** | Easy / No Fail / Half Time / Hard Rock / Sudden Death / Double Time / Hidden / Flashlight / Relax / Autopilot |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14.5" cy="6.5" r="1"/></svg> **Skin system** | Beatmap-bundled skins, custom skin import, custom combo colors & circle scaling |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg> **Hit sounds** | Beatmap / custom hit sound samples, adjustable volume & default sample set |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg> **Fullscreen** | Browser fullscreen toggle, supports desktop & mobile, optional forced landscape |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16V11M12 16V7M17 16v-3"/></svg> **FPS display** | Real-time FPS counter at bottom-right |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg> **Theme switch** | Light / dark theme + 6 accent colors |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg> Tech Stack

| Category | Choice |
| --- | --- |
| Framework | React 18 + TypeScript 5.8 |
| Build | Vite 6 |
| Routing | React Router DOM 7 |
| State | Zustand 5 (with persist) |
| Styling | Tailwind CSS 3 + custom glassmorphism components |
| Rendering | Native Canvas 2D |
| Audio | HTMLAudioElement |
| Unzip | JSZip |
| Storage | IndexedDB |
| Icons | Lucide React |
| Fonts | AlimamaFangYuanTi (variable font) |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg> Quick Start

### Prerequisites

- Node.js >= 18 (20+ recommended)
- pnpm (recommended) or npm

### Install & Run

```bash
# Install dependencies
pnpm install

# Dev mode, default http://localhost:5173/
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Type check only
pnpm check

# Lint
pnpm lint
```

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M20 10a4 4 0 0 0-4-4 4 4 0 0 0-8 0 4 4 0 0 0-4 4v2a2 2 0 0 0 2 2h2"/><path d="M6 18h4"/><path d="M14 10h4"/><path d="M12 14h.01"/><path d="M17 16h-.01"/><path d="M14 21h-4"/><path d="M10 21v-6h6"/><path d="M16 21v-6"/></svg> Project Structure

```text
osu-web/
├── public/                 # Static assets (fonts, favicon, _headers, _redirects)
├── src/
│   ├── api/                # Beatmap search / download API wrappers (multi-source)
│   ├── components/         # React components
│   │   ├── common/         # BeatmapCard, ModeBadge, StoryboardBadge, etc.
│   │   ├── game/           # Mod select overlay
│   │   ├── glass/          # Glassmorphism button / card / switch / slider
│   │   └── layout/         # Background, top nav
│   ├── engine/             # Core game engine
│   │   ├── modes/          # Standard / Taiko / Catch / Mania
│   │   ├── renderer/       # Canvas 2D drawing utilities
│   │   ├── GameEngine.ts   # Engine base class
│   │   └── Judger.ts       # Judgement logic
│   ├── hooks/              # Custom hooks (fullscreen, orientation, theme)
│   ├── pages/              # Pages (Home / Search / BeatmapSetDetail / Game / Settings / Downloads)
│   ├── store/              # Zustand global state (gameStore / favoritesStore)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # .osu / .osb parsing, osz extraction, lyrics, IndexedDB, etc.
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M9 13h6"/><path d="M9 17h3"/></svg> Supported File Formats

| Format | Description |
| --- | --- |
| `.osz` | Beatmap archive (auto-extracted) |
| `.osk` | Skin archive |
| `.osu` | Beatmap file |
| `.osb` | Storyboard script |
| `.mp3` / `.ogg` | Audio |
| `.mp4` | Video background |
| `.png` / `.jpg` / `.jpeg` / `.webp` | Image assets |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg> Settings Overview

| Category | Options |
| --- | --- |
| **Appearance** | Theme, accent color, page scale |
| **Audio** | Master volume, global offset, playback rate, hit-sound volume, default sample set, enable beatmap hitsounds |
| **Game** | Auto mode, show cursor, approach multiplier, approach circles, combo numbers, hit effects, show FPS, HUD scale |
| **Keys** | Standard / Taiko / Catch / Mania (1K-10K) custom bindings |
| **Mod** | 10 mods free combination |
| **Skin** | Beatmap skin, custom skin import, combo colors, circle/slider border width, slider ball scale |
| **Display** | Storyboard toggle, video background, background dim, background blur, force landscape, fullscreen |
| **Search** | Search source, storyboard only, video only, download full package |
| **Lyrics** | Lyrics toggle, effect (none / fade / slide), font size |
| **Advanced** | Spectator mode, auto circle mode, cursor trail, cursor press, cursor size, auto speed |
| **About** | Project info, API health check, clear cache |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg> Routes

| Path | Page |
| --- | --- |
| `/` | Home (featured beatmaps) |
| `/search` | Search |
| `/set/:setId` | Beatmap detail |
| `/game/:setId/:mode/:diff` | Gameplay |
| `/downloads` | Downloads |
| `/settings` | Settings |

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg> Deployment

Deploy the `dist/` build to any static hosting service:

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?logo=github&logoColor=white&style=for-the-badge)](https://pages.github.com)
[![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white&style=for-the-badge)](https://vercel.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white&style=for-the-badge)](https://netlify.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?logo=cloudflarepages&logoColor=white&style=for-the-badge)](https://pages.cloudflare.com)

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Contributing

Issues and Pull Requests are welcome! Please read the [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff66aa" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg> Acknowledgements

- [osu!](https://osu.ppy.sh/) community & beatmap authors
- [Sayobot](https://osu.sayobot.cn/) search service
- [osu.direct](https://osu.direct/) search service
- [Kitsu](https://kitsu.moe/) beatmap mirror
- [Chimu](https://chimu.moe/) beatmap mirror
- [LRCLIB](https://lrclib.net/) open lyrics

## <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg> License

This project is licensed under [CC BY-NC 4.0](./LICENSE). Non-commercial use, modification, and distribution are allowed with attribution.

> Note: osu! beatmaps, music, skins and other content are copyrighted by their respective authors. This project does not store any such content — it only provides client-side playback.

<div align="center">
  <sub>Built with <svg width="11" height="11" viewBox="0 0 24 24" fill="#ff66aa" style="vertical-align:middle"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg> by osu!web contributors</sub>
</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=ff9ecf&height=120&section=footer" width="100%" alt="footer" />
</div>
