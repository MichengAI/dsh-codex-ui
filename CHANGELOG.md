# Changelog

[简体中文](CHANGELOG.zh-CN.md)

This changelog records recent releases of DSH Codex UI and its one-click installer. Earlier changes remain available in the [Git history](https://github.com/MichengAI/dsh-codex-ui/commits/main).

## 0.2.99 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.16`.

### Fixed

- Restored full rendering for user question bubbles in the main conversation body so long prompts are not hidden by overflow, max-height, or multi-line clamp rules.
- Kept the official DSH user bubble DOM intact while applying a stable compatibility marker to newly mounted user bubbles.

### Dependencies

- The Suite Installer release workflow will resolve Codex UI `0.2.99` after this release is published.

## 0.2.98 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.15`.

### Fixed

- Kept the segmented conversation-tab slider aligned with the host-selected view by recognizing the tab list itself as a synchronization root, preventing the highlight from remaining on Chat after selecting Trace or Context.

### Dependencies

- Prepared Suite Installer `0.1.15` to resolve Codex UI `0.2.98` after this release is published.

## 0.2.97 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.14`.

### Compatibility

- Adopted the official DSH alpha turn navigator while preserving the legacy navigator on older runtimes, with runtime capability gating and resilient left-side mirroring that no longer depends on private stylesheet names or host DOM nesting.
- Preserved upstream conversation width dragging, adaptive transcript sizing, and turn navigation while retaining the Codex composer treatment.

### Fixed

- Reworked About-page companion installs with live pnpm progress, accurate Profile mount verification, bulk installation of missing or outdated plugins, stale junction cleanup, and correct Desktop versus standalone Web restart guidance.
- Hardened pnpm discovery for GUI environments without trusting unrelated package-manager entry points or leaking the inferred entry into later child processes.
- Added strict progress payload validation and extended slow Desktop bundle reconciliation tolerance.
- Filtered and frame-coalesced navigator DOM observation so streaming responses do not trigger repeated document-wide scans.

### Dependencies

- Prepared Suite Installer `0.1.14` to resolve the latest exact companion versions after this release is published.

## 0.2.96 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.13`.

### Fixed

- Opened About immediately when the IM companion is not installed instead of showing General settings while waiting for a missing section to time out; the installed IM settings route is unchanged.
- Predeclared the nonessential `protobufjs` and `koffi` install scripts as disabled before About-page plugin installs, preventing pnpm's ignored-build placeholder from blocking an otherwise safe install.

### Dependencies

- Refreshed the Suite Installer against the latest exact member versions from the official npm registry at release time.

## 0.2.95 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.12`.

### Fixed

- Matched the sidebar background to the Host workspace background in both light and dark themes.
- Replaced the clipped white-tile WeCom channel icon with a compact multicolor brand mark that remains legible at sidebar size.

## 0.2.94 — 2026-08-30

Companion release: `@michengai/dsh-codex-suite-installer@0.1.11`.

### Safety

- Completed symmetric validation of the public Desktop services: if either `desktopProfiles` or `desktopPnpm` is exposed without the other, dependency management now fails safely instead of falling back to an ambient CLI that could mutate another profile.

## 0.2.93 — 2026-08-30

### Compatibility

- Resolved the active DSH Desktop profile through the public `desktopProfiles` service and delegated installs and updates to the public `desktopPnpm` package manager instead of hard-coding the `web` profile.
- Preserved the ordinary Web/CLI profile fallback while recognizing Desktop-provided runtime and companion-package state across restarts.
- Routed new-session actions through Archive Manager's optional `uiWorkspace.startSession()` service, with the standard workspace service retained as the fallback.

### Safety

- Removed the dependency on the launcher-private `desktopPnpmBootstrap` implementation detail.
- Failed safely when a Desktop generation exposes incomplete public services instead of falling back to an ambient CLI that could mutate another profile.
- Reported the running Desktop DSH runtime as installed without fabricating a version or update when the Host exposes no supported runtime path.

## 0.2.92 — 2026-08-28

Companion release: `@michengai/dsh-codex-suite-installer@0.1.9`.

### Security

- Updated the legacy Suite and its installer manifest to `@michengai/dsh-im-connect@0.1.26`.
- Pinned the workspace dependency graph to the compatible patched `ansi-regex@5.0.1`, resolving CVE-2021-3807 in both the Suite and test dependency paths.

## 0.2.91 — 2026-08-28

### Release process

- Replaced manual npm publication with tag-triggered GitHub Actions npm Trusted Publishing (OIDC).
- Added a full-test and tag/package-version gate before `npm publish`; npm credentials are no longer stored in the repository or Actions secrets.

## 0.2.90 — 2026-08-27

Companion release: `@michengai/dsh-codex-suite-installer@0.1.7`.

### Changed

- Matched the expandable sidebar to the installed Codex desktop client: 275px default width, 240px minimum, and 520px maximum, capped by available viewport width.
- Mapped the DSH host's narrower persisted drag range to the Codex visual range while preserving the 275px default anchor.

### Fixed

- Replaced the previous coordinate-based collapse gesture with Codex behavior: dragging below 240px collapses the sidebar.
- Prevented the DOM width adapter from reapplying its own mapped output during host drag and rerender cycles.

## 0.2.89 — 2026-08-27

Companion release: `@michengai/dsh-codex-suite-installer@0.1.6`.

### Added

- Persisted workspace, channel, and scheduled-task folder expansion independently across refreshes with versioned, failure-safe browser storage.
- Added scheduled-task list/overview switching, direct task-settings navigation, and group archive actions.
- Added Node.js 22/24 CI for pushes and pull requests, and made the tag Release workflow run the full test suite before creating a release.

### Fixed

- Stopped classifying ordinary conversations as scheduled tasks from an editable timestamp-shaped title; automation ownership now requires the stable session ID prefix.
- Made group archive continue after individual failures, clean local pin/unread state only for successful items, and leave failures selected for retry.
- Validated scheduled-task settings requests at runtime, guarded browser storage access, and extended lazy Settings navigation to four seconds.
- Restricted the Windows Explorer Host endpoint to exact registered workspace roots, rejecting drive roots, UNC paths, relative paths, children, and unrelated absolute paths.
- Reduced compatibility observer work by filtering unrelated conversation, permission, and Settings DOM mutations before scheduling scans.

### Release process

- Aligned the root package, lightweight installer, private legacy Suite snapshot, member pins, and version-contract assertions; the aggregate Suite remains retired.
- Corrected the installer command and executable name in local-verification help and READMEs, and added a build contract for the client bundle's static runtime modules.
- Tracked and refreshed the current handoff documentation under `docs/00-交接入口/` while leaving historical documentation ignored.
- Hardened the Windows installer against shell metacharacters in `DSH_BIN`.

## 0.2.88 — 2026-08-26

Companion release: `@michengai/dsh-codex-suite-installer@0.1.5`.

### Changed

- Replaced the lightweight **Settings → Connectors** tool list with the complete `dsh-mcp-connector` marketplace and connection manager whenever that optional external plugin is installed.
- Kept the existing **Connectors** home/sidebar action as the single entry point and suppressed the external plugin's separate launcher in both expanded and compact Codex sidebar layouts.
- Preserved the original current-session MCP tool directory as an automatic fallback when `dsh-mcp-connector` is absent or its Web UI is unavailable.

### Compatibility

- Added a same-origin, source-validated Prompt bridge that creates or reuses a workspace session and places the selected marketplace Prompt into its draft.
- Synchronized the embedded marketplace with the DSH-selected light or dark theme without modifying the externally maintained plugin or making it a required dependency.
- Updated the lightweight installer to pin Codex UI `0.2.88`; the legacy aggregate Suite remains private and unpublished.

Published packages: [`@michengai/dsh-codex-ui@0.2.88`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.88) and [`@michengai/dsh-codex-suite-installer@0.1.5`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.5).

## 0.2.87 — 2026-08-26

Companion release: `@michengai/dsh-codex-suite-installer@0.1.4`.

### Fixed

- Restored Chinese labels for the built-in permission presets in Settings and Chat with an exact-match compatibility adapter that leaves custom presets, prose, icons, and Host menu layout untouched.
- Made **Open in File Explorer** bypass in-app file previews, close its menu immediately, and open Windows Explorer in the foreground and maximized.
- Restyled conversation and workspace rename fields to match the native settings form, including helper copy, accessible labels, and a visible focus state.
- Kept the Codex UI **About** section at the bottom of Settings even when third-party plugins add later sections.

### Compatibility

- Updated the lightweight installer to pin Codex UI `0.2.87`, IM Connect `0.1.24`, and Automation `0.1.15`; the legacy aggregate Suite remains private and unpublished.

Published packages: [`@michengai/dsh-codex-ui@0.2.87`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.87) and [`@michengai/dsh-codex-suite-installer@0.1.4`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.4).

## 0.2.86 — 2026-08-25

Companion release: `@michengai/dsh-codex-suite-installer@0.1.3`.

### Changed

- Reworked **Conversation / Trajectory / Context** into a compact three-part segmented control while preserving the Host-managed tab DOM and behavior.
- Replaced the wide **Session log** capsule with an accessible 28 px download icon that retains its original text for assistive technology.
- Removed the conversation-header divider and placed all controls in a compact 34 px band with symmetric 3 px spacing.

### Compatibility

- Aligned the 28 px mode and utility controls with `DSH-better-sidebar` in both expanded and collapsed layouts without moving the external plugin's persistent buttons.
- Added regression coverage for stable DOM ownership, exact border-box sizing, accessible labels, and header spacing.
- Updated the lightweight installer to pin Codex UI `0.2.86`; the legacy aggregate Suite remains private and is not released.

Published packages: [`@michengai/dsh-codex-ui@0.2.86`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.86) and [`@michengai/dsh-codex-suite-installer@0.1.3`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.3).

## 0.2.85 — 2026-08-25

Companion release: `@michengai/dsh-codex-suite-installer@0.1.2`.

### Changed

- Removed the poorly performing `dsh-find-plugin` integration from **Settings → About → Companion management plugins**, including its status, install, and update entry points.
- Removed the related bilingual copy, README guidance, and regression assertions.

### Release process

- Made `@michengai/dsh-codex-suite-installer` the only supported one-click installation path. The legacy `@michengai/dsh-codex-suite` workspace package is now private and retained only as migration source; it will no longer be packed or released.

Published packages: [`@michengai/dsh-codex-ui@0.2.85`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.85) and [`@michengai/dsh-codex-suite-installer@0.1.2`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.2).

## 0.2.84 — 2026-08-25

Companion releases: `@michengai/dsh-codex-suite@0.1.16` and `@michengai/dsh-codex-suite-installer@0.1.1`.

### Added

- Added `dsh-find-plugin` to **Settings → About → Companion management plugins** as **Plugin Discovery**, with independent status checks, installation, updates, and **Update all** support.

### Documentation

- Clarified that `dshmarket` and `dsh-find-plugin` are optional standalone plugins outside the Suite and can be installed or updated separately from About.

Published packages: [`@michengai/dsh-codex-ui@0.2.84`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.84), [`@michengai/dsh-codex-suite@0.1.16`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.16), and [`@michengai/dsh-codex-suite-installer@0.1.1`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.1).

## 0.2.83 — 2026-08-24

Companion releases: `@michengai/dsh-codex-suite@0.1.15` and `@michengai/dsh-codex-suite-installer@0.1.0`.

### Fixed

- Split the direct-member CLI into a dependency-free installer package so `npx` does not resolve the aggregate Suite's full DSH runtime tree before it can start.
- Kept `@michengai/dsh-codex-suite` as the compatibility package for the old `dsh plugin add` path, while all recommended commands now use `@michengai/dsh-codex-suite-installer`.

Published packages: [`@michengai/dsh-codex-ui@0.2.83`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.83), [`@michengai/dsh-codex-suite@0.1.15`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.15), and [`@michengai/dsh-codex-suite-installer@0.1.0`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.0).

## 0.2.82 — 2026-08-24

Companion release: `@michengai/dsh-codex-suite@0.1.14`.

### Fixed

- Replaced the Suite's recommended aggregate install with an installer that records all six members as direct profile dependencies, allowing **Settings → About** to detect and update each plugin independently.
- Made clean custom Web profiles reuse the same `DSH_HOME` while placing DSH's built-in `dsh-web-app` before the member bundles.
- When About encounters a legacy aggregate Suite, it now promotes all six members before removing the aggregate package instead of retaining only the clicked plugin.

### Suite 0.1.14

- Added the cross-platform `dsh-codex-suite` command, legacy migration, config-dump validation, and dry-run support.
- Preserved exact member version coordination without modifying upstream DSH or creating a separate DSH Home.

Published packages: [`@michengai/dsh-codex-ui@0.2.82`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.82) and [`@michengai/dsh-codex-suite@0.1.14`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.14).

## 0.2.81 — 2026-08-24

Companion release: `@michengai/dsh-codex-suite@0.1.13`.

### Added

- Added an **Update all** action beside Companion management plugins whenever installed plugins have updates available.
- Kept missing plugins on their existing per-row install path instead of installing them implicitly during a bulk update.

### Reliability and accessibility

- Staged every selected package in one Host request and sent a single Desktop hot-update signal after the complete batch, so updating several plugins now reloads the window only once.
- Preserved individual install and update actions while preventing overlapping requests.
- Added visible loading feedback, keyboard focus treatment, accessible busy/status announcements, bilingual copy, and regression coverage for the batch selection and endpoint contract.

### Suite 0.1.13

- Pinned `@michengai/dsh-codex-ui` to `0.2.81`; all other Suite member pins remain on their currently verified releases.

Published packages: [`@michengai/dsh-codex-ui@0.2.81`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.81) and [`@michengai/dsh-codex-suite@0.1.13`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.13).

## 0.2.80 — 2026-08-23

Companion release: `@michengai/dsh-codex-suite@0.1.12`.

### Documentation

- Added bilingual changelogs covering the five most recent UI releases.
- Linked the release history from both README editions and included it in the npm package.

### Suite 0.1.12

- Refreshed every bundled plugin to the changelog release published on 2026-08-23.
- Pinned Agency Agents `0.1.21`, Archive Manager `0.1.13`, Automation `0.1.14`, IM Connect `0.1.23`, and Skills Manager `0.1.24`.

Published packages: [`@michengai/dsh-codex-ui@0.2.80`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.80) and [`@michengai/dsh-codex-suite@0.1.12`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.12).

## 0.2.79 — 2026-08-23

Companion release: `@michengai/dsh-codex-suite@0.1.11`.

### Fixed

- Removed the delayed expanded state that could stretch compact navigation icons across an already-wide sidebar.
- Made expansion reveal the fixed-width wide layout immediately while the host column clips it during motion.
- Made collapse fade the wide layout for 140 ms before switching to the compact rail.
- Anchored the 56 px compact rail to the left so its icons no longer drift while the host column changes width.

### Performance and accessibility

- Kept the workspace tree at its target width during the host transition, avoiding per-frame list reflow or remounting.
- Preserved the reduced-motion path for users who disable interface motion.
- Added regression coverage for both collapse and re-expansion without workspace-tree rerenders.

### Suite 0.1.11

- Pinned `@michengai/dsh-codex-ui` to `0.2.79`.
- Updated `@michengai/dsh-im-connect` to `0.1.22`.

Release commit: [`e8d2f4b`](https://github.com/MichengAI/dsh-codex-ui/commit/e8d2f4b).

## 0.2.78 — 2026-08-23

Companion releases: `@michengai/dsh-codex-suite@0.1.9` and dependency-only refresh `0.1.10`.

### Changed

- Restored the host sidebar-width transition after the performance hardening in `0.2.77`.
- Added compositor-only reveal motion for expanded and compact shells, search, and workspace sections.
- Kept the large workspace tree mounted while switching sidebar modes.

### Suite 0.1.9–0.1.10

- Refreshed all Suite member pins.
- Suite `0.1.10` advanced Automation to `0.1.13` and IM Connect to `0.1.20` without changing the UI package version.

Release commits: [`b7980e3`](https://github.com/MichengAI/dsh-codex-ui/commit/b7980e3), [`cc71abf`](https://github.com/MichengAI/dsh-codex-ui/commit/cc71abf).

## 0.2.77 — 2026-08-23

Companion release: `@michengai/dsh-codex-suite@0.1.8`.

### Added

- Persisted pinned workspaces in the DSH Host profile so they survive Desktop tray reloads and dynamic-port changes.
- Added safe client hydration, legacy local-storage migration, serialized writes, and protection against clearing pins from incomplete startup data.

### Fixed

- Improved workspace and session drag-and-drop reliability and drop-target handling.
- Isolated search state and deferred filtering so typing does not rerender the workspace tree.
- Kept the workspace slot mounted across compact and expanded sidebar modes.

Release commit: [`b96d5a8`](https://github.com/MichengAI/dsh-codex-ui/commit/b96d5a8).
