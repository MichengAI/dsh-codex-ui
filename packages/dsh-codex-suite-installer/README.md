# DSH Codex Suite Installer

`@michengai/dsh-codex-suite-installer` is a lightweight one-click installer that adds Codex UI, expert management, skill management, archive management, IM Assistant, and scheduled tasks to one profile as six **direct dependencies**.

## Plugin combo

| Plugin | npm package |
| --- | --- |
| Codex UI | `@michengai/dsh-codex-ui` |
| Expert management | `@michengai/dsh-agency-agents` |
| Skill management | `@michengai/dsh-skills-manager` |
| Archive management | `@michengai/dsh-archive-manager` |
| IM Assistant | `@michengai/dsh-im-connect` |
| Scheduled tasks | `@michengai/dsh-automation` |

The installer carries only the exact version manifest, not the six plugins' runtime dependency trees. This keeps `npx` startup small while allowing **Settings → About** to detect and update every installed member independently. `dshmarket` remains optional.

## One-click installation

Node.js 22+ is required, and the current DSH `dsh` command must be on PATH. Run from any directory:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
npx --yes @michengai/dsh-codex-suite-installer@latest --profile web
```

The installer:

1. installs all six exact member versions from the official npm registry in one `dsh plugin add`;
2. records every member as a direct profile dependency and bundle;
3. promotes all members before removing a legacy aggregate Suite dependency;
4. validates the result with `dsh --profile web --dump-config`.

Restart DSH Web and hard-refresh the browser afterwards. Set `DSH_BIN` when `dsh` is not on PATH.

## New custom Web profile

Keep the same `DSH_HOME` and choose another profile name:

```powershell
npx --yes @michengai/dsh-codex-suite-installer@latest --profile codex
```

DSH supplies `@deepseek-ai/dsh-base` when it creates a custom profile. The installer places DSH's built-in `@deepseek-ai/dsh-web-app` before the six member bundles without creating a separate Home or reinstalling the official Web package from npm.

## Install Codex UI only

```powershell
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
```

## Local verification

Preview the installation plan from a repository checkout:

```powershell
node .\packages\dsh-codex-suite\bin.mjs --profile codex --dry-run
```

Remove `--dry-run` to apply it. The checkout path resolves the local `workspace:*` entry to the root package version.
