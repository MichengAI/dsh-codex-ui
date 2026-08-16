# DSH Codex Suite

`@michengai/dsh-codex-suite` 是聚合包：一次安装 Codex UI、专家、技能和归档会话管理插件。

## 安装

发布到 npm 后，在任意 PowerShell 目录执行：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-suite
dsh --profile web --dump-config
```

重启 DSH Web 并在浏览器硬刷新。

独立安装与聚合安装互斥。同一 profile 已单独安装任一子插件时，先卸载全部四个子插件，再安装本聚合包；不要让两套 patch 同时生效。

## 独立安装

不需要完整套件时，仍可独立安装 Codex UI：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui
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
