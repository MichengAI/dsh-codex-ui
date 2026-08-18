<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI

  **Rebuild the DeepSeek Harness Web sidebar, workspace tree, search, and turn navigation in a Codex-style layout**

  [简体中文](README.zh-CN.md) · [Apache-2.0](LICENSE)

  [![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
  [![npm package](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> DSH Codex UI is a community-maintained DeepSeek Harness (DSH) plugin, not an official DeepSeek AI product. It uses public DSH slots only and does not modify host source code or conversation data.

## Features

- Replace the default sidebar through the official `sidebar` slot and keep `sidebar.workspaces`, `sidebar.settings`, and `sidebar.footer.action`.
- Provide a Codex-style header with brand wordmark, sidebar collapse, and global search.
- List workspaces and conversations with expand/collapse, drag reorder, project pinning, unread dots, and running-state indicators.
- Add project and conversation menus for rename, pin, unread, archive, fork, open folder, copy, and delete.
- Restyle the conversation column and composer card, and add a compact turn navigator on the current session.
- Show companion-plugin status in **Settings → About**, and install the missing pieces from npm.

## Screenshots

Light theme: Codex-style sidebar, workspace tree, and conversation column.

![Light theme conversation](assets/screenshots/conversation-light.png)

Dark theme: the same layout with Codex dark tokens.

![Dark theme conversation](assets/screenshots/conversation.png)

Conversation menu: rename, pin, unread, archive, fork, copy, and delete.

![Conversation menu](assets/screenshots/session-menu.png)

**Settings → About** lists the companion plugins and their install state.

![About page and companion plugins](assets/screenshots/settings-about.png)

## Prerequisites

- A working DeepSeek Harness Web installation with `dsh` available in PowerShell.
- Examples use the `web` profile; replace it with the target profile.
- Source installation and development require Node.js 22+ and pnpm. Installing from npm does not require running `pnpm install` in an arbitrary directory.

## Plugin combo

`@michengai/dsh-codex-suite` is the one-click combo. It installs these six plugins into the same profile:

| Plugin | npm package | Role |
| --- | --- | --- |
| Codex UI | `@michengai/dsh-codex-ui` | Codex-style sidebar, workspace tree, search, and turn navigation |
| Expert management | `@michengai/dsh-agency-agents` | Settings page opened from **Experts** |
| Skill management | `@michengai/dsh-skills-manager` | Settings page opened from **Skills** |
| Archive management | `@michengai/dsh-archive-manager` | Permanent deletion and archived-session management |
| IM Assistant | `@michengai/dsh-im-connect` | IM settings and the **Channels** tab |
| Scheduled tasks | `@michengai/dsh-automation` | Scheduled-task settings and the **Schedule** tab |

`dshmarket` stays optional. When it is installed, **Plugins** opens the market first.

Do not install the suite and the individual plugins in the same profile. The two patch sets conflict.

## Installation

`dsh plugin add` forwards to `pnpm add` in the profile directory. Without a version and official registry, a local mirror or minimum-release-age policy can leave you on an older build.

### Ask another agent to install the suite

Copy one of the sentences below into DSH, Codex, or WorkBuddy and let that agent install the combo into your local `web` profile.

From npm:

```text
Install the latest DSH plugin suite @michengai/dsh-codex-suite into my local web profile using the official npm registry: dsh plugin --profile web add @michengai/dsh-codex-suite@latest --registry=https://registry.npmjs.org/. Then run dsh --profile web --dump-config, confirm codex-ui, agency-agents, skills-manager, archive-manager, im-connect, and dsh-automation are mounted, and remind me to restart DSH Web and hard-refresh the browser.
```

UI only:

```text
Install the latest DSH plugin @michengai/dsh-codex-ui into my local web profile using the official npm registry: dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/. Then run dsh --profile web --dump-config, confirm codex-ui is mounted, and remind me to restart DSH Web and hard-refresh the browser.
```

| Product | How to use it |
| --- | --- |
| DSH | Send one of the sentences above to the current session. |
| Codex | Send one of the sentences above to Codex and let it install locally. |
| WorkBuddy | Send one of the sentences above to WorkBuddy. |

If `dsh` is not on PATH, replace the leading `dsh` with `npx --yes @deepseek-ai/dsh`.

### Install the complete suite

This is the one-click combo. Run it from any PowerShell directory:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-suite@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

To pin a release, replace `@latest` with a version such as `@0.1.0`.

Restart DSH Web and hard-refresh the browser. If the profile already has any of the six plugins installed individually, uninstall those plugins first.

### Install Codex UI only

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

The plugin takes over the default sidebar through `cordis.patch.yml`. Uninstalling restores the default sidebar.

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
| Check companion plugins | Open **Settings → About** to install or update the combo plugins. |

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
- The Connectors directory never exposes addresses, commands, or credentials.

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

## License

This project is licensed under [Apache License 2.0](LICENSE). Conversation-management workflow is informed by [Semidia/dsh-session-manager](https://github.com/Semidia/dsh-session-manager), but this plugin is implemented independently through public DSH slots and services.
