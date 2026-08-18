<p align="center">
  <img src="assets/icon.png" alt="DSH Codex UI" width="96">
</p>

<h1 align="center">DSH Codex UI</h1>

<p align="center">
  <strong>A DeepSeek Harness Web plugin that rebuilds the sidebar, workspace tree, search, and turn navigation in a Codex-style layout.</strong>
</p>

<p align="center">
  <a href="https://github.com/MichengAI/dsh-codex-ui/issues">Report an issue</a>
  · <a href="https://www.npmjs.com/package/@michengai/dsh-codex-ui">View on npm</a>
  · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="Apache License 2.0"></a>
  <a href="https://www.npmjs.com/package/@michengai/dsh-codex-ui"><img src="https://img.shields.io/npm/v/%40michengai/dsh-codex-ui?label=npm" alt="npm package"></a>
  <img src="https://img.shields.io/badge/DSH-Web%20Plugin-10b981" alt="DSH Web Plugin">
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A522-339933?logo=nodedotjs&logoColor=white" alt="Node.js 22 or later">
</p>

> DSH Codex UI is a community-maintained plugin, not an official DeepSeek AI product. It uses public DSH slots only and does not modify host source code or conversation data.

## Features

- Replaces the default sidebar through the official `sidebar` slot and keeps `sidebar.workspaces`, `sidebar.settings`, and `sidebar.footer.action`.
- Provides a Codex-style header with brand wordmark, sidebar collapse, and global search.
- Lists workspaces and conversations with expand/collapse, drag reorder, project pinning, unread dots, and running-state indicators.
- Adds project and conversation menus for rename, pin, unread, archive, fork, open folder, copy, and delete.
- Restyles the conversation column and composer card, and adds a compact turn navigator on the current session.
- Adds Settings sections for Connectors and About, including companion-plugin install status.

![Codex-style sidebar and empty conversation](assets/screenshots/sidebar.png)

## Prerequisites

- A working DeepSeek Harness Web installation with `dsh` available in PowerShell.
- Examples use the `web` profile; replace it with the target profile.
- Source installation and development require Node.js 22+ and pnpm. Installing from npm does not require running `pnpm install` in an arbitrary directory.

## Installation

### Install from npm

Run this from any PowerShell directory. Install into the DSH profile through `dsh plugin`:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui
dsh --profile web --dump-config
```

Restart DSH Web and hard-refresh the browser. The plugin takes over the default sidebar through `cordis.patch.yml`; uninstalling restores the default sidebar. If a package mirror is behind, append `--registry=https://registry.npmjs.org/`.

### Install the complete suite

To install Codex UI together with the experts, skills, and archived-session managers after `@michengai/dsh-codex-suite` is published:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-suite
dsh --profile web --dump-config
```

Individual and aggregate installation are mutually exclusive. Do not install both in the same profile. Remove the four individually installed plugins before switching to the suite.

### Install from source

Use this for debugging or unpublished changes. The cloned directory becomes the plugin source path:

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

Restart DSH Web and hard-refresh the browser. Do not copy `dist` manually; local installation reads both package metadata and `cordis.patch.yml`.

## Usage

Open DSH Web. The left navigation is rendered by this plugin.

| Goal | Action |
| --- | --- |
| Start a conversation | Select **New task**, or use a workspace **+** / **New conversation** action. |
| Find a conversation or setting | Use the header search field and choose a session, Settings page, or quick action. |
| Collapse the sidebar | Use the header panel button. The expand control stays on the collapsed rail. |
| Pin a workspace | Drag it into **Pinned**, or use **Pin project** in the project menu. |
| Manage a conversation | Open the conversation menu to rename, pin, mark unread, archive, fork, copy, or delete. |
| Jump between turns | Use the turn marks on the left of the current conversation. |
| Inspect connectors | Open **Settings → Connectors**. Addresses, commands, and credentials are never shown. |
| Check companion plugins | Open **Settings → About** to see expert, skill, and archive plugin status. |

![Conversation menu](assets/screenshots/session-menu.png)

![Workspace menu](assets/screenshots/workspace-menu.png)

![Conversation view and turn navigator](assets/screenshots/conversation.png)

![About page and companion plugins](assets/screenshots/settings-about.png)

Deleting a workspace registration does not delete its folder or conversation records. Pinned and unread state is stored only in the current browser.

## Persistence and safety limits

| Data | Storage | Scope |
| --- | --- | --- |
| Pinned workspaces | `localStorage` key `dsh-codex-ui.pinned-workspace-ids` | Current browser only |
| Pinned conversations | `localStorage` key `dsh.session-pins.v1` | Current browser only |
| Unread conversations | `localStorage` key `dsh.session-unread.v1` | Current browser only |
| Conversation records | DSH host services | Unchanged by this plugin |

- The plugin uses only public DSH slots and services.
- It does not modify host source code or the conversation data model.
- Permanent deletion of archived conversations is provided by `@michengai/dsh-archive-manager`.
- Expert and skill management are optional peer plugins.
- The Connectors directory never exposes addresses, commands, or credentials.

## Companion plugins

| Plugin | npm package | Role |
| --- | --- | --- |
| Expert management | `@michengai/dsh-agency-agents` | Settings page opened from **Experts** |
| Skill management | `@michengai/dsh-skills-manager` | Settings page opened from **Skills** |
| Archive management | `@michengai/dsh-archive-manager` | Permanent deletion and archived-session management |
| IM Assistant | `@michengai/dsh-im-connect` | Settings page opened from **IM Assistant** |
| Scheduled tasks | `@michengai/dsh-automation` | Settings page opened from **Scheduled tasks** |
| Plugin Market | `dshmarket` | When installed, the **Plugins** entry opens the market first |
| Suite | `@michengai/dsh-codex-suite` | Installs Codex UI and companion management plugins |

## Secondary development

- [src\index.ts](src/index.ts): host entry and the non-sensitive Connectors directory endpoint.
- [src\client\index.ts](src/client/index.ts): client entry for sidebar, workspace tree, turn navigation, and Settings sections.
- [src\client\CodexSidebar.tsx](src/client/CodexSidebar.tsx): sidebar shell, search panel, and visual styles.
- [src\client\CodexWorkspaceBrowser.tsx](src/client/CodexWorkspaceBrowser.tsx): workspace and conversation interactions.
- `tests\*.assert.ts` and `tests\*.spec.ts`: interaction, visual, and runtime integration checks.

After changing `src`, rebuild, test, and install from the local directory:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm build
pnpm test
dsh plugin --profile web add .
```

New features should reuse existing DSH slots and public services. Do not depend on private host DOM or write conversation records.

## Verification

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
pnpm build
pnpm test
```

## Documentation and license

Start from the [handoff index](docs/00-交接入口/00-阅读导航.md) for project status, architecture, and iteration notes.

This project is licensed under [Apache License 2.0](LICENSE). Conversation-management workflow is informed by [Semidia/dsh-session-manager](https://github.com/Semidia/dsh-session-manager), but this plugin is implemented independently through public DSH slots and services.
