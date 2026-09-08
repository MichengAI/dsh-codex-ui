<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI

  **让 DSH Web 中的项目更好整理、会话更快找到、长对话更易回看**

  [English](README.md) · [更新日志](CHANGELOG.zh-CN.md) · [Apache-2.0](LICENSE)

  [![许可证：Apache-2.0](https://img.shields.io/badge/许可证-Apache--2.0-blue.svg)](LICENSE)
  [![npm package](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![npm 下载量](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=npm%20%E4%B8%8B%E8%BD%BD%E9%87%8F&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> DSH Codex UI 是社区维护的 DeepSeek Harness（DSH）界面增强插件，并非 DeepSeek AI 官方产品。

在 DSH Web 中同时处理多个项目和会话时，DSH Codex UI 帮你整理左侧导航、快速找到任务，并在长对话中跳回之前的提问。它提供 Codex 风格的界面，支持浅色和深色主题。

## 你可以用它做什么

- **整理项目与会话**：展开或折叠项目、拖拽调整顺序、置顶常用项目，查看未读提醒和运行状态。
- **快速找到内容**：通过顶部搜索查找会话、设置和快捷操作。
- **管理日常任务**：在项目或会话菜单中重命名、归档、派生会话，或打开项目目录。
- **回看长对话**：点击轮次导航，直接跳到对应提问。
- **复用之前的输入**：输入框为空时，按上下方向键找回当前工作区中已提交的文本。
- **按需扩展功能**：在「设置 → 关于」查看配套插件，安装或更新需要的功能。

## 界面预览

浅色主题：Codex 风格侧栏、工作区会话树和会话列。

![浅色主题会话页](assets/screenshots/conversation-light.png)

深色主题：适合偏好暗色界面的用户。

![深色主题会话页](assets/screenshots/conversation.png)

会话菜单：重命名、置顶、未读、归档、派生、复制和删除。

![会话菜单](assets/screenshots/session-menu.png)

「设置 → 关于」列出配套插件及其安装状态。

![关于页与配套插件](assets/screenshots/settings-about.png)

## 前置条件

- 已可正常运行 DeepSeek Harness Web，且可在 PowerShell 中使用 `dsh`。
- 以下示例使用 `web` profile；请替换为实际目标 profile。
- 运行环境需满足 Node.js `^22.19.0 || >=24.0.0`；从源码安装还需要 pnpm。

## DSH 产品生态

想直接使用完整工作台，可下载 [DSH Codex Desktop](https://github.com/MichengAI/dsh-codex-desktop/releases)；已有 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 环境，可按需独立安装以下 8 个自研插件。桌面端已随附这些插件。

| 插件 | 你可以用它做什么 |
| --- | --- |
| [Codex UI](https://github.com/MichengAI/dsh-codex-ui) | 整理项目与会话、搜索任务、跳转对话轮次 |
| [IM Connect](https://github.com/MichengAI/dsh-im-connect) | 从微信、飞书、钉钉等消息平台下任务、收回复 |
| [Automation](https://github.com/MichengAI/dsh-automation) | 按计划执行任务，查看每次运行的结果 |
| [Skills Manager](https://github.com/MichengAI/dsh-skills-manager) | 统一查找、启停、创建和导入本机技能 |
| [Archive Manager](https://github.com/MichengAI/dsh-archive-manager) | 搜索、恢复或清理已归档会话 |
| [Agency Agents](https://github.com/MichengAI/dsh-agency-agents) | 按任务选择并召唤专业角色 |
| [BTW](https://github.com/MichengAI/dsh-btw) | 在当前上下文中临时旁问，不打断主任务 |
| [Simplify](https://github.com/MichengAI/dsh-simplify) | 用 /simplify 整理 Git 改动范围内的代码 |

桌面端介绍与下载站的源码见[官网仓库](https://github.com/MichengAI/dsh-codex-desktop-website)。

## 安装

下面提供 Agent 代装和手动安装两种方式，使用同一条安装命令。示例指定最新版和官方 npm 源。

### 让 Agent 帮你安装（推荐）

把下面这段话发给任意能够执行本机终端命令的 Agent。将 `web` 替换为实际使用的 profile；安装完成后，在 DSH 中使用本插件。

```text
请将 DSH 插件 @michengai/dsh-codex-ui 安装到本机 web profile，执行：dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/。安装后执行 dsh --profile web --dump-config，确认配置包含 codex-ui，并告诉我如何重新加载 DSH 和开始使用。
```

### 手动安装

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

安装后重启 DSH Web，并硬刷新浏览器（通常为 `Ctrl+Shift+R`）。看到新的侧栏后即可开始使用；卸载插件会恢复默认侧栏。

## 使用

打开 DSH Web 后，左侧导航即由本插件渲染。

| 目标 | 操作 |
| --- | --- |
| 新建会话 | 点击「新建任务」，或使用项目中的「+」/「新建会话」。 |
| 查找会话或设置 | 使用顶栏搜索，选择会话、设置页或快捷操作。 |
| 折叠侧栏 | 使用顶栏面板按钮。折叠后展开入口保留在窄轨顶部。 |
| 置顶项目 | 拖到「置顶」区域，或在项目菜单中选择「置顶项目」。 |
| 管理会话 | 打开会话菜单，进行重命名、置顶、未读、归档、派生、复制或删除。 |
| 复用输入 | 输入框为空时按上下方向键，召回当前工作区中之前提交的文本。 |
| 跳转轮次 | 使用当前会话左侧的轮次刻度跳转到对应提问。 |
| 查看连接器 | 打开「设置 → 连接器」。不会展示地址、命令或凭证。 |
| 查看配套插件 | 打开「设置 → 关于」，安装或更新各个配套插件。 |

## 常见问题

### 置顶和未读状态会保留吗？

置顶项目保存在 DSH 配置中，重启后仍保留。未读标记仅保存在当前浏览器，不会跨浏览器同步。

### 为什么找不到以前的输入？

输入历史按工作区分别保存在当前浏览器，每个工作区最多保留 200 条。它从功能启用后的新输入开始记录，不会从已有会话补录；浏览器存储不可用时，仅在内存中临时保留。无需额外安装 BTW 插件。

### 移除项目会删除本地文件吗？

删除项目注册不会删除项目目录或会话记录。归档会话的永久删除功能由配套的 Archive Manager 插件提供。

### 安装后没有看到变化怎么办？

确认安装命令中的 profile 与正在运行的 DSH Web 一致，再重启 DSH Web 并硬刷新浏览器。可运行 `dsh --profile web --dump-config` 检查是否已挂载 `codex-ui`。

## 开发与贡献

用户安装和日常使用无需阅读源码。开发者可从[项目交接入口](docs/00-交接入口/00-阅读导航.md)了解项目约定与当前状态。

### 从源码安装

适用于调试或使用未发布改动。克隆后的目录会直接作为插件安装路径：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location D:\Repository\deepseek-harness-plugin
git clone https://github.com/MichengAI/dsh-codex-ui.git
Set-Location .\dsh-codex-ui
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .
dsh --profile web --dump-config
```

完成后重启 DSH Web 并硬刷新浏览器。不要手工复制 `lib`；本地目录安装会同时读取包信息和 `cordis.patch.yml`。

- [src\index.ts](src/index.ts)：Host 入口，以及不含敏感信息的连接器目录接口。
- [src\client\index.ts](src/client/index.ts)：客户端入口，注册侧栏、工作区树、轮次导航和设置分区。
- [src\client\CodexSidebar.tsx](src/client/CodexSidebar.tsx)：侧栏壳、搜索面板和视觉样式。
- [src\client\CodexWorkspaceBrowser.tsx](src/client/CodexWorkspaceBrowser.tsx)：工作区和会话交互。
- `tests\*.assert.ts` 与 `tests\*.spec.ts`：交互、样式和运行时集成验证。

修改 `src` 后重新构建、测试，并以本地目录安装验证：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm build
pnpm test
dsh plugin --profile web add .
```

新增功能应复用已有 DSH 插槽和公开服务；不要依赖宿主私有 DOM 或写入会话数据。

## 许可证

本项目采用 [Apache License 2.0](LICENSE)。
