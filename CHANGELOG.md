# Changelog

[简体中文](CHANGELOG.zh-CN.md)

This changelog records the five most recent published releases of DSH Codex UI and its one-click Suite. Earlier changes remain available in the [Git history](https://github.com/MichengAI/dsh-codex-ui/commits/main).

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
