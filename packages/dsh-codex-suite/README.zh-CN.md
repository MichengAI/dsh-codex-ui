# DSH Codex Suite

`@michengai/dsh-codex-suite` 是一键套件：一次安装 Codex UI、专家、技能、归档、IM 助理和定时任务。

## 插件组合

| 插件 | npm 包 |
| --- | --- |
| Codex UI | `@michengai/dsh-codex-ui` |
| 专家管理 | `@michengai/dsh-agency-agents` |
| 技能管理 | `@michengai/dsh-skills-manager` |
| 归档管理 | `@michengai/dsh-archive-manager` |
| IM 助理 | `@michengai/dsh-im-connect` |
| 定时任务 | `@michengai/dsh-automation` |

`dshmarket` 不在套件内，需要时单独安装。

每个套件版本都会锁定一组经过验证的子插件精确版本。子插件升级通过发布新的套件版本统一交付，不在用户安装时动态解析浮动的 `latest`。

## 安装

`dsh plugin add` 会转发到 profile 目录里的 `pnpm add`。不写版本、不指定官方源时，本机镜像和最短发布间隔可能让你停在旧版。

在任意 PowerShell 目录执行：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-suite@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

未把 `dsh` 装进 PATH 时，把开头的 `dsh` 换成 `npx --yes @deepseek-ai/dsh`。

重启 DSH Web 并在浏览器硬刷新。配置输出中应包含 `codex-ui`、`agency-agents`、`skills-manager`、`archive-manager`、`im-connect` 和 `dsh-automation`。

独立安装与聚合安装互斥。同一 profile 已单独安装任一子插件时，先卸载全部六个子插件，再安装本聚合包；不要让两套 patch 同时生效。

## 独立安装

不需要完整套件时，仍可独立安装 Codex UI：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
```

## 本地验证

在仓库根目录执行：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add .\packages\dsh-codex-suite
```

## pnpm 布局

DSH 从 profile 顶层解析本包 patch 中的子插件。若 profile 使用 pnpm 严格隔离布局，请在 profile 的 `pnpm-workspace.yaml` 设置 `nodeLinker: hoisted` 后重新安装；否则子包可能安装成功但启动时无法解析。
