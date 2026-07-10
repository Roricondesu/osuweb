<div align="center">

# osu!web

纯前端 osu! 客户端，在浏览器里畅玩谱面。

**在线体验：[osu.yuiro.top](https://osu.yuiro.top)**

</div>

---

## 功能

- **多模式游玩** — osu!standard / Taiko / Catch / Mania
- **谱面搜索与下载** — 集成 osu.direct 与 Sayobot，IndexedDB 本地持久化
- **Storyboard 渲染** — 解析 `.osb` 与 Events 段，支持 Sprite / Animation 及全命令
- **歌词同步** — LRCLIB 开源歌词 API，游戏内实时显示
- **回放系统** — 游戏结束当场查看输入回放
- **Auto 演示** — 全模式自动游玩，Standard 光标弹簧物理
- **全屏模式** — 类似 F11 的浏览器全屏切换
- **响应式** — 支持桌面端与移动端，横竖屏自适应

## 技术栈

React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · Zustand · Canvas 2D

## 快速开始

```bash
pnpm install
pnpm dev        # 开发
pnpm build      # 构建
```

## 部署

构建产物为纯静态文件，部署 `dist/` 到任意静态托管即可。

## 致谢

- [osu!](https://osu.ppy.sh/)
- [Sayobot](https://osu.sayobot.cn/)
- [osu.direct](https://osu.direct/)
- [LRCLIB](https://lrclib.net/)
