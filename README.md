<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=ff9ecf&height=220&section=header&text=osu!%20Web&fontSize=72&fontColor=ffffff&fontAlignY=38&desc=在浏览器里畅玩%20osu!%20谱面&descSize=18&descAlignY=58&animation=fadeIn" />

<br/>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=22&duration=2800&pause=800&color=FF9ECF&center=true&vCenter=true&width=600&lines=纯前端+osu!+客户端;支持+Standard+%7C+Taiko+%7C+Catch+%7C+Mania;Storyboard+%E6%B8%B2%E6%9F%93+%C2%B7+%E7%BD%91%E6%98%93%E4%BA%91%E6%AD%8C%E8%AF%8D+%C2%B7+Auto+%E6%BC%94%E7%A4%BA" />
  <source media="(prefers-color-scheme: light)" srcset="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=22&duration=2800&pause=800&color=FF69B4&center=true&vCenter=true&width=600&lines=纯前端+osu!+客户端;支持+Standard+%7C+Taiko+%7C+Catch+%7C+Mania;Storyboard+%E6%B8%B2%E6%9F%93+%C2%B7+%E7%BD%91%E6%98%93%E4%BA%91%E6%AD%8C%E8%AF%8D+%C2%B7+Auto+%E6%BC%94%E7%A4%BA" />
  <img alt="typing" src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=22&duration=2800&pause=800&color=FF9ECF&center=true&vCenter=true&width=600&lines=纯前端+osu!+客户端;支持+Standard+%7C+Taiko+%7C+Catch+%7C+Mania;Storyboard+%E6%B8%B2%E6%9F%93+%C2%B7+%E7%BD%91%E6%98%93%E4%BA%91%E6%AD%8C%E8%AF%8D+%C2%B7+Auto+%E6%BC%94%E7%A4%BA" />
</picture>

<br/>

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-5-FF9ECF?style=for-the-badge)](https://github.com/pmndrs/zustand)

</div>

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Video%20Game.png" width="28" /> 功能特性

<table>
<tr>
<td width="50%">

### 🎮 多模式游玩

- **osu!standard** — Circle / Slider / Spinner，引导线与打击反馈
- **osu!taiko** — 横竖屏鼓面 UI，支持 Don / Katsu 与大音符
- **osu!catch** — 双向轨道，水果几何图形化
- **osu!mania** — 4K / 7K，圆角矩形音符与毛玻璃按键面板

</td>
<td width="50%">

### 🔍 谱面获取

- 集成 **osu.direct** 与 **Sayobot** 搜索
- 关键词 / 歌曲名 / 歌手名筛选
- 仅显示含 Storyboard 的谱面
- 完整包 / 精简包两种下载方式

</td>
</tr>
<tr>
<td width="50%">

### 💾 本地下载管理

- 使用 **IndexedDB** 持久化已下载谱面
- 下载列表折叠 / 展开
- 本地直接开始游戏

</td>
<td width="50%">

### 🎬 Storyboard 支持

- 解析 `.osb` 与 `Events` 段落
- Sprite / Animation 及 F / M / S / R / C / P 等命令
- 命令预展开 + 二分查找，播放流畅
- 自动加载 Storyboard 图片资源

</td>
</tr>
<tr>
<td width="50%">

### 🎤 歌词系统

- 接入网易云音乐歌词 API
- 游戏内底部显示当前歌词

</td>
<td width="50%">

### 🤖 Auto 演示

- 全模式支持 Auto 自动游玩
- Standard 光标弹簧物理 + 拖尾反馈
- 光标预判下一目标，移动平滑

</td>
</tr>
</table>

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Hammer%20and%20Wrench.png" width="28" /> 技术栈

```mermaid
flowchart LR
    A[React 18 + TypeScript] -->|构建| B[Vite 6]
    B --> C[Canvas 2D 渲染引擎]
    A --> D[Zustand 状态管理]
    A --> E[Tailwind CSS + 毛玻璃组件]
    C --> F[Storyboard / 歌词 / 光标 / 判定]
    E --> G[Code Pro 字体 + 粉色主题]
```

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript + Vite 6 |
| 路由 | React Router DOM |
| 状态 | Zustand |
| 样式 | Tailwind CSS + 自定义毛玻璃组件 |
| 渲染 | 原生 Canvas 2D |
| 音频 | HTMLAudioElement |
| 解压 | JSZip |
| 存储 | IndexedDB |
| 图标 | Lucide React |
| 字体 | Code Pro |

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Rocket.png" width="28" /> 快速开始

### 环境要求

- Node.js >= 18
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
```

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Folder.png" width="28" /> 项目结构

```text
osu-game/
├── public/                 # 静态资源（Code Pro 字体、图标）
├── src/
│   ├── api/                # 搜索/下载 API 封装
│   ├── components/         # React 组件
│   │   ├── common/         # BeatmapCard、ModeBadge、StoryboardBadge
│   │   ├── glass/          # 毛玻璃风格按钮/卡片/开关
│   │   └── layout/         # 背景、顶部导航
│   ├── engine/             # 游戏核心引擎
│   │   ├── modes/          # Standard / Taiko / Catch / Mania
│   │   ├── renderer/       # Canvas 2D 绘制工具
│   │   ├── GameEngine.ts   # 引擎基类
│   │   └── Judger.ts       # 判定逻辑
│   ├── hooks/              # 自定义 Hooks
│   ├── pages/              # 页面组件
│   ├── store/              # Zustand 全局状态
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # .osu / .osb 解析、osz 解压、歌词等
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Musical%20Notes.png" width="28" /> 支持的文件格式

| 格式 | 说明 |
| --- | --- |
| `.osz` | 谱面压缩包（自动解压） |
| `.osu` | 谱面文件 |
| `.osb` | Storyboard 脚本 |
| `.mp3` / `.ogg` | 音频 |
| `.png` / `.jpg` / `.jpeg` / `.webp` | 图片资源 |

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gear.png" width="28" /> 设置项说明

| 设置项 | 说明 |
| --- | --- |
| 全局偏移 | 调整音频与谱面的时间差（毫秒） |
| 背景昏暗度 | 游戏内背景 / Storyboard 的变暗程度 |
| 显示 Storyboard | 是否渲染 Storyboard |
| 显示歌词 | 是否显示网易云歌词 |
| 搜索源 | osu.direct / Sayobot |
| 仅显示有 Storyboard | 搜索结果过滤（osu.direct 有效） |
| 下载类型 | 完整谱面包 / 精简谱面包 |

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Sparkles.png" width="28" /> 部署

纯静态前端，构建后部署 `dist/` 到任意静态托管服务：

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222?logo=github&logoColor=white&style=for-the-badge)](https://pages.github.com)
[![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white&style=for-the-badge)](https://vercel.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?logo=netlify&logoColor=white&style=for-the-badge)](https://netlify.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?logo=cloudflarepages&logoColor=white&style=for-the-badge)](https://pages.cloudflare.com)

---

## <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Heart%20with%20Ribbon.png" width="28" /> 致谢

- [osu!](https://osu.ppy.sh/) 社区与谱面作者
- [Sayobot](https://osu.sayobot.cn/) 搜索服务
- [osu.direct](https://osu.direct/) 搜索服务
- 网易云音乐歌词 API

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=ff9ecf&height=120&section=footer" />
</div>
