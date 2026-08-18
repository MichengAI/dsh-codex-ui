# DSH Codex Suite

`@michengai/dsh-codex-suite` is the one-click combo: Codex UI, expert management, skill management, archive management, IM Assistant, and scheduled tasks.

## Plugin combo

| Plugin | npm package |
| --- | --- |
| Codex UI | `@michengai/dsh-codex-ui` |
| Expert management | `@michengai/dsh-agency-agents` |
| Skill management | `@michengai/dsh-skills-manager` |
| Archive management | `@michengai/dsh-archive-manager` |
| IM Assistant | `@michengai/dsh-im-connect` |
| Scheduled tasks | `@michengai/dsh-automation` |

`dshmarket` is not part of the suite. Install it separately when needed.

## Installation

`dsh plugin add` forwards to `pnpm add` in the profile directory. Without a version and official registry, a local mirror or minimum-release-age policy can leave you on an older build.

Run this from any PowerShell directory:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-suite@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

If `dsh` is not on PATH, replace the leading `dsh` with `npx --yes @deepseek-ai/dsh`.

Restart DSH Web and hard-refresh the browser. The configuration output should contain `codex-ui`, `agency-agents`, `skills-manager`, `archive-manager`, `im-connect`, and `dsh-automation`.

Individual and aggregate installation are mutually exclusive. If the profile already has any of the six plugins, uninstall them before adding the suite.

## Install Codex UI only

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
```

## Local verification

From the repository root:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add .\packages\dsh-codex-suite
```

## pnpm layout

DSH resolves the suite patch from the profile root. If the profile uses a strict pnpm layout, set `nodeLinker: hoisted` in the profile `pnpm-workspace.yaml` and reinstall. Otherwise the packages may install but fail to resolve at startup.
