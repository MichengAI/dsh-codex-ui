# DSH Codex UI

独立 DSH Web 客户端插件，使用官方 `sidebar` 插槽替换左侧导航，不修改 DSH 源码和会话数据。原生项目树、会话菜单、消息、工具调用、权限、模型选择和流式输出均继续由 DSH 渲染。

开发交接入口见 [docs\00-交接入口\00-阅读导航.md](docs/00-交接入口/00-阅读导航.md)。

## 功能边界

- 自定义导航只占用 `sidebar`，并完整声明 `sidebar.workspaces`、`sidebar.settings` 与 `sidebar.footer.action`；第三方页脚动作可以继续注册。
- 项目置顶仅保存浏览器本地快捷入口；会话操作、归档和项目管理仍使用 DSH 原生工作区浏览器。
- 技能、连接器和归档会话作为 DSH 设置分区；技能和连接器目录按当前会话作用域读取，不泄露本地路径、命令或凭证。
- 会话内容区只调整容器与输入卡片视觉。轮次导航通过 DSH 现有聊天锚点跳转，不修改会话数据。

## 依赖与开发

运行时依赖全部以 `peerDependencies` 声明，由 DSH 宿主提供；开发期固定使用公开 npm 的 DSH `0.1.0-rc.6` 包进行类型检查和测试。执行 `pnpm install` 后，`pnpm test` 会运行纯函数断言及 client test runtime 的集成测试。

## 安装

在已构建的包目录中执行 `dsh plugin --profile web add .` 安装；卸载时执行 `dsh plugin --profile web remove @michengai/dsh-codex-ui`，默认侧栏会恢复。
