<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **Modern Interface Suite for DeepSeek Harness: Rapid Input Recall, Full-Screen Settings Skin, Native Physical Glass Themes, and Modular Sidebar**

  [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

  [Changelog](CHANGELOG.md) · [Apache-2.0](LICENSE)

  [![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
  [![npm package](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![npm downloads](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=npm%20downloads&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> **Notice**: DSH Codex UI is a community-maintained interface enhancement suite for DeepSeek Harness (DSH), not an official DeepSeek AI product.

---

## Why Codex UI 2.0?

When working across complex projects in DeepSeek Harness, users often encounter cramped settings modals, plain monocolor palettes, unstructured sidebars, and lost prompt history. **Codex UI 2.0 rearchitects the entire frontend experience through six decoupled sub-plugins and built-in companion management**, delivering a high-performance, non-intrusive, native-grade modern design:

* 🚀 **Instant Prompt Recall & Smart Prediction**: Intelligent inline input prediction (`Tab` to accept, `Alt+Down/Up` to cycle), terminal-style input history (`↑` / `↓` quick recall) with conversation- or workspace-scoped memory and adaptive width sizing;
* 🪟 **Full-Screen Dual-Island Settings**: Replaces cramped dialogs with Ambient Ground diffuse lighting canvas and dual floating island cards;
* 🎨 **Native Physical Glass Themes**: 14 built-in high-quality color schemes (featuring Codex, Claude, Dracula, Cyberpunk, Solarized, Gruvbox, and Catppuccin series), dual layout modes (Stock Flat vs. Mica Floating), 3-tier material presets, and ground glow switch;
* 🧭 **Modular Dynamic Sidebar**: In-place smooth accordion drawer and fluid drag-and-drop reordering; **100% aligned with host official 56px native rail** when collapsed, keeping all icons crisp and New Session permanently visible;
* 🧠 **Intelligent Session Titles**: Semantic understanding of initial user prompts, supporting 4096-token reasoning model contexts;
* 🌐 **Full Official Multilingual i18n Support**: Native localization across all 8 official DeepSeek Harness languages (`zh`, `en`, `ja`, `es`, `fr`, `de`, `ru`, `pt`) for starter suggestions, settings workbench, context menus, and session titles;
* 🖥️ **Desktop Native Menus**: Injects a clean Help menu into the official desktop app titlebar, supporting native page reload and reliable cross-platform app/Host restart;
* 📦 **Ecosystem Companion Hub**: Centralized inspection, version checking, and 1-click batch upgrades for all official and third-party companion plugins.

---

## Architectural Evolution: Why a Ground-Up Rewrite?

### 1. The Legacy 1.x Dilemma: Technical Debt of Forceful Component Overrides
In the early days of the DeepSeek Harness (DSH) plugin ecosystem, host frontend extension infrastructure was still nascent: fine-grained Slots registries were absent, official headless primitive libraries were unavailable, and plugin lifecycle hooks were sparse. To deliver a sleek, Codex-style immersive experience rapidly, **legacy 1.x had to rely heavily on invasive component overriding**: forcefully hijacking host DOM elements, injecting high-specificity CSS stylesheets, and hardcoding global CSS variables.

**The Inevitable Maintenance Bottleneck**: As official DSH iterated rapidly (introducing `profile` multi-environment isolation, `shortcuts` service gating, standard Slots registries, and the official primitive suite `@deepseek-ai/dsh-client-ui-primitives`), the technical debt of "forceful overrides" escalated dramatically:
* 💥 **Extremely Brittle Compatibility**: Any subtle DOM change or build-hash class update in upstream DSH would instantly break CSS overrides or cause full-page rendering crashes, stalling updates;
* 🎨 **Style Bleed & Half-Degradation Trap**: Injected global CSS tokens lacked clean lifecycle boundaries. Toggling off a theme failed to purge root attributes, resulting in awkward "half-degraded" states where glass effects vanished but hardcoded dark backgrounds lingered;
* 🧩 **Broken Lifecycles & Zombie Settings**: When a sub-feature was disabled, overridden views could not cleanly fall back to host native interfaces, leaving inert, non-functional configuration controls stuck in the settings modal.

### 2. The 2.0.0 Rearchitecture Decision: Fully Embracing Host Natives
Faced with these compounding challenges, we made the decisive choice in v2.0.0 to **completely scrap all 1.x component override code** and establish a new baseline: **zero-intrusion, micro-kernel decoupling, and native-first engineering**:
* 🏛️ **Strict Adoption of Official Primitives & Slots**: Prohibited custom hand-drawn CSS widgets; strictly leveraged official `Switch`, `SegmentedControl`, and `Button` primitives. When collapsed, the sidebar strictly aligns with the official 56px native icon rail;
* 🧩 **Six Decoupled Micro-Kernel Sub-Plugins**: Broken down into 6 self-contained, high-cohesion sub-plugins and built-in modules with explicit boundaries, enabling independent lifecycle management and streamlined code audits;
* 🛡️ **Fail-Closed Circuit Breaker & Adaptive UI**: Implemented strict fail-closed safety contracts. When a sub-plugin is disabled or unreachable, the runtime physically cleanses all injected tokens/root attributes, while the settings UI **completely hides the defunct card (0 DOM nodes)**, reverting instantly to pristine host defaults without visual clutter;
* 🔒 **Authoritative Profile Isolation & Self-Healing**: Unambiguous Profile directory resolution eliminates cross-profile contamination, backed by window-focus self-healing probes for resilient network handling;
* 🎨 **Authentic Codex Tech Aesthetic**: Purged legacy green color pollution, strictly adhering to `#339cff` tech-blue, minimalist paper, and charcoal dark tones with dual layout modes and ambient ground reflection glows.

---

## Architecture: 6 Core Sub-Plugins & Built-in Modules

| Sub-Plugin ID | Name | Capabilities |
| :--- | :--- | :--- |
| `composer` | **Composer Enhancement** | Smart inline input prediction (`Tab` to accept, `Alt+Down/Up` to cycle), terminal-style input history (`↑`/`↓`), conversation- or workspace-scoped storage, dual drag-resize handles, and contextual prompt hints. |
| `settings-skin` | **Native Settings Skin** | Full-screen workbench layout, dual floating island system, Ambient Ground lighting canvas, and native search. |
| `theme` | **Theme & Glassmorphism** | 14 built-in themes with Appearance Cubes, Stock Flat vs. Mica Floating modes, 3 material presets, and ground glow switch. |
| `sidebar` | **Modular Sidebar** | Workspace sections (including direct "Add workspace" buttons on section headers, auto-shown when host directory-picking is available, placing new workspaces straight into the section), in-place accordion expansion, smooth drag-and-drop reordering, and right-click “mark as unread / read” for sessions; collapses cleanly into host native 56px icon rail. |
| `session-title` | **Intelligent Session Title** | Generates standardized session titles from initial prompt semantics, handling reasoning model outputs up to 4096 tokens. |
| `desktop-menu` | **Desktop Native Menus** | Official desktop app titlebar menu integration with instant view reload and reliable cross-platform app/Host restart. |
| `dependencies` | **Companion Management (Built-in)** | Centralized dashboard for official/third-party DSH companion plugins with live npm download counts and 1-click updates. |

---

## Live Screenshots

> *All screenshots are captured directly from live DeepSeek Harness Web runtime environments using `ego-browser`.*

### 1. Immersive Workspace & Composer (Dark Mode)
Codex Dark palette with centered hero actions, prompt cards, and bottom composer with adaptive resize handles and `↑↓` history hints.

![Dark Mode Conversation & Composer](assets/screenshots/conversation.png)

---

### 2. Paper Minimalist Workspace (Light Mode)
Codex Light palette powered by Ambient Ground diffuse lighting gradient, delivering organic warmth and eye comfort.

![Light Mode Ambient Ground Workspace](assets/screenshots/conversation-light.png)

---

### 3. Full-Screen Dual-Island Settings (Modular Card System)
Spacious settings workbench organized into a modular card system (Feature Overview, Theme & Glassmorphism, and Companion Plugins), dynamically adapting based on active sub-components.

![Full-Screen Settings Workbench](assets/screenshots/settings-about.png)

---

### 4. Theme Customization & Glassmorphism
14 built-in high-quality theme palettes and 1 official default option (covering Codex, Claude, Dracula, Cyberpunk, Solarized, Gruvbox, and Catppuccin series). Supports both Stock Flat and Mica Floating layout modes, 3-tier material presets (Clear, Standard, Frosted), and ground reflection toggle. Built on pure Design Token dynamic injection with clean lifecycle destruction, eliminating global style contamination.

#### Built-in Themes & Color Schemes

| Series | Theme Name | ID | Mode | Visual Style | Core Palette (Accent / Base BG / Text) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Official** | **Official Default** | `stock` | Auto | System default | Accent: ![](https://img.shields.io/badge/-%233b82f6-3b82f6) `#3b82f6` (Follows host system light/dark, zero custom tokens) |
| **Codex** | **Codex Dark** | `codex-dark` | Dark | Immersive carbon dark | Accent: ![](https://img.shields.io/badge/-%23339cff-339cff) `#339cff` · BG: ![](https://img.shields.io/badge/-%2309090b-09090b) `#09090b` · Text: ![](https://img.shields.io/badge/-%23fafafa-fafafa) `#fafafa` |
|  | **Codex Light** | `codex-light` | Light | Clean paper light | Accent: ![](https://img.shields.io/badge/-%230169cc-0169cc) `#0169cc` · BG: ![](https://img.shields.io/badge/-%23ffffff-ffffff) `#ffffff` · Text: ![](https://img.shields.io/badge/-%2318181b-18181b) `#18181b` |
| **Claude** | **Claude Dark** | `claude-dark` | Dark | Warm dark & terracotta | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23141414-141414) `#141414` · Text: ![](https://img.shields.io/badge/-%23fdfdfd-fdfdfd) `#fdfdfd` |
|  | **Claude Light** | `claude-light` | Light | Warm paper & terracotta | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23faf9f5-faf9f5) `#faf9f5` · Text: ![](https://img.shields.io/badge/-%231f1e1d-1f1e1d) `#1f1e1d` |
| **Dracula** | **Dracula** | `dracula` | Dark | Vampire pink & cyber glow | Accent: ![](https://img.shields.io/badge/-%23ff79c6-ff79c6) `#ff79c6` · BG: ![](https://img.shields.io/badge/-%23191a21-191a21) `#191a21` · Text: ![](https://img.shields.io/badge/-%23f8f8f2-f8f8f2) `#f8f8f2` |
| **Cyberpunk** | **Cyberpunk** | `cyberpunk` | Dark | Neon green on black · matrix terminal | Accent: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` · BG: ![](https://img.shields.io/badge/-%23000a00-000a00) `#000a00` · Text: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` |
| **Solarized** | **Solarized Dark** | `solarized-dark` | Dark | Deep teal & cyan | Accent: ![](https://img.shields.io/badge/-%232aa198-2aa198) `#2aa198` · BG: ![](https://img.shields.io/badge/-%23002b36-002b36) `#002b36` · Text: ![](https://img.shields.io/badge/-%2393a1a1-93a1a1) `#93a1a1` |
|  | **Solarized Light** | `solarized-light` | Light | Warm parchment & blue | Accent: ![](https://img.shields.io/badge/-%23268bd2-268bd2) `#268bd2` · BG: ![](https://img.shields.io/badge/-%23fdf6e3-fdf6e3) `#fdf6e3` · Text: ![](https://img.shields.io/badge/-%23586e75-586e75) `#586e75` |
| **Gruvbox** | **Gruvbox Dark** | `gruvbox-dark` | Dark | Retro dark & warm gold | Accent: ![](https://img.shields.io/badge/-%23fabd2f-fabd2f) `#fabd2f` · BG: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` · Text: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` |
|  | **Gruvbox Light** | `gruvbox-light` | Light | Vintage kraft & warm amber | Accent: ![](https://img.shields.io/badge/-%23b57614-b57614) `#b57614` · BG: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` · Text: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` |
| **Catppuccin** | **Mocha** | `catppuccin-mocha` | Dark | Mocha dark & soothing | Accent: ![](https://img.shields.io/badge/-%23cba6f7-cba6f7) `#cba6f7` · BG: ![](https://img.shields.io/badge/-%2311111b-11111b) `#11111b` · Text: ![](https://img.shields.io/badge/-%23cdd6f4-cdd6f4) `#cdd6f4` |
|  | **Macchiato** | `catppuccin-macchiato` | Dark | Macchiato soft tone | Accent: ![](https://img.shields.io/badge/-%23c6a0f6-c6a0f6) `#c6a0f6` · BG: ![](https://img.shields.io/badge/-%23181926-181926) `#181926` · Text: ![](https://img.shields.io/badge/-%23cad3f5-cad3f5) `#cad3f5` |
|  | **Frappé** | `catppuccin-frappe` | Dark | Frappé cool mist | Accent: ![](https://img.shields.io/badge/-%23ca9ee6-ca9ee6) `#ca9ee6` · BG: ![](https://img.shields.io/badge/-%23232634-232634) `#232634` · Text: ![](https://img.shields.io/badge/-%23c6d0f5-c6d0f5) `#c6d0f5` |
|  | **Latte** | `catppuccin-latte` | Light | Latte warm light | Accent: ![](https://img.shields.io/badge/-%238839ef-8839ef) `#8839ef` · BG: ![](https://img.shields.io/badge/-%23eff1f5-eff1f5) `#eff1f5` · Text: ![](https://img.shields.io/badge/-%234c4f69-4c4f69) `#4c4f69` |

---

### 5. Modular Sidebar Navigation (Expanded)
Reorderable navigation entries, in-place accordion drawer for tools (IM Assistant, Cron, Archive, Experts), and quick-action pinned rows.

![Modular Expanded Sidebar](assets/screenshots/sidebar.png)

---

### 6. Official Native 56px Rail (Collapsed)
Collapses seamlessly into the host official 56px compact activity rail. All plugin icons remain centered and accessible, with New Session prominently highlighted.

![Official Native 56px Collapsed Rail](assets/screenshots/sidebar-collapsed.png)

---

### 7. Enhanced Session Menu
Quick actions directly on session rows: Pin, Rename, Unread marker, Archive, Fork, and Safe Deletion.

![Enhanced Session Menu](assets/screenshots/session-menu.png)

---

## Host Compatibility

* **Supported Generations**: Full DeepSeek Harness `0.2.x` line (`>=0.2.0-rc.1 <0.3.0-0`);
* **Verified Builds**: Supports every `0.2.x` RC (`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`–`0.2.1-rc.5`, `0.2.2-rc.1`, `0.2.2-rc.2`, and `0.2.2-rc.2`); intermediate alphas are not part of the support matrix;
* **Runtime Requirements**: Node.js `^22.19.0 || >=24.0.0`, pnpm `^11.0.0`.

> ⚠️ **Notice**: Do not enable Codex UI and `ds-bot` concurrently. Both redesign sidebar and session slots with overlapping layout mechanics. Disable or uninstall one before enabling the other.

---

## Installation & Getting Started

### Option A: Agent-Assisted Installation (Recommended)

Copy and send this prompt to any agent capable of executing terminal commands (replace `web` with your target profile):

```text
Please install the DSH plugin @michengai/dsh-codex-ui into my local web profile by running:
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
Then run dsh --profile web --dump-config to verify codex-ui is active and remind me to refresh my browser.
```

### Option B: Manual Installation

Execute in PowerShell or MSYS Bash:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

Once installed, restart your DSH Web instance and hard-refresh your browser (`Ctrl + Shift + R` or `Cmd + Shift + R`).

---

## Quick Reference

| Feature | How to Use |
| :--- | :--- |
| **Accept Input Prediction** | Press `Tab` when predictive ghost text appears behind the caret; press `Alt + Down` / `Alt + Up` to cycle recommendations, or `Escape` to dismiss. |
| **Configure Prediction Mode** | Go to **Settings → Codex UI** and select your prediction mode (Off, Continue Only, Guess & Continue) in the "Composer Enhancements" card. Can also be locked off wholesale across a profile by setting `config.prediction: false` in `cordis.patch.yml`. |
| **Recall Input History** | Press `↑` / `↓` in an empty composer to cycle through past inputs from the current conversation — or the whole workspace, switchable in Settings (up to 200 items per scope). |
| **Change History Scope** | In the same "Composer Enhancements" card, choose "History scope": "This conversation" (default) recalls only inputs from the current conversation; "Workspace" shares inputs with every conversation in the same working directory and makes previously stored workspace history visible again (retained up to the latest 100 scopes before eviction). |
| **Resize Composer Width** | Hover over either lateral border of the composer and drag the blue handles. |
| **Switch Themes & Blur** | Navigate to **Settings → Codex UI**, choose from 14 palettes, and toggle Stock/Mica or blur presets. |
| **Reorder Sidebar Items** | Drag any item vertically; blue indicators guide drop positions into or out of the More drawer. |
| **Add Workspace from Section** | Hover or focus any section header (Pinned, Projects, or custom) and click the **Add workspace** icon beside `···` (shown when host directory-picking is available); the new workspace is placed into that section and expanded automatically. |
| **Collapse Sidebar** | Click the collapse button on top of the sidebar to switch to the official 56px native icon rail. |
| **Batch Upgrade Plugins** | In **Settings → Codex UI**, click **Update All** on the Companion Plugins card. |

---

## Ecosystem Matrix

Pair Codex UI with the first-party companion plugins for an integrated development workflow:

| Plugin | Purpose |
| :--- | :--- |
| [Codex UI](https://github.com/MichengAI/dsh-codex-ui) | **UI Core**: Rapid recall, settings skin, physical glass, and modular sidebar |
| [Agency Agents](https://github.com/MichengAI/dsh-agency-agents) | **Specialist Matrix**: Summon and dispatch specialized agent profiles |
| [Skills Manager](https://github.com/MichengAI/dsh-skills-manager) | **Skills Hub**: Discover, import, enable, and configure local agent skills |
| [Archive Manager](https://github.com/MichengAI/dsh-archive-manager) | **Archive Vault**: Deep search, restore, and prune historical sessions |
| [IM Connect](https://github.com/MichengAI/dsh-im-connect) | **Bridge**: Connect WeChat, DingTalk, Feishu, and QQBot |
| [Automation](https://github.com/MichengAI/dsh-automation) | **Scheduler**: Cron-based workflows and run evidence auditing |
| [Code Review](https://github.com/MichengAI/dsh-code-review) | **Reviewer**: `/review` dispatches subagents to audit code in-thread |
| [Simplify](https://github.com/MichengAI/dsh-simplify) | **Refactor**: `/simplify` concurrent 4-agent code cleanup |
| [PUA](https://github.com/MichengAI/dsh-pua) | **Resilience**: Failure recovery, hypothesis switching, and evidence verification |
| [BTW](https://github.com/MichengAI/dsh-btw) | **Side-Questions**: Ephemeral context inquiries without disrupting main tasks |
| [Codex Pet](https://github.com/MichengAI/dsh-codex-pet) | **Companion**: Desktop interactive pet for approvals and notifications |

---

## License

Distributed and licensed under the [Apache License 2.0](LICENSE).\n