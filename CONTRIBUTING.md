# 贡献指南 / Contributing Guidelines

<p>
  <strong>简体中文</strong> · <a href="#contributing-guidelines-english">English</a>
</p>

> 欢迎为 osu!web 贡献代码！请先阅读 [README](./README.md) 了解项目全貌，并遵守 [行为准则](./CODE_OF_CONDUCT.md)。

---

## 贡献指南

欢迎参与 osu!web 项目！无论是修复 Bug、新增功能、完善文档还是优化体验，我们都非常感谢你的帮助。本文档将引导你完成从环境搭建到提交 PR 的全过程。

### 行为准则

参与本项目的所有贡献者都需遵守 [行为准则](./CODE_OF_CONDUCT.md)。请在交流中保持友善与尊重。

### 本地启动

#### 环境要求

- Node.js >= 18（推荐 20+）
- pnpm（推荐）—— 本仓库使用 `pnpm-lock.yaml` 锁定依赖

#### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Roricondesu/osuweb.git
cd osuweb

# 安装依赖（请使用 pnpm 以保持依赖版本一致）
pnpm install

# 启动开发服务器，默认 http://localhost:5173/
pnpm dev

# 构建生产版本
pnpm build

# 本地预览生产版本
pnpm preview
```

开发模式下默认端口为 `5173`，修改代码后支持热更新。

### 代码规范

提交代码前请确保通过以下检查：

```bash
# 类型检查（TypeScript 编译，不产出文件）
pnpm check

# 代码规范检查（ESLint）
pnpm lint

# 构建验证（包含 tsc -b 与 vite build）
pnpm build
```

- TypeScript 必须通过 `pnpm check`，不允许提交带类型错误的代码。
- ESLint 必须通过 `pnpm lint`，请根据提示修复所有报错。
- 组件、引擎、工具函数请参考现有目录结构与命名约定，保持风格统一。

### 提交信息规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。每个提交信息应使用如下格式：

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

`type` 必须为以下之一：

| type | 说明 |
| --- | --- |
| `feat` | 新功能 / 新特性 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式调整（不影响功能，如空格、分号、排序） |
| `refactor` | 重构（既非新增功能也非修复 Bug） |
| `test` | 新增或修改测试 |
| `chore` | 构建、依赖、脚本、配置等杂项变更 |

示例：

```
feat(engine): 支持 osu!mania 双人模式按键绑定
fix(renderer): 修复全屏切换后 Canvas 比例错误
docs(readme): 补充谱面导入说明
chore(deps): 升级 zustand 到 5.0.3
```

### 分支命名

- 从 `main` 拉取最新代码后创建分支
- 分支名建议 `<type>/<简短描述>`，例如：
  - `feat/mania-2p-keys`
  - `fix/fullscreen-canvas-ratio`
  - `docs/usage-guide`
  - `chore/upgrade-deps`

### Pull Request 流程

1. 在开始较大改动前，建议先在 [Issues](https://github.com/Roricondesu/osuweb/issues) 或 [Discussions](https://github.com/Roricondesu/osuweb/discussions) 中讨论，避免重复劳动或方向偏差。
2. 基于 `main` 创建分支，提交清晰、原子化的 commit。
3. 确保本地通过 `pnpm check`、`pnpm lint` 与 `pnpm build`。
4. 推送分支并向 `main` 提交 Pull Request，按 [PR 模板](./.github/PULL_REQUEST_TEMPLATE.md) 填写说明。
5. PR 中关联相关 Issue（如 `Closes #123`）。
6. 等待维护者 review，根据反馈在原分支上迭代（不要新建 PR）。

### Issue 指引

- **Bug 报告**：请使用 Bug 报告模板，提供复现步骤、环境信息（浏览器 / 操作系统 / 设备）、期望与实际行为，必要时附上截图或控制台日志。
- **功能请求**：请使用功能请求模板，说明需求场景、希望解决的问题及建议方案。
- 在提交前请先搜索已有 Issue，避免重复创建。
- 不确定是 Bug 还是使用问题时，可先到 [Discussions](https://github.com/Roricondesu/osuweb/discussions) 提问。

### 版权内容提醒

> ⚠️ **重要**：osu!web 不存储任何谱面、音乐、视频、皮肤等受版权保护的内容，仅提供客户端播放能力。

请在贡献时遵守以下原则：

- **不要**将任何 `.osz` / `.osk` / `.osu` / `.osb` 谱面文件、音频（`.mp3` / `.ogg`）、视频（`.mp4`）或受版权保护的图片提交到本仓库。
- **不要**将皮肤资源、谱面背景、封面图等受版权保护的内容提交到本仓库。
- 仓库仅包含项目源代码与必要的开发资源（字体、图标、favicon 等）。如需添加静态资源，请确认其许可证允许再分发。
- 代码中如需引用第三方资源，请使用运行时按需加载（如通过第三方公开 API 获取），而非硬编码进仓库。

如发现误提交了版权内容，请尽快在 PR 中移除，或通过 [i@yuiro.top](mailto:i@yuiro.top) 联系维护者处理。

### 致谢

感谢每一位为 osu!web 贡献代码、提交 Issue、参与讨论的伙伴 ❤️。你的每一份帮助都让这个项目变得更好。

---

<a id="contributing-guidelines-english"></a>

# Contributing Guidelines

<p>
  <a href="#贡献指南">简体中文</a> · <strong>English</strong>
</p>

> Welcome to contribute to osu!web! Please first read the [README](./README.md) for an overview and follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Contributing Guidelines

Welcome to the osu!web project! Whether you're fixing a bug, adding a feature, improving documentation, or polishing the experience, we truly appreciate your help. This guide walks you through the process from environment setup to submitting a PR.

### Code of Conduct

All contributors are expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md). Please be friendly and respectful in all interactions.

### Local Setup

#### Prerequisites

- Node.js >= 18 (20+ recommended)
- pnpm (recommended) — this repo ships a `pnpm-lock.yaml` to lock dependencies

#### Install & Run

```bash
# Clone the repo
git clone https://github.com/Roricondesu/osuweb.git
cd osuweb

# Install dependencies (please use pnpm to keep dependency versions consistent)
pnpm install

# Start the dev server (defaults to http://localhost:5173/)
pnpm dev

# Build for production
pnpm build

# Preview the production build locally
pnpm preview
```

The dev server runs on port `5173` by default and supports hot module replacement.

### Code Standards

Before submitting code, make sure the following checks pass:

```bash
# Type check (TypeScript compile without emitting files)
pnpm check

# Lint (ESLint)
pnpm lint

# Build verification (runs tsc -b and vite build)
pnpm build
```

- TypeScript must pass `pnpm check`. Do not commit code with type errors.
- ESLint must pass `pnpm lint`. Fix all reported issues according to the hints.
- For components, engine, and utility code, follow the existing directory structure and naming conventions to keep the style consistent.

### Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Each commit message should use the following format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

`type` must be one of:

| type | description |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes that do not affect functionality (whitespace, semicolons, ordering, etc.) |
| `refactor` | A code change that neither fixes a bug nor adds a feature |
| `test` | Adding or modifying tests |
| `chore` | Build, dependencies, scripts, config, and other miscellaneous changes |

Examples:

```
feat(engine): support osu!mania 2-player key bindings
fix(renderer): fix canvas ratio after fullscreen toggle
docs(readme): add beatmap import instructions
chore(deps): upgrade zustand to 5.0.3
```

### Branch Naming

- Always branch off the latest `main`.
- Branch names should follow `<type>/<short-description>`, e.g.:
  - `feat/mania-2p-keys`
  - `fix/fullscreen-canvas-ratio`
  - `docs/usage-guide`
  - `chore/upgrade-deps`

### Pull Request Process

1. For larger changes, discuss first in [Issues](https://github.com/Roricondesu/osuweb/issues) or [Discussions](https://github.com/Roricondesu/osuweb/discussions) to avoid duplicated work or misalignment.
2. Create a branch off `main` with clear, atomic commits.
3. Ensure `pnpm check`, `pnpm lint`, and `pnpm build` all pass locally.
4. Push your branch and open a Pull Request against `main`, filling in the [PR template](./.github/PULL_REQUEST_TEMPLATE.md).
5. Link related issues (e.g., `Closes #123`).
6. Wait for review and iterate on the same branch based on feedback (do not open a new PR).

### Issue Guidelines

- **Bug report**: Use the bug report template. Provide reproduction steps, environment info (browser / OS / device), expected vs. actual behavior, and attach screenshots or console logs if possible.
- **Feature request**: Use the feature request template. Describe the use case, the problem you want to solve, and your suggested approach.
- Search existing issues before opening a new one to avoid duplicates.
- If unsure whether something is a bug or a usage question, ask first in [Discussions](https://github.com/Roricondesu/osuweb/discussions).

### Copyright Content Reminder

> ⚠️ **Important**: osu!web does not store any copyrighted content such as beatmaps, music, videos, or skins — it only provides client-side playback capability.

Please follow these principles when contributing:

- **Do not** commit any `.osz` / `.osk` / `.osu` / `.osb` beatmap files, audio (`.mp3` / `.ogg`), video (`.mp4`), or other copyrighted images to this repository.
- **Do not** commit skin resources, beatmap backgrounds, cover images, or other copyrighted content.
- The repository contains only project source code and necessary development assets (fonts, icons, favicon, etc.). If you need to add static assets, verify that their license permits redistribution first.
- When third-party resources are needed in code, load them at runtime (e.g., via public third-party APIs) rather than hardcoding them into the repo.

If you find copyrighted content was committed by mistake, remove it in a PR as soon as possible, or contact maintainers via [i@yuiro.top](mailto:i@yuiro.top).

### Acknowledgements

Thank you to everyone who contributes code, files issues, or joins discussions for osu!web ❤️. Every bit of help makes this project better.
