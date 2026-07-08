# osu! Web

一个基于 Web 技术构建的 osu! 客户端，支持谱面搜索、下载、本地管理和多模式游玩。所有逻辑均在浏览器端运行，无需后端服务。

## 功能特性

- **多模式游玩**
  - osu!standard（osu!）—— 支持 Circle、Slider、Spinner，含引导线、打击反馈、Auto 演示
  - osu!taiko（太鼓）—— 横竖屏适配的鼓面 UI，支持 Don/Katsu 与大音符
  - osu!catch（接水果）—— 横竖屏双向轨道，水果几何图形化
  - osu!mania（下落式）—— 4K/7K，圆角矩形音符与毛玻璃按键面板

- **谱面获取**
  - 集成 osu.direct 搜索
  - 集成 Sayobot 搜索 API，解决加载慢/无结果问题
  - 支持按歌曲名、歌手名筛选
  - 支持仅显示含 Storyboard 的谱面（osu.direct）
  - 支持下载完整谱面包（含 Storyboard/视频资源）或精简包

- **本地下载管理**
  - 使用 IndexedDB 持久化保存已下载谱面
  - 下载列表支持折叠/展开
  - 本地直接开始游戏

- **Storyboard 支持**
  - 解析并渲染 .osb 文件
  - 支持 Sprite / Animation 及移动、缩放、旋转、淡入淡出、变色等命令
  - 命令预展开 + 二分查找，保证播放流畅
  - 自动加载 Storyboard 所需图片资源

- **歌词系统**
  - 接入网易云音乐歌词 API
  - 游戏内底部显示当前歌词

- **Auto 演示**
  - 全模式支持 Auto AI 自动游玩
  - Standard 光标采用弹簧物理系统，带拖尾与按下反馈
  - 光标始终预判下一个目标，避免瞬移

- **设置项**
  - 搜索源切换（osu.direct / Sayobot）
  - 全局偏移、背景昏暗度、是否显示 Storyboard / 歌词
  - 下载类型选择（完整 / 精简）

## 技术栈

- **框架**：React 18 + TypeScript + Vite 6
- **路由**：React Router DOM
- **状态管理**：Zustand
- **样式**：Tailwind CSS + 自定义毛玻璃组件
- **Canvas**：原生 Canvas 2D 渲染引擎
- **音频**：HTMLAudioElement
- **压缩/解压**：JSZip
- **存储**：IndexedDB（idb-keyval 风格封装）
- **图标**：Lucide React

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

默认打开 `http://localhost:5173/`。

### 构建生产版本

```bash
pnpm build
```

产物输出到 `dist/` 目录。

### 本地预览生产版本

```bash
pnpm preview
```

## 项目结构

```
osu-game/
├── public/                 # 静态资源（字体、图标）
├── src/
│   ├── api/                # 搜索/下载 API 封装
│   │   └── osuDirect.ts
│   ├── components/         # React 组件
│   │   ├── common/         # BeatmapCard、ModeBadge 等通用组件
│   │   ├── glass/          # 毛玻璃风格按钮/卡片/开关
│   │   └── layout/         # 背景、顶部导航
│   ├── engine/             # 游戏核心引擎
│   │   ├── modes/          # 四种模式引擎
│   │   │   ├── StandardEngine.ts
│   │   │   ├── TaikoEngine.ts
│   │   │   ├── CatchEngine.ts
│   │   │   └── ManiaEngine.ts
│   │   ├── renderer/       # Canvas 2D 绘制工具
│   │   │   └── Canvas2D.ts
│   │   ├── GameEngine.ts   # 引擎基类：Storyboard、歌词、光标、循环
│   │   ├── Judger.ts       # 判定逻辑
│   │   └── index.ts        # 引擎工厂
│   ├── hooks/              # 自定义 Hooks
│   ├── pages/              # 页面组件
│   │   ├── Home.tsx
│   │   ├── Search.tsx
│   │   ├── BeatmapSetDetail.tsx
│   │   ├── Downloads.tsx
│   │   ├── Game.tsx
│   │   └── Settings.tsx
│   ├── store/              # Zustand 全局状态
│   │   └── useGameStore.ts
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   ├── osuParser.ts    # .osu / .osb 解析
│   │   ├── oszLoader.ts    # .osz 解压与资源加载
│   │   ├── neteaseLyrics.ts# 网易云歌词
│   │   ├── indexedDb.ts    # IndexedDB 封装
│   │   └── formatTime.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 支持的文件格式

- `.osz` — 谱面压缩包（自动解压）
- `.osu` — 谱面文件
- `.osb` — Storyboard 脚本
- `.mp3`/`.ogg` — 音频
- `.png`/`.jpg`/`.jpeg`/`.webp` — 图片资源

## 搜索与下载

搜索页支持：

- 关键词搜索（osu.direct / Sayobot）
- 搜索类型：全部 / 歌曲名 / 歌手名
- 仅显示有 Storyboard 的谱面（osu.direct 有效）
- 点击谱面集进入详情，选择难度和模式下载

下载时可在设置中选择：

- **完整谱面包**：包含 Storyboard、视频等全部资源
- **精简谱面包**：仅包含游玩必需资源，体积更小

## Storyboard

Storyboard 会自动读取谱面中的 `.osb` 文件以及 `Events` 段落中的 Sprite/Animation 定义，支持：

- 图层分层：`Background`、`Fail`、`Pass`、`Foreground`、`Overlay`
- 命令类型：`F`（淡入淡出）、`M`（移动）、`MX`/`MY`（单轴移动）、`S`（缩放）、`V`（矢量缩放）、`R`（旋转）、`C`（颜色）、`P`（参数/循环）
- 动画循环（Loop）和触发器（Trigger）

> 注意：Sayobot 精简包通常不包含 Storyboard 资源，需要选择完整谱面包下载。

## 歌词

游戏内会自动尝试通过网易云音乐 API 匹配当前谱面的标题与艺术家，并在底部显示歌词。匹配成功后会显示对应时间点的歌词文本。

## 设置项说明

| 设置项 | 说明 |
| --- | --- |
| 全局偏移 | 调整音频与谱面的时间差（毫秒） |
| 背景昏暗度 | 游戏内背景图片/Storyboard 的变暗程度 |
| 显示 Storyboard | 是否渲染 Storyboard |
| 显示歌词 | 是否显示网易云歌词 |
| 搜索源 | osu.direct / Sayobot |
| 仅显示有 Storyboard | 搜索结果过滤（osu.direct 有效） |
| 下载类型 | 完整谱面包 / 精简谱面包 |

## 开发说明

### 添加新模式

1. 在 `src/engine/modes/` 下继承 `GameEngine` 实现新引擎
2. 实现 `update(time)`、`render()`、`onPointerDown(x, y)` 等抽象方法
3. 在 `src/engine/index.ts` 的模式映射中注册

### 调整 Auto 光标

Standard 模式的光标移动逻辑位于 `src/engine/GameEngine.ts` 的 `smoothCursor()`，以及 `src/engine/modes/StandardEngine.ts` 的 `autoPlay()`。当前使用弹簧物理系统，可通过调整 `k`（刚度）、`c`（阻尼）和 `maxSpeed` 改变手感。

### 调整判定窗口

判定窗口在 `src/engine/Judger.ts` 中根据 OD 计算，可在 `windowsForOD()` 中修改。

## 部署

项目为纯静态前端，构建后将 `dist/` 目录部署到任意静态托管服务即可，例如：

- GitHub Pages
- Vercel
- Netlify
- Cloudflare Pages

## 许可证

本项目为个人学习与开源项目，osu! 相关内容版权归 respective owners 所有。

## 致谢

- [osu!](https://osu.ppy.sh/) 社区与谱面作者
- [Sayobot](https://osu.sayobot.cn/) 提供的搜索服务
- [osu.direct](https://osu.direct/) 提供的搜索服务
- 网易云音乐歌词 API
