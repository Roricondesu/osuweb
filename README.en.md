<div align="center">

<p>
  <img src="public/favicon.svg" width="120" height="120" alt="osu!web logo" />
</p>

# osu!web

**Play osu! beatmaps right in your browser · A pure frontend osu! client**

`Standard` · `Taiko` · `Catch` · `Mania` · `Storyboard` · `Lyrics` · `Auto` · `Replay`

<p>
  <a href="./README.md">简体中文</a> · <strong>English</strong>
</p>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-osu.yuiro.top-ff9ecf?style=for-the-badge)](https://osu.yuiro.top)
[![License](https://img.shields.io/badge/License-MIT-22b14c?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff9ecf?style=for-the-badge)](./CONTRIBUTING.md)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-FF9ECF?style=for-the-badge)](https://github.com/pmndrs/zustand)

</div>

---

## Introduction

osu!web is a **purely frontend** osu! client — no installation, no backend. Open the browser and start playing osu! beatmaps. The project implements a complete game engine with native Canvas 2D, supports all four osu! game modes, and integrates beatmap search, download, Storyboard, lyrics, and replay features.

> This is a non-commercial open-source project for learning and communication only. It is not affiliated with osu! official. All beatmaps are copyrighted by their respective authors.

## Features

| Module | Description |
| --- | --- |
| 🎮 **Multi-mode gameplay** | osu!standard / taiko / catch / mania, with follow points, hit feedback, big notes, falling-key layout |
| 🔍 **Beatmap search** | Multi-source search via osu.direct, Sayobot, Kitsu, Chimu; filter by keyword / song / artist |
| 💾 **Local download manager** | IndexedDB persistence, background downloads, collapsible list, play locally; supports local `.osz` import |
| 🎬 **Storyboard support** | Parses `.osb` and `Events` sections, supports Sprite / Animation and F / M / S / R / C / P commands |
| 🎵 **Lyrics system** | LRCLIB open lyrics API, in-game bottom lyrics display (fade / slide effects) |
| 🎥 **Video background** | Supports beatmap-bundled video backgrounds |
| 🔁 **Replay system** | Review input replays right after game ends; supports local save & management |
| 🤖 **Auto demo** | Auto for all modes; Standard cursor spring physics + trail feedback |
| ⌨️ **Mod system** | Easy / No Fail / Half Time / Hard Rock / Sudden Death / Double Time / Hidden / Flashlight / Relax / Autopilot |
| 🎨 **Skin system** | Beatmap-bundled skins, custom skin import, custom combo colors & circle scaling |
| 🔊 **Hit sounds** | Beatmap / custom hit sound samples, adjustable volume & default sample set |
| 📱 **Fullscreen** | Browser fullscreen toggle, supports desktop & mobile, optional forced landscape |
| 📊 **FPS display** | Real-time FPS counter at bottom-right |
| 🌗 **Theme switch** | Light / dark theme + 6 accent colors |

## Tech Stack

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
| Fonts | Code Pro / AlimamaFangYuanTi |

## Quick Start

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

## Project Structure

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

## Supported File Formats

| Format | Description |
| --- | --- |
| `.osz` | Beatmap archive (auto-extracted) |
| `.osk` | Skin archive |
| `.osu` | Beatmap file |
| `.osb` | Storyboard script |
| `.mp3` / `.ogg` | Audio |
| `.mp4` | Video background |
| `.png` / `.jpg` / `.jpeg` / `.webp` | Image assets |

## Settings Overview

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

## Routes

| Path | Page |
| --- | --- |
| `/` | Home (featured beatmaps) |
| `/search` | Search |
| `/set/:setId` | Beatmap detail |
| `/game/:setId/:mode/:diff` | Gameplay |
| `/downloads` | Downloads |
| `/settings` | Settings |

## Deployment

Pure static frontend — deploy `dist/` to any static hosting service:

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?logo=github&logoColor=white&style=for-the-badge)](https://pages.github.com)
[![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white&style=for-the-badge)](https://vercel.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white&style=for-the-badge)](https://netlify.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?logo=cloudflarepages&logoColor=white&style=for-the-badge)](https://pages.cloudflare.com)

## Contributing

Issues and Pull Requests are welcome! Please read the [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## Acknowledgements

- [osu!](https://osu.ppy.sh/) community & beatmap authors
- [Sayobot](https://osu.sayobot.cn/) search service
- [osu.direct](https://osu.direct/) search service
- [Kitsu](https://kitsu.moe/) beatmap mirror
- [Chimu](https://chimu.moe/) beatmap mirror
- [LRCLIB](https://lrclib.net/) open lyrics

## License

This project is licensed under the [MIT License](./LICENSE).

> Note: osu! beatmaps, music, skins and other content are copyrighted by their respective authors. This project does not store any such content — it only provides client-side playback.

<div align="center">
  <sub>Built with ♥ by osu!web contributors</sub>
</div>
