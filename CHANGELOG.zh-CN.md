# 更新日志

[English](CHANGELOG.md)

本日志记录 DSH Codex UI 及其一键安装器的最近发布；更早的变更可查看 [Git 提交历史](https://github.com/MichengAI/dsh-codex-ui/commits/main)。

## 0.2.99 — 2026-09-01

配套版本：`@michengai/dsh-codex-suite-installer@0.1.16`。

### 修复

- 恢复主会话正文中用户提问气泡的完整显示，避免长问题被溢出、高度上限或多行省略规则截断。
- 保留 DSH 官方用户气泡 DOM，只为新增用户气泡补充稳定兼容标记。

### 依赖

- Suite Installer 发布 workflow 会在本版本发布后解析 Codex UI `0.2.99`。

## 0.2.98 — 2026-09-01

配套版本：`@michengai/dsh-codex-suite-installer@0.1.15`。

### 修复

- 让会话分段页签的滑块能够以页签容器自身作为同步根节点，选中“轨迹”或“上下文”后高亮背景不再停留在“对话”。

### 依赖

- 准备 Suite Installer `0.1.15`，在本版本发布后解析 Codex UI `0.2.98`。

## 0.2.97 — 2026-09-01

配套版本：`@michengai/dsh-codex-suite-installer@0.1.14`。

### 兼容性

- 在新版 DSH 中采用官方轮次导航，并为旧运行时保留自定义导航；通过运行时能力判断和更稳健的左侧镜像，不再依赖私有样式文件名或宿主 DOM 层级。
- 保留官方会话宽度拖拽、自适应正文宽度与轮次导航，同时继续使用 Codex 风格输入区。

### 修复

- 重构“关于”页配套插件安装：显示 pnpm 实时进度、以实际进入 Profile 为成功标准、批量安装缺失或可更新插件、清理残留 Junction，并正确区分 Desktop 自动重载与独立 Web 手动重启。
- 强化 GUI 环境下的 pnpm 定位，不再信任其他包管理器入口，也不会把推断出的入口泄漏给后续子进程。
- 严格校验安装进度数据，并为 Desktop 较慢的 bundles 写入留出更充足的等待时间。
- 对轮次导航 DOM 监听增加相关变更过滤和逐帧合并，避免流式回答触发反复全文档扫描。

### 依赖

- 准备 Suite Installer `0.1.14`，在本版本发布后解析全部配套插件的最新精确版本。

## 0.2.96 — 2026-09-01

配套版本：`@michengai/dsh-codex-suite-installer@0.1.13`。

### 修复

- 未安装 IM 配套插件时，点击 IM 助理会立即进入“关于”，不再先显示通用设置并等待缺失分区超时；已安装时仍正常进入 IM 设置。
- “关于”页安装插件前会预先将非必要的 `protobufjs` 与 `koffi` 安装脚本声明为禁用，避免 pnpm 写入 ignored-build 占位配置并阻断安全安装。

### 依赖

- 发布时通过官方 npm 源重新解析 Suite Installer 全部成员的最新精确版本。

## 0.2.95 — 2026-09-01

配套版本：`@michengai/dsh-codex-suite-installer@0.1.12`。

### 修复

- 浅色与暗色主题下，侧边栏背景现在与宿主工作区背景保持一致。
- 将企业微信频道中被裁切的白底图标替换为紧凑的多色品牌标记，在侧边栏尺寸下仍能清晰识别。

## 0.2.94 — 2026-08-30

配套版本：`@michengai/dsh-codex-suite-installer@0.1.11`。

### 安全性

- 完成 Desktop 公开服务的双向完整性校验：`desktopProfiles` 与 `desktopPnpm` 任意一项单独存在时，依赖管理都会安全失败，不再回退到可能修改其他 Profile 的环境 CLI。

## 0.2.93 — 2026-08-30

### 兼容性

- 通过公开的 `desktopProfiles` service 读取 DSH Desktop 当前 Profile，并把安装与更新交给公开的 `desktopPnpm` 包管理服务，不再硬编码 `web` Profile。
- 保留普通 Web/CLI 的 Profile 回退，同时在 Desktop 重启前后正确识别宿主 Runtime 与配套插件状态。
- 新建会话优先调用 Archive Manager 可选提供的 `uiWorkspace.startSession()` service，缺失时继续使用标准工作区服务。

### 安全性

- 移除对 Launcher 私有实现细节 `desktopPnpmBootstrap` 的依赖。
- Desktop generation 的公开服务不完整时安全失败，不再回退到可能修改其他 Profile 的环境 CLI。
- 宿主没有通过受支持路径暴露 Runtime 目录时，只确认正在运行的 Desktop DSH Runtime 已安装，不伪造版本或升级状态。

## 0.2.92 — 2026-08-28

配套版本：`@michengai/dsh-codex-suite-installer@0.1.9`。

### 安全修复

- 旧版 Suite 及其安装器清单更新为 `@michengai/dsh-im-connect@0.1.26`。
- 工作区依赖图固定使用兼容的修复版 `ansi-regex@5.0.1`，消除 Suite 与测试依赖路径中的 CVE-2021-3807。

## 0.2.91 — 2026-08-28

### 发布流程

- npm 发布从本机手动执行改为由版本标签触发 GitHub Actions npm Trusted Publishing（OIDC）。
- `npm publish` 前新增完整测试和标签/package.json 版本一致性门禁；不再在仓库或 Actions Secrets 中保存 npm 凭据。

## 0.2.90 — 2026-08-27

配套版本：`@michengai/dsh-codex-suite-installer@0.1.7`。

### 调整

- 侧边栏展开宽度按本机 Codex 桌面客户端对齐：默认 275px、最小 240px、最大 520px，并受可用视口宽度限制。
- 将 DSH 宿主较窄的持久化拖拽范围映射到 Codex 的视觉范围，同时保留 275px 默认锚点。

### 修复

- 收缩手势改为 Codex 行为：拖到小于 240px 时收缩，不再使用固定屏幕坐标阈值。
- 防止 DOM 宽度适配器在宿主拖动和重渲染期间重复换算自身已映射的输出。

## 0.2.89 — 2026-08-27

配套版本：`@michengai/dsh-codex-suite-installer@0.1.6`。

### 新增

- 工作区、频道和定时任务文件夹分别持久化展开/折叠状态；存储带版本，损坏或不可用时安全回退。
- 定时任务侧栏增加列表/概览切换、直接打开任务设置和整组归档。
- main push 与 PR 在 Node.js 22/24 上运行 CI；tag Release 创建版本前也必须通过完整测试。

### 修复

- 不再根据用户可编辑的时间戳格式标题把普通会话误判为定时任务；自动化归属只认稳定的会话 ID 前缀。
- 整组归档遇到单项失败时继续处理后续会话，只清理成功项的本地置顶/未读状态，并保留失败项供重试。
- 为定时任务设置请求增加运行时校验，保护浏览器存储访问，并把设置壳慢加载等待时间延长到 4 秒。
- Windows Explorer Host 端点只允许打开已注册的精确工作区根，拒绝盘符根、UNC、相对路径、子路径与无关绝对路径。
- 会话、权限和设置 DOM 兼容观察先过滤无关变更，再调度扫描，降低流式输出期间的额外工作。

### 发布流程

- 对齐根包、轻量安装器、私有旧 Suite 快照、成员钉版和版本契约断言；聚合 Suite 继续停止发布。
- 修正本地验证说明中的安装器路径、帮助与错误前缀，并增加客户端 bundle 静态运行时模块的构建契约。
- 将 `docs/00-交接入口/` 纳入版本控制并按当前实现更新，其他历史文档继续忽略。
- 拒绝 `DSH_BIN` 中的 Windows shell 元字符，收紧安装器调用边界。

## 0.2.88 — 2026-08-26

配套版本：`@michengai/dsh-codex-suite-installer@0.1.5`。

### 调整

- 安装外部可选插件 `dsh-mcp-connector` 时，用其完整的市场与连接管理界面替换轻量的“设置 → 连接器”工具列表。
- 首页/侧边栏继续以“连接器”作为唯一入口，展开与收缩状态下均不再显示外部插件单独注入的启动入口。
- 未安装 `dsh-mcp-connector` 或其 Web UI 不可用时，自动回退到原有的当前会话 MCP 工具目录。

### 兼容性

- 增加同源且校验消息来源的 Prompt 桥接，可创建或复用工作区会话，并把市场中的 Prompt 写入新会话草稿。
- 让内嵌市场跟随 DSH 当前选择的明暗主题；不修改外部插件，也不将其变为强制依赖。
- 轻量安装器同步固定 Codex UI `0.2.88`；旧聚合 Suite 继续保持私有且不发布。

发布包：[`@michengai/dsh-codex-ui@0.2.88`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.88) 与 [`@michengai/dsh-codex-suite-installer@0.1.5`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.5)。

## 0.2.87 — 2026-08-26

配套版本：`@michengai/dsh-codex-suite-installer@0.1.4`。

### 修复

- 恢复设置与 Chat 中三个内置权限预设的中文显示；兼容逻辑只精确替换权限控件文案，不改动自定义预设、正文、图标或宿主菜单布局。
- “在资源管理器中打开”不再被应用内文件预览拦截；点击后立即收起菜单，并在前台最大化打开 Windows 资源管理器。
- 将会话和工作区重命名输入框调整为原生设置表单样式，补充辅助说明、无障碍名称和清晰的焦点状态。
- 即使第三方插件继续注册设置分区，也保证 Codex UI 自带的“关于”入口始终位于最底部。

### 兼容性

- 轻量安装器同步固定 Codex UI `0.2.87`、IM Connect `0.1.24` 和 Automation `0.1.15`；旧聚合 Suite 继续保持私有且不发布。

发布包：[`@michengai/dsh-codex-ui@0.2.87`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.87) 与 [`@michengai/dsh-codex-suite-installer@0.1.4`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.4)。

## 0.2.86 — 2026-08-25

配套版本：`@michengai/dsh-codex-suite-installer@0.1.3`。

### 调整

- 将“对话 / 轨迹 / 上下文”改为紧凑的三段式控件，同时保持宿主管理的页签 DOM 和原有交互不变。
- 将宽版 **Session log** 胶囊改为 28px 下载图标，并保留原始文本供辅助技术读取。
- 移除会话顶栏分割线，将全部控件放入上下各留 3px 的紧凑 34px 控件带。

### 兼容性

- 在展开与收缩布局中与 `DSH-better-sidebar` 的 28px 控件保持同一中心线，不移动外部插件的常驻按钮。
- 增加宿主 DOM 归属、精确盒模型尺寸、无障碍名称和顶栏间距的回归测试。
- 轻量安装器同步固定 Codex UI `0.2.86`；旧聚合 Suite 继续保持私有，不参与发布。

发布包：[`@michengai/dsh-codex-ui@0.2.86`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.86) 与 [`@michengai/dsh-codex-suite-installer@0.1.3`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.3)。

## 0.2.85 — 2026-08-25

配套版本：`@michengai/dsh-codex-suite-installer@0.1.2`。

### 调整

- 从“设置 → 关于 → 配套管理插件”移除体验不佳的 `dsh-find-plugin`，不再提供检测、安装或更新入口。
- 同步移除中英文案、README 说明和相关回归断言。

### 发布流程

- `@michengai/dsh-codex-suite-installer` 作为唯一一键安装方式；旧 `@michengai/dsh-codex-suite` 标记为私有工作区包，仅保留源码支持存量迁移，不再打包或发布新版本。

发布包：[`@michengai/dsh-codex-ui@0.2.85`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.85) 与 [`@michengai/dsh-codex-suite-installer@0.1.2`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.2)。

## 0.2.84 — 2026-08-25

配套版本：`@michengai/dsh-codex-suite@0.1.16` 与 `@michengai/dsh-codex-suite-installer@0.1.1`。

### 新增

- 将 `dsh-find-plugin` 作为“插件发现”加入“设置 → 关于 → 配套管理插件”，可单独检测、安装和更新，也支持“全部更新”。

### 文档

- 明确 `dshmarket` 与 `dsh-find-plugin` 均为 Suite 外的可选独立插件，需要时可在“关于”页分别安装和更新。

发布包：[`@michengai/dsh-codex-ui@0.2.84`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.84)、[`@michengai/dsh-codex-suite@0.1.16`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.16) 与 [`@michengai/dsh-codex-suite-installer@0.1.1`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.1)。

## 0.2.83 — 2026-08-24

配套版本：`@michengai/dsh-codex-suite@0.1.15` 与 `@michengai/dsh-codex-suite-installer@0.1.0`。

### 修复

- 将直接成员 CLI 拆成无运行时依赖的轻量安装器包，避免 `npx` 启动前解析聚合 Suite 的整棵 DSH 依赖树。
- `@michengai/dsh-codex-suite` 继续兼容旧版 `dsh plugin add`，所有推荐安装命令改用 `@michengai/dsh-codex-suite-installer`。

发布包：[`@michengai/dsh-codex-ui@0.2.83`](https://www.npmjs.com/package/@michengai/dsh-codex-ui/v/0.2.83)、[`@michengai/dsh-codex-suite@0.1.15`](https://www.npmjs.com/package/@michengai/dsh-codex-suite/v/0.1.15) 与 [`@michengai/dsh-codex-suite-installer@0.1.0`](https://www.npmjs.com/package/@michengai/dsh-codex-suite-installer/v/0.1.0)。

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
