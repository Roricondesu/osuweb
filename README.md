<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=ff9ecf&height=220&section=header&text=osu!web&fontSize=72&fontColor=ffffff&fontAlignY=38&desc=在浏览器里畅玩%20osu!%20谱面&descSize=18&descAlignY=58&animation=fadeIn" width="100%" alt="osu!web banner" />

<br/>

<p>
  <img src="public/favicon.svg" width="120" height="120" alt="osu!web logo" />
</p>

**纯前端 osu! 客户端**

`Standard` · `Taiko` · `Catch` · `Mania` · `Storyboard` · `歌词` · `Auto` · `回放`

<p>
  <strong>简体中文</strong> · <a href="./README.en.md">English</a>
</p>

[![在线体验](https://img.shields.io/badge/在线体验-osu.yuiro.top-ff9ecf?style=for-the-badge)](https://osu.yuiro.top)
[![License](https://img.shields.io/badge/License-MIT-22b14c?style=for-the-badge)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff9ecf?style=for-the-badge)](./CONTRIBUTING.md)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-FF9ECF?style=for-the-badge)](https://github.com/pmndrs/zustand)

</div>

---

## 项目简介

osu!web 是一个**纯前端**的 osu! 客户端，无需安装、无需后端，打开浏览器即可游玩 osu! 谱面。项目使用原生 Canvas 2D 实现完整的游戏引擎，支持 osu! 全部四种游戏模式，并集成谱面搜索、下载、Storyboard、歌词、回放等功能。

> 本项目为非盈利性开源项目，仅供学习与交流使用，与 osu! 官方无任何关联。所有谱面版权归原作者所有。

## 功能特性

| 模块 | 说明 |
| --- | --- |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M7 12h4M9 10v4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg> **多模式游玩** | osu!standard / taiko / catch / mania，含引导线、打击反馈、大音符、下落式按键 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg> **谱面获取** | 集成 osu.direct、Sayobot、Kitsu、Chimu 多源搜索，支持关键词 / 歌曲名 / 歌手名筛选 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg> **本地下载管理** | IndexedDB 持久化，后台下载、折叠展开、本地直接开玩，支持导入本地 `.osz` |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/></svg> **Storyboard 支持** | 解析 `.osb` 与 `Events` 段落，支持 Sprite / Animation 及 F / M / S / R / C / P 命令 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg> **歌词系统** | LRCLIB 开源歌词 API，游戏内底部显示当前歌词（淡入 / 滑动效果） |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg> **视频背景** | 支持谱面自带视频背景播放 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> **回放系统** | 游戏结束当场查看输入回放，支持本地保存与管理 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/></svg> **Auto 演示** | 全模式 Auto，Standard 光标弹簧物理 + 拖尾反馈 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg> **Mod 系统** | Easy / No Fail / Half Time / Hard Rock / Sudden Death / Double Time / Hidden / Flashlight / Relax / Autopilot |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2 2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14.5" cy="6.5" r="1"/></svg> **皮肤系统** | 支持谱面自带皮肤、自定义皮肤导入、自定义 combo 颜色与圆圈缩放 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg> **音效系统** | 谱面 / 自定义音效采样，可调音量与默认采样集 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg> **全屏模式** | 浏览器全屏切换，桌面端与移动端均支持，可强制横屏 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16V11M12 16V7M17 16v-3"/></svg> **FPS 显示** | 游戏内右下角实时显示帧率 |
| <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff66aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg> **主题切换** | 明 / 暗主题 + 6 种主题色 |

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript 5.8 |
| 构建 | Vite 6 |
| 路由 | React Router DOM 7 |
| 状态 | Zustand 5（含 persist 持久化） |
| 样式 | Tailwind CSS 3 + 自定义毛玻璃组件 |
| 渲染 | 原生 Canvas 2D |
| 音频 | HTMLAudioElement |
| 解压 | JSZip |
| 存储 | IndexedDB |
| 图标 | Lucide React |
| 字体 | Code Pro / AlimamaFangYuanTi |

## 快速开始

### 环境要求

- Node.js >= 18（推荐 20+）
- pnpm（推荐）或 npm

### 安装与运行

```bash
# 安装依赖
pnpm install

# 开发模式，默认 http://localhost:5173/
pnpm dev

# 构建生产版本
pnpm build

# 本地预览生产版本
pnpm preview

# 仅类型检查
pnpm check

# 代码检查
pnpm lint
```

## 项目结构

```text
osu-web/
├── public/                 # 静态资源（字体、favicon、_headers、_redirects）
├── src/
│   ├── api/                # 谱面搜索 / 下载 API 封装（多源）
│   ├── components/         # React 组件
│   │   ├── common/         # BeatmapCard、ModeBadge、StoryboardBadge 等
│   │   ├── game/           # Mod 选择覆盖层
│   │   ├── glass/          # 毛玻璃风格按钮 / 卡片 / 开关 / 滑块
│   │   └── layout/         # 背景、顶部导航
│   ├── engine/             # 游戏核心引擎
│   │   ├── modes/          # Standard / Taiko / Catch / Mania
│   │   ├── renderer/       # Canvas 2D 绘制工具
│   │   ├── GameEngine.ts   # 引擎基类
│   │   └── Judger.ts       # 判定逻辑
│   ├── hooks/              # 自定义 Hooks（全屏、方向、主题）
│   ├── pages/              # 页面（Home / Search / BeatmapSetDetail / Game / Settings / Downloads）
│   ├── store/              # Zustand 全局状态（gameStore / favoritesStore）
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # .osu / .osb 解析、osz 解压、歌词、IndexedDB 等
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 支持的文件格式

| 格式 | 说明 |
| --- | --- |
| `.osz` | 谱面压缩包（自动解压） |
| `.osk` | 皮肤压缩包 |
| `.osu` | 谱面文件 |
| `.osb` | Storyboard 脚本 |
| `.mp3` / `.ogg` | 音频 |
| `.mp4` | 视频背景 |
| `.png` / `.jpg` / `.jpeg` / `.webp` | 图片资源 |

## 设置项一览

| 分类 | 设置项 |
| --- | --- |
| **外观** | 主题、主题色、页面缩放 |
| **音频** | 主音量、全局偏移、播放速度、音效音量、默认采样集、启用谱面音效 |
| **游戏** | Auto 模式、显示光标、引导线倍率、引导圈、连击数字、击中特效、显示 FPS、HUD 缩放 |
| **键位** | Standard / Taiko / Catch / Mania（1K-10K）自定义按键 |
| **Mod** | 10 种 Mod 自由组合 |
| **皮肤** | 谱面皮肤、自定义皮肤导入、combo 颜色、圆圈 / 滑条边框宽度、滑条球缩放 |
| **画面** | Storyboard 开关、视频背景、背景昏暗度、背景模糊、强制横屏、全屏 |
| **搜索** | 搜索源、仅显示含 Storyboard、仅显示含视频、下载完整包 |
| **歌词** | 歌词开关、效果（无 / 淡入 / 滑动）、字号 |
| **高级** | 观赏模式、自动圆圈模式、光标拖尾、光标按压、光标大小、Auto 速度 |
| **关于** | 项目信息、API 健康检查、清理缓存 |

## 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 首页（推荐 / 精选谱面） |
| `/search` | 搜索 |
| `/set/:setId` | 谱面详情 |
| `/game/:setId/:mode/:diff` | 游戏游玩 |
| `/downloads` | 下载管理 |
| `/settings` | 设置 |

## 部署

纯静态前端，构建后部署 `dist/` 到任意静态托管服务：

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?logo=github&logoColor=white&style=for-the-badge)](https://pages.github.com)
[![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white&style=for-the-badge)](https://vercel.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white&style=for-the-badge)](https://netlify.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?logo=cloudflarepages&logoColor=white&style=for-the-badge)](https://pages.cloudflare.com)

## 参与贡献

欢迎提交 Issue 与 Pull Request！请先阅读 [贡献指南](./CONTRIBUTING.md) 与 [行为准则](./CODE_OF_CONDUCT.md)。

## 致谢

- [osu!](https://osu.ppy.sh/) 社区与谱面作者
- [Sayobot](https://osu.sayobot.cn/) 搜索服务
- [osu.direct](https://osu.direct/) 搜索服务
- [Kitsu](https://kitsu.moe/) 谱面镜像
- [Chimu](https://chimu.moe/) 谱面镜像
- [LRCLIB](https://lrclib.net/) 开源歌词

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

> 注意：osu! 谱面、音乐、皮肤等内容版权归原作者所有，本项目不存储任何此类内容，仅提供客户端播放能力。

<div align="center">
  <sub>Built with <svg width="11" height="11" viewBox="0 0 24 24" fill="#ff66aa" style="vertical-align:middle"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg> by osu!web contributors</sub>
</div>

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=ff9ecf&height=120&section=footer" width="100%" alt="footer" />
</div>
