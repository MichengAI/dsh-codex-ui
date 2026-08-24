# 更新日志

[English](CHANGELOG.md)

本日志记录 DSH Codex UI 及其一键 Suite 最近发布的五个版本；更早的变更可查看 [Git 提交历史](https://github.com/MichengAI/dsh-codex-ui/commits/main)。

## 0.2.82 — 2026-08-24

配套版本：`@michengai/dsh-codex-suite@0.1.14`。

### 修复

- Suite 一键入口改为安装器，将六个成员写成 profile 的直接依赖，使「设置 → 关于」可以分别检测和升级每个插件。
- 新建自定义 Web profile 时自动复用同一 `DSH_HOME`，并把 DSH 内置 `dsh-web-app` 放在成员 bundle 之前。
- “关于”页遇到旧版聚合 Suite 时，先把全部六个成员提升为直接依赖，再移除聚合包，避免只保留本次点击的一个插件。

### Suite 0.1.14

- 新增跨平台 `dsh-codex-suite` 命令、旧 Suite 自动迁移、配置 dump 验证和 dry-run。
- 保留精确成员版本组合，不修改上游 DSH，也不创建独立 DSH Home。

发布包：[`@michengai/dsh-codex-ui@0.2.82`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.82) 与 [`@michengai/dsh-codex-suite@0.1.14`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.14)。

## 0.2.81 — 2026-08-24

配套版本：`@michengai/dsh-codex-suite@0.1.13`。

### 新增

- 当已安装插件存在新版本时，在“配套管理插件”标题右侧显示 **全部更新** 操作。
- 缺失插件继续使用各自的行内安装入口，不会被批量更新隐式安装。

### 可靠性与无障碍

- 通过一次 Host 请求登记全部选中版本，并在批次完整写入后只发送一次 Desktop 热更新信号；多个插件更新现在只会重载一次窗口。
- 保留单插件安装和更新入口，同时阻止重叠请求。
- 增加可见加载反馈、键盘焦点样式、可访问的忙碌/状态提示、中英文文案，以及批量筛选和接口约束的回归测试。

### Suite 0.1.13

- 将 `@michengai/dsh-codex-ui` 固定为 `0.2.81`；其他 Suite 成员继续使用当前已验证版本。

发布包：[`@michengai/dsh-codex-ui@0.2.81`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.81) 与 [`@michengai/dsh-codex-suite@0.1.13`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.13)。

## 0.2.80 — 2026-08-23

配套版本：`@michengai/dsh-codex-suite@0.1.12`。

### 文档

- 新增中英文更新日志，展示最近五个 UI 发布版本。
- 在中英文 README 中加入更新日志入口，并将日志纳入 npm 包。

### Suite 0.1.12

- 将全部聚合插件刷新到 2026-08-23 发布的更新日志版本。
- 固定 Agency Agents `0.1.21`、Archive Manager `0.1.13`、Automation `0.1.14`、IM Connect `0.1.23` 和 Skills Manager `0.1.24`。

发布包：[`@michengai/dsh-codex-ui@0.2.80`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.80) 与 [`@michengai/dsh-codex-suite@0.1.12`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.12)。

## 0.2.79 — 2026-08-23

配套版本：`@michengai/dsh-codex-suite@0.1.11`。

### 修复

- 移除展开阶段的额外等待，解决侧栏已经变宽、窄轨图标仍居中显示的问题。
- 展开时立即呈现固定宽度的宽态内容，由宿主侧栏列在动画过程中负责裁切。
- 收缩时先用 140ms 淡出宽态内容，再切换到窄轨。
- 将 56px 窄轨固定在左侧，避免图标跟随宿主列宽变化而横向漂移。

### 性能与无障碍

- 宿主动画期间保持工作区树的目标宽度，避免长列表逐帧重排或重新挂载。
- 保留减少动态效果模式，尊重用户的 `prefers-reduced-motion` 设置。
- 增加收缩和重新展开的双向回归测试，并验证工作区树不会额外渲染。

### Suite 0.1.11

- 将 `@michengai/dsh-codex-ui` 固定为 `0.2.79`。
- 将 `@michengai/dsh-im-connect` 更新为 `0.1.22`。

发布提交：[`e8d2f4b`](https://github.com/MichengAI/dsh-codex-ui/commit/e8d2f4b)。

## 0.2.78 — 2026-08-23

配套版本：`@michengai/dsh-codex-suite@0.1.9`，以及仅刷新依赖的 `0.1.10`。

### 调整

- 在 `0.2.77` 的性能优化基础上恢复宿主侧栏宽度动画。
- 为展开态、窄轨态、搜索弹窗和工作区分区增加仅使用合成层的轻量显现动画。
- 侧栏模式切换时继续保留大型工作区树实例。

### Suite 0.1.9–0.1.10

- 刷新 Suite 全部成员的固定版本。
- Suite `0.1.10` 将 Automation 更新到 `0.1.13`、IM Connect 更新到 `0.1.20`，UI 包版本保持不变。

发布提交：[`b7980e3`](https://github.com/MichengAI/dsh-codex-ui/commit/b7980e3)、[`cc71abf`](https://github.com/MichengAI/dsh-codex-ui/commit/cc71abf)。

## 0.2.77 — 2026-08-23

配套版本：`@michengai/dsh-codex-suite@0.1.8`。

### 新增

- 将置顶工作区持久化到 DSH Host Profile，使其在 Desktop 托盘重载和动态端口变化后仍可恢复。
- 增加安全的客户端水合、旧 localStorage 数据迁移、串行写入，以及启动数据不完整时的误清理保护。

### 修复

- 提升工作区和会话拖放的可靠性，修正落点判断。
- 隔离搜索状态并延迟过滤，避免输入搜索词时重新渲染工作区树。
- 在窄轨态和展开态之间切换时保持工作区插槽挂载。

发布提交：[`b96d5a8`](https://github.com/MichengAI/dsh-codex-ui/commit/b96d5a8)。
