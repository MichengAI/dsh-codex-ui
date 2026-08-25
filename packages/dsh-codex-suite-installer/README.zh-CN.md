# DSH Codex Suite Installer

`@michengai/dsh-codex-suite-installer` 是轻量一键安装器：把 Codex UI、专家、技能、归档、IM 助理和定时任务作为目标 profile 的六个**直接依赖**安装。

## 插件组合

| 插件 | npm 包 |
| --- | --- |
| Codex UI | `@michengai/dsh-codex-ui` |
| 专家管理 | `@michengai/dsh-agency-agents` |
| 技能管理 | `@michengai/dsh-skills-manager` |
| 归档管理 | `@michengai/dsh-archive-manager` |
| IM 助理 | `@michengai/dsh-im-connect` |
| 定时任务 | `@michengai/dsh-automation` |

安装器只携带六个成员的精确版本清单，不携带它们的运行时依赖树，因此 `npx` 启动轻量；安装完成后「设置 → 关于」可以分别检测和升级每个成员。`dshmarket` 和 `dsh-find-plugin` 不在套件内，需要时可在「设置 → 关于」中单独安装。

## 一键安装

需要 Node.js 22+，并确保当前 DSH 的 `dsh` 命令在 PATH 中。在任意目录执行：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
npx --yes @michengai/dsh-codex-suite-installer@latest --profile web
```

安装器会：

1. 用官方 npm 源和一次 `dsh plugin add` 安装六个精确版本成员；
2. 将成员写成 profile 的直接 dependencies 与 bundles；
3. 若存在旧版聚合 Suite，先提升全部成员，再移除旧聚合依赖；
4. 运行 `dsh --profile web --dump-config` 验证最终配置。

完成后重启 DSH Web 并在浏览器硬刷新。若 `dsh` 不在 PATH，可通过 `DSH_BIN` 指定其可执行文件。

## 新建自定义 Web profile

保持同一个 `DSH_HOME`，只需换一个 profile 名：

```powershell
npx --yes @michengai/dsh-codex-suite-installer@latest --profile codex
```

DSH 创建自定义 profile 时会提供 `@deepseek-ai/dsh-base`。安装器会再把 DSH 自带的 `@deepseek-ai/dsh-web-app` 放到六个成员 bundle 之前，不会创建独立 Home，也不会通过 npm 重装官方 Web 包。

## 只安装 Codex UI

```powershell
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
```

## 本地验证

仓库检出状态下可先查看安装计划：

```powershell
node .\packages\dsh-codex-suite\bin.mjs --profile codex --dry-run
```

正式执行时去掉 `--dry-run`。安装器会读取工作区根包版本替换本地的 `workspace:*`。
