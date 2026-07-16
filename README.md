<div align="center">

<p>
  <img src="public/favicon.svg" width="120" height="120" alt="osu!web logo" />
</p>

# osu!web

**在浏览器里畅玩 osu! 谱面 · 纯前端 osu! 客户端**

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
| 🎮 **多模式游玩** | osu!standard / taiko / catch / mania，含引导线、打击反馈、大音符、下落式按键 |
| 🔍 **谱面获取** | 集成 osu.direct、Sayobot、Kitsu、Chimu 多源搜索，支持关键词 / 歌曲名 / 歌手名筛选 |
| 💾 **本地下载管理** | IndexedDB 持久化，后台下载、折叠展开、本地直接开玩，支持导入本地 `.osz` |
| 🎬 **Storyboard 支持** | 解析 `.osb` 与 `Events` 段落，支持 Sprite / Animation 及 F / M / S / R / C / P 命令 |
| 🎵 **歌词系统** | LRCLIB 开源歌词 API，游戏内底部显示当前歌词（淡入 / 滑动效果） |
| 🎥 **视频背景** | 支持谱面自带视频背景播放 |
| 🔁 **回放系统** | 游戏结束当场查看输入回放，支持本地保存与管理 |
| 🤖 **Auto 演示** | 全模式 Auto，Standard 光标弹簧物理 + 拖尾反馈 |
| ⌨️ **Mod 系统** | Easy / No Fail / Half Time / Hard Rock / Sudden Death / Double Time / Hidden / Flashlight / Relax / Autopilot |
| 🎨 **皮肤系统** | 支持谱面自带皮肤、自定义皮肤导入、自定义 combo 颜色与圆圈缩放 |
| 🔊 **音效系统** | 谱面 / 自定义音效采样，可调音量与默认采样集 |
| 📱 **全屏模式** | 浏览器全屏切换，桌面端与移动端均支持，可强制横屏 |
| 📊 **FPS 显示** | 游戏内右下角实时显示帧率 |
| 🌗 **主题切换** | 明 / 暗主题 + 6 种主题色 |

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
  <sub>Built with ♥ by osu!web contributors</sub>
</div>
