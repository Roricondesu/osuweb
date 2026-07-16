# 安全策略 / Security Policy

<p>
  <strong>简体中文</strong> · <a href="#security-policy-english">English</a>
</p>

---

## 安全策略

### 支持的版本

osu!web 是一个持续开发中的项目，仅对 `main` 分支的最新提交提供安全支持。旧版本不会单独发布补丁，请始终使用最新的 `main` 分支。

| 版本 | 是否支持安全更新 |
| --- | --- |
| `main`（最新） | ✅ 支持 |
| 历史版本 / 旧提交 | ❌ 不支持 |

### 报告漏洞

如果你发现 osu!web 存在安全漏洞，**请勿在公开的 Issue、Pull Request、Discussion 或任何公开渠道中提交**，以免漏洞在修复前被滥用。

请通过邮件将漏洞详情发送至 **i@yuiro.top**，并在邮件中包含以下信息（中英文均可）：

- 漏洞的简明描述
- 复现步骤（越详细越好，最好可独立复现）
- 影响范围与潜在危害
- 受影响的代码位置或文件（如已知）
- 建议的修复方案（可选）

我们会在收到报告后尽快确认，并在漏洞修复并发布后公开致谢（如你同意）。报告人在漏洞修复前请勿对外公开细节。

### 响应时间

- 确认收到报告：通常 3 个工作日内
- 初步评估与沟通：通常 7 个工作日内
- 修复时间：视漏洞严重程度与影响范围而定，严重漏洞将优先处理

### 项目安全说明

osu!web 是一个**纯前端**浏览器客户端，具有以下安全特性：

- **无后端服务**：项目本身不运行任何服务器，所有逻辑均在用户浏览器中执行。
- **无用户认证系统**：项目不提供用户注册、登录或账户体系，不收集或存储任何用户身份信息。
- **本地存储**：用户数据（谱面、回放、设置等）均通过浏览器 IndexedDB 保存在本地，不上传到任何服务器。
- **第三方服务**：谱面搜索、下载、歌词等功能会请求第三方公开 API（如 osu.direct、Sayobot、Kitsu、Chimu、LRCLIB），其数据处理受各自服务条款约束，请留意相关隐私政策。
- **客户端安全边界**：作为纯前端应用，osu!web 受浏览器同源策略与沙箱限制，无法访问用户本机文件系统之外的内容（除用户主动导入的 `.osz` / `.osk` 文件）。

因此，本项目本身不涉及服务端注入、越权访问、数据库泄露等后端安全风险。但仍可能存在 XSS、解析器漏洞（如 `.osu` / `.osb` / `.osz` 解析）、依赖供应链问题等前端安全风险，欢迎报告。

### 反馈渠道

一般性安全建议或非漏洞相关问题请通过 [GitHub Discussions](https://github.com/Roricondesu/osuweb/discussions) 或 [Issues](https://github.com/Roricondesu/osuweb/issues) 提出。仅针对未公开漏洞请使用上述邮件渠道。

---

<a id="security-policy-english"></a>

# Security Policy

<p>
  <a href="#安全策略">简体中文</a> · <strong>English</strong>
</p>

## Security Policy

### Supported Versions

osu!web is a project under continuous development, and security support is only provided for the latest commit on the `main` branch. Older versions do not receive individual patches — please always use the latest `main` branch.

| Version | Supported |
| --- | --- |
| `main` (latest) | ✅ Supported |
| Historical versions / older commits | ❌ Not supported |

### Reporting a Vulnerability

If you discover a security vulnerability in osu!web, **please do not report it through public Issues, Pull Requests, Discussions, or any other public channel**, to prevent exploitation before a fix is available.

Instead, please send the details by email to **i@yuiro.top**, including the following information (Chinese or English):

- A concise description of the vulnerability
- Steps to reproduce (the more detailed, the better — ideally independently reproducible)
- Impact scope and potential harm
- Affected code location or files (if known)
- Suggested fix (optional)

We will acknowledge receipt as soon as possible and publicly credit you after the fix is released (if you agree). Reporters should not publicly disclose the details before the fix is shipped.

### Response Timeline

- Acknowledgement of receipt: usually within 3 business days
- Initial assessment and communication: usually within 7 business days
- Time to fix: depends on the severity and impact of the vulnerability; critical issues are prioritized

### Project Security Notes

osu!web is a **purely front-end** browser client with the following security characteristics:

- **No backend service**: The project does not run any server; all logic executes within the user's browser.
- **No user authentication**: The project provides no registration, login, or account system and does not collect or store any user identity information.
- **Local storage**: User data (beatmaps, replays, settings, etc.) is persisted locally in the browser via IndexedDB and is never uploaded to any server.
- **Third-party services**: Beatmap search, download, and lyrics features call public third-party APIs (e.g., osu.direct, Sayobot, Kitsu, Chimu, LRCLIB). Their data handling is governed by their respective terms of service and privacy policies.
- **Client-side security boundary**: As a pure front-end application, osu!web is constrained by the browser's same-origin policy and sandbox and cannot access anything beyond the user's file system (except for `.osz` / `.osk` files the user explicitly imports).

Accordingly, this project does not involve backend security risks such as server-side injection, privilege escalation, or database leaks. However, front-end security risks may still exist, including XSS, parser vulnerabilities (e.g., `.osu` / `.osb` / `.osz` parsing), and dependency supply chain issues — these are welcome to be reported.

### Feedback Channels

For general security suggestions or non-vulnerability-related questions, please use [GitHub Discussions](https://github.com/Roricondesu/osuweb/discussions) or [Issues](https://github.com/Roricondesu/osuweb/issues). Only use the email channel above for undisclosed vulnerabilities.
