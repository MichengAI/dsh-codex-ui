# Changelog

[简体中文](CHANGELOG.zh-CN.md)

This changelog records recent releases of DSH Codex UI and its one-click installer. Earlier changes remain available in the [Git history](https://github.com/MichengAI/dsh-codex-ui/commits/main).

## 1.1.3 - 2026-09-12

- With Pet 0.1.5 or later, keep the pet visible and accessible by mouse and keyboard on settings pages while other background content remains isolated.

## suite-installer-v1.0.4 - 2026-09-11

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.38`
- `@michengai/dsh-codex-ui@1.1.2`
- `@michengai/dsh-skills-manager@0.1.48`
- `@michengai/dsh-agency-agents@0.1.40`
- `@michengai/dsh-im-connect@0.1.45`
- `@michengai/dsh-automation@0.1.38`
- `@michengai/dsh-btw@0.1.6`
- `@michengai/dsh-simplify@0.1.4`
- `@michengai/dsh-codex-pet@0.1.4`

The installer uses these exact versions for reproducible installation.

## 1.1.2 - 2026-09-11

- Support attachment drafts and global panels in DSH 0.1.5-rc.1 / rc.2, fix prefill and history recall, and support compact-sidebar navigation and returning to existing conversations. Later release candidates still require separate validation.
- Preserve Codex menu styling with native adaptive widths, correct attachment spacing and left-side turn previews, and restore native message bubbles, Session log controls, and translations. Untranslated text on older hosts remains in English.
- Unify connector pages with a neutral palette while preserving warning and error colors, and align usage statistics with the standard 864px settings width.
- Hide archived channel conversations immediately and prevent stale polling responses from restoring them; failed archival keeps the conversation visible and shows an error.

## suite-installer-v1.0.3 - 2026-09-09

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.34`
- `@michengai/dsh-codex-ui@1.1.1`
- `@michengai/dsh-skills-manager@0.1.44`
- `@michengai/dsh-agency-agents@0.1.36`
- `@michengai/dsh-im-connect@0.1.39`
- `@michengai/dsh-automation@0.1.35`
- `@michengai/dsh-btw@0.1.4`
- `@michengai/dsh-simplify@0.1.2`
- `@michengai/dsh-codex-pet@0.1.2`

The installer uses these exact versions for reproducible installation.

## suite-installer-v1.0.2 - 2026-09-09

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.34`
- `@michengai/dsh-codex-ui@1.1.1`
- `@michengai/dsh-skills-manager@0.1.44`
- `@michengai/dsh-agency-agents@0.1.36`
- `@michengai/dsh-im-connect@0.1.39`
- `@michengai/dsh-automation@0.1.35`
- `@michengai/dsh-btw@0.1.4`
- `@michengai/dsh-simplify@0.1.2`

The installer uses these exact versions for reproducible installation.

## 1.1.1 - 2026-09-09

- Add Codex Pet below scheduled tasks in About, with version checks and installation/update actions.
- Enlarge the welcome logo to 46px and the headline to 34px.
- Hide descendants of isolated branches beneath transparent Desktop settings, preventing explicit `visibility:visible` rules from showing conversation text through the page. Restore normal visibility when settings close.
- Hide background portals explicitly isolated by settings, including those mounted under body, and restore their original isolation state on exit while preserving onboarding dialogs.

## suite-installer-v1.0.1 - 2026-09-09

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.34`
- `@michengai/dsh-codex-ui@1.1.0`
- `@michengai/dsh-skills-manager@0.1.44`
- `@michengai/dsh-agency-agents@0.1.35`
- `@michengai/dsh-im-connect@0.1.39`
- `@michengai/dsh-automation@0.1.35`
- `@michengai/dsh-btw@0.1.4`
- `@michengai/dsh-simplify@0.1.2`

The installer uses these exact versions for reproducible installation.

## 1.1.0 - 2026-09-09

- Update product screenshots and remove temporary design previews and QA records; settings exit checks now target an actual DSH host via `test:host`.

- Preserve billing failure feedback after a ready dashboard crashes, until the user retries.

- Embed the original billing component in a same-origin usage statistics frame, preserving its statistics and configuration behavior.
- Rework the new conversation page with centered branding and task suggestions above a separate bottom toolbar and composer, preserving drafts and footer metrics.
- Refine composer corners, shadows, spacing, and controls; unify settings headings and spacing, move the configuration action into General advanced settings, and fill host localization gaps.
- Add companion Desktop material support with an opaque browser fallback; full Desktop material combinations still require acceptance testing.
- Harden the production billing frame with post-handshake loading, immediate resource errors, separate panel and settings close semantics, and layered Escape and cross-frame Tab handling.
- Scope text translation observers to settings and menus and verify mirrored width constants against the host.
- Add draggable width handles to new conversations with shared width preferences and a 640px default; keep guide cards independent of composer resizing.
- Hide the task sidebar scrollbar while preserving scrolling, and fix downward Git menus and first-frame style changes.

## suite-installer-v1.0.0 - 2026-09-08

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.33`
- `@michengai/dsh-codex-ui@1.0.0`
- `@michengai/dsh-skills-manager@0.1.43`
- `@michengai/dsh-agency-agents@0.1.34`
- `@michengai/dsh-im-connect@0.1.38`
- `@michengai/dsh-automation@0.1.34`
- `@michengai/dsh-btw@0.1.4`
- `@michengai/dsh-simplify@0.1.2`

The installer uses these exact versions for reproducible installation.

## 1.0.0 - 2026-09-08

- Release 1.0.0, bringing project and conversation navigation, plugin entry points, and standalone settings together in a cohesive Codex-style experience.
- Fix flashing when returning to the app or pressing Escape; let menus handle Escape first and preserve the current settings form while filtering navigation.
- Upgrade notes: the standalone settings view requires the bundle patch that disables ui-settings-general. If an existing settings shell is detected, its entry is retained. Replacing client files alone is not a complete upgrade; reload DSH after upgrading. Existing business configuration and conversations require no migration.
- Fix global settings search, onboarding and keyboard focus isolation, Escape handling for hidden dialogs, and configuration-file error feedback; retain the host settings shell when it is already active.
- Replace the settings dialog with a Codex-style standalone view, category search, grouped preferences, and focus restoration when returning to the app.
- Fix duplicate settings-shell registration, settings entry alignment and transitions, search focus, repeated headings, and content spacing.
- Give the plugin marketplace and side cards distinct store and sidebar-layout icons instead of the generic box.
- Preserve host configuration, onboarding, connection recovery, and installed plugin functionality; community plugin internal styling remains outside this change.

## suite-installer-v0.1.31 - 2026-09-08

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.32`
- `@michengai/dsh-codex-ui@0.2.113`
- `@michengai/dsh-skills-manager@0.1.43`
- `@michengai/dsh-agency-agents@0.1.34`
- `@michengai/dsh-im-connect@0.1.38`
- `@michengai/dsh-automation@0.1.34`
- `@michengai/dsh-btw@0.1.4`
- `@michengai/dsh-simplify@0.1.2`

The installer uses these exact versions for reproducible installation.

## 0.2.113 - 2026-09-08

### Fixed

- Fixed Chinese text wrapping into vertical columns and misaligned menu and footer text while collapsing the sidebar.
- Restored sidebar expand and collapse transitions when used alongside `dsh-better-sidebar`, while preserving right-panel animations.
- Synchronized sidebar width and content fades, removed redundant width updates, and kept rapid toggling and dragging responsive.

## suite-installer-v0.1.30 - 2026-09-08

Resolved and pinned the following member versions from the official npm registry:

- `@michengai/dsh-archive-manager@0.1.32`
- `@michengai/dsh-codex-ui@0.2.112`
- `@michengai/dsh-skills-manager@0.1.43`
- `@michengai/dsh-agency-agents@0.1.34`
- `@michengai/dsh-im-connect@0.1.38`
- `@michengai/dsh-automation@0.1.34`
- `@michengai/dsh-btw@0.1.4`
- `@michengai/dsh-simplify@0.1.2`

The installer uses these exact versions for reproducible installation.

## 0.2.112 - 2026-09-08

### Release automation

- Fixed Chromium installation steps in release workflows and added YAML structure and prerequisite validation.
- Installer releases now generate and commit bilingual CHANGELOG entries before extracting release notes; missing either language blocks publication.

### Breaking changes

- Removed the public `crossSiteRequest` export. Consumers must use the host connection’s `requestRejection()` contract. Business GET routes now require authentication, including loopback requests (401 when signed out); missing authentication services return 503. The old REST paths have no compatibility aliases. Requires `@deepseek-ai/dsh-client-connection >=0.1.2-rc.1` and Cordis `>=4.0.2`.

### Fixed

- Added localized 401/403/503 feedback for business requests and an explicit local-cache notice when workspace preferences cannot sync.
- Consolidated empty-chat padding and ignored stale invisible drop markers; conflicting distinct drop positions now emit a deduplicated diagnostic.

- Stopped applying custom-group spacing between projects in an ungrouped project list, keeping the empty-conversation label vertically centered between project rows.
- Centered empty-group text between adjacent group headers, accounting for the external group gap, and unified both empty-state labels at 13px/18px with the same muted color.
- Standardized the Chinese empty-conversation label to "暂无聊天".
- Aligned empty-group text with the group title without changing project or conversation indentation.
- Matched the Codex sidebar reorder marker's 8px hollow ring and 2px rounded stroke, extending the line toward its start and removing the ring-to-line gap.
- Unified group, project, and conversation reorder indicators around the midpoint between visible rows, including scrolling and collapsed content, instead of fixed offsets from wrapper elements.
- Added 4px below each project's conversation list, matching its top gap so the last conversation no longer touches the next project row; the spacing collapses with the list.
- Prevented the group reorder indicator above the first sidebar group from being clipped by the expanded Projects section.

### Changed

- Increased group labels to 14px/600 with 32px rows and 12px spacing; project folders now switch between equally sized open and closed icons according to expansion state.
- Strengthened sidebar groups with persistent disclosure indicators, medium-weight labels, subtle backgrounds, and spacing while preserving existing project and conversation indentation and row widths. Expansion uses the arrow state without resembling a selected conversation; improved group touch targets and keyboard focus styling.
- Moved Codex UI's business REST routes from `/api/michengai/codex-ui/*` to `/api/dsh-codex-ui/*`, aligning their naming with the Skills Manager and IM Connect business endpoints; the old routes are no longer registered. The host baseline now requires `@deepseek-ai/dsh-client-connection >=0.1.2-rc.1` and Cordis `>=4.0.2`.

### Security

- Delegated all five business REST routes to the DSH host's `requestRejection()` checks for trusted hosts, origins, and login cookies. Requests now fail closed when authentication is unavailable without blocking legitimate reverse-proxy origins through a loopback-only check.

### Tests

- Run Chromium layout checks in `pnpm test` and CI without screenshots, including exact tertiary colors and empty-state padding. Added cross-section drag cleanup and pinned-host-package trust-boundary regression coverage with login stubbed as authenticated.

- Added business-route registration and authentication regression coverage for the new and removed paths, 401, 403, unavailable authentication, unchanged request-header forwarding, and an external-origin write authorized by the host boundary.

## suite-installer-v0.1.29 - 2026-09-08

- Updated the suite to Codex UI `0.2.111` and IM Connect `0.1.38`, keeping the channel sidebar compatible with the authenticated `/api/dsh-im-connect/channels` endpoint.
- Refreshed exact member versions from the official npm registry for reproducible one-click installation.

## 0.2.111 - 2026-09-08

### Fixed

- Updated the channel sidebar to use `/api/dsh-im-connect/channels`, matching IM Connect `0.1.38` after removal of the old management endpoint.

## suite-installer-v0.1.28 - 2026-09-08

- Updated the bundled Codex UI to `0.2.110`, including standalone DSH Web plugin-update recovery guidance.
- Refreshed exact member versions from the official npm registry for reproducible one-click installation.

## 0.2.110 - 2026-09-08

### Fixed

- Distinguished standalone DSH Web installation failures from Desktop errors, directing users to stop and restart the current Web host instead of quitting DSH Desktop.
- Added localized recovery guidance for locked plugin files, pnpm store conflicts, and otherwise unrecognized DSH Web installation failures.

### Tests

- Added regression coverage for Web-specific installer errors and their Simplified Chinese and English localization.

## suite-installer-v0.1.27 - 2026-09-07

- Updated the bundled Codex UI to `0.2.108`, including group rename/delete menus and aligned group counts; refreshed exact member versions from the official npm registry.

## 0.2.108 - 2026-09-07

- Added rename and delete actions to each custom workspace group; the Projects header now keeps only the create-group button. Renaming preserves group membership, ordering, and expansion.
- Aligned custom-group and Ungrouped counts, kept long names from crowding menu buttons, and improved keyboard focus recovery after renaming.
- Prevented IME confirmation from submitting new groups and kept rejected names from interfering with preference synchronization.
- Made case-insensitive name checks independent of system locale while preserving legacy stored group names and memberships.

## suite-installer-v0.1.26 - 2026-09-07

- Refreshed direct member pins from the official npm registry, including IM Connect `0.1.37`, which withdraws its unfinished proactive delivery feature.

## suite-installer-v0.1.25 - 2026-09-07

- Updated the bundled Codex UI to `0.2.107` and refreshed direct member versions from the official npm registry for reproducible installation.

## 0.2.107 - 2026-09-07

- Displayed the running Codex UI version beside the About title and aligned Channel and Schedule session-group layout with Tasks.
- Restricted dependency update requests to loopback same-origin callers and avoided redundant Desktop reload IPC while preserving independent Web reloads.
- Standardized the package contract on Node.js 22.19.0+ and pnpm 11.22.0.

## suite-installer-v0.1.24 — 2026-09-07

- Added BTW side questions and Simplify code cleanup to the Suite, installing all eight companion plugins together.
- Refreshed and pinned member versions from the official npm registry for reproducible installations.
- Requires Node.js 22.19.0 or later to support Simplify.

## 0.2.106 — 2026-09-07

- Added Wallpaper Engine sidebar glass support while keeping settings and search dialogs correctly positioned and clickable.
- Integrated the billing plugin entry into the sidebar, aligning icon size, colors, typography, and spacing with Settings while preserving billing details and the collapsed entry.

## suite-installer-v0.1.23 — 2026-09-07

- Updated the bundled Codex UI to `0.2.106`, including sidebar glass support and billing entry styling.
- Other Suite members remain unchanged.

## 0.2.105 — 2026-09-06

- Added Simplify directly below BTW on the About page, with version status, install, update, and bulk-update support.

## suite-installer-v0.1.22 — 2026-09-06

- Updated the bundled Codex UI to `0.2.105`, adding Simplify management to the About page.
- Updated Automation to `0.1.32`; other Suite members remain unchanged.

## 0.2.104 — 2026-09-06

- Added input history: press Up/Down in an empty composer to recall previously sent text. Each project keeps its own history.
- Added BTW to the About page, with version information and install/update actions.
- Shortened the archive plugin label to "Archived conversations".

## suite-installer-v0.1.21 — 2026-09-06

- Updated the bundled Codex UI to `0.2.104`, adding Up/Down input history and a BTW entry on the About page.
- Updated Skills Manager, Agency Agents, and Automation.

## 0.2.103 — 2026-09-04

Companion release: `@michengai/dsh-codex-suite-installer@0.1.20`.

### Fixed

- Limited conversation DOM processing to affected message roots during streaming updates, avoiding repeated full-document decoration scans.
- Corrected blank-language fallback, cyclic remote-error handling, workspace-preference response versioning, About-page refresh warnings, and connector marketplace probing compatibility.
- Hardened Suite Installer YAML build-policy normalization across indentation styles and rejected Windows command-expansion characters.
- Preserved existing third-party bundle order during Suite migration, expanded managed members at the prior Suite anchor, and rejected profiles with missing or reversed base/web prerequisites instead of silently rewriting them.

### Tests

- Added behavior coverage for cross-site dependency-route rejection, error redaction, localized refresh failures, connector probing, observer scope, cyclic errors, installer ordering, invalid bundle baselines, and Windows command quoting.

### Dependencies

- The Suite Installer release workflow will resolve Codex UI `0.2.103` and publish the companion `0.1.20` release.

## 0.2.102 — 2026-09-03

Companion release: `@michengai/dsh-codex-suite-installer@0.1.19`.

### Added

- Added persistent, reorderable workspace groups with a collapsible ungrouped collection, while preserving the flat project list when no custom groups exist.
- Added Codex-style session and project menus, project-wide session archiving, and confirmed cross-project session moves that migrate the session working directory with rollback protection.
- Added Codex-aligned drag previews, exact insertion indicators, group ordering, project-to-group movement, and session movement between projects.
- Added GitHub and Issues actions to the Codex UI settings page.

### Changed

- Removed session pinning and kept project pinning as the single pinning model.
- Published runtime files from `lib` and aligned the client bundle contract with the current DSH module loader.
- Upgraded supported DSH development dependencies to `0.1.2-rc.1`; `dsh-client-runtime` remains on its highest published version, `0.1.1-rc.2`.

### Fixed

- Matched Codex sidebar spacing, typography, controls, hover cards, folder treatments, animations, and drag feedback across pinned, project, recent, channel, schedule, and extension sections.
- Stabilized sidebar resizing at a 240px minimum without persisting width, retained the 50% collapse threshold, and removed the initial resize animation and first-drag rebound.
- Hardened workspace-group hydration and persistence, host compatibility fallbacks, structured user-facing errors, unread state updates, and move rollback failure messaging.
- Completed Simplified Chinese and English coverage for the updated sidebar, menus, confirmations, errors, and settings actions.

### Dependencies

- The Suite Installer release workflow will resolve Codex UI `0.2.102` after this release is published.

## 0.2.101 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.18`.

### Fixed

- Restored the host pending-interaction store as a fallback for workspace, channel, and scheduled-task trees when `SessionSummary.pendingInteraction` is absent, so approvals, questions, and plan reviews remain visible in Web and Desktop sidebars.
- Kept valid `SessionSummary.pendingInteraction` values authoritative while preserving a stable empty-store fallback for older hosts that do not inject the hook.

### Tests

- Added DOM integration coverage for all three trees using the real pending-interaction store path, alongside the existing `SessionSummary` snapshot coverage.

### Dependencies

- The Suite Installer release workflow will resolve Codex UI `0.2.101` after this release is published.

## 0.2.100 — 2026-09-01

Companion release: `@michengai/dsh-codex-suite-installer@0.1.17`.

### Fixed

- Added pending-interaction indicators to workspace, channel, and scheduled-task trees for questions, approvals, and plan reviews, with the warning state taking precedence over unread and running indicators.
- Aligned all three trees with the official `SessionSummary.pendingInteraction` contract, removed the unused host-store abstraction, and matched the official English status labels.
- Removed the package release-age guard from About-page companion installs and updates so explicitly requested versions can be installed immediately.

### Tests

- Added DOM rendering coverage for pending-interaction states in all three trees using fully typed `SessionListState` and `SessionSummary` snapshots.

### Dependencies

- The Suite Installer release workflow will resolve Codex UI `0.2.100` after this release is published.

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
