# DSH Codex UI

[English](README.md) | 简体中文

独立 DSH Web 客户端插件，使用官方 `sidebar` 插槽替换左侧导航，不修改 DSH 源码和会话数据。原生消息、工具调用、权限、模型选择和流式输出均继续由 DSH 渲染。

开发交接入口见 [docs/00-交接入口/00-阅读导航.md](docs/00-交接入口/00-阅读导航.md)。

## 功能边界

- 自定义导航只占用 `sidebar`，并完整声明 `sidebar.workspaces`、`sidebar.settings` 与 `sidebar.footer.action`；第三方页脚动作可以继续注册。
- 工作区树由插件通过公开 `sidebar.workspaces` 插槽实现，保留原生层级、折叠、搜索、悬停和拖拽排序模型，并补充项目置顶及更完整的会话操作。
- 技能、连接器和归档会话作为 DSH 设置分区；技能和连接器目录按当前会话作用域读取，不泄露本地路径、命令或凭证。
- 会话内容区只调整容器与输入卡片视觉。轮次导航通过 DSH 现有聊天锚点跳转，不修改会话数据。

## 会话管理

项目与会话菜单只调用 DSH 公开服务。工作区树展示所有普通且未归档的会话，支持打开、本地置顶/取消置顶、标记未读/已读、重命名、归档、派生新会话、导出 ZIP、在资源管理器打开工作区、复制路径/标题/ID/深链，以及在新窗口打开。

置顶和未读状态仅保存在当前浏览器。DSH `0.1.0-rc.6` 未向客户端插件公开永久删除和撤销归档能力，因此插件不提供不可用的伪操作。

## 依赖与开发

运行时依赖全部以 `peerDependencies` 声明，由 DSH 宿主提供；开发期固定使用公开 npm 的 DSH `0.1.0-rc.6` 包进行类型检查和测试。执行 `pnpm install` 后，`pnpm test` 会运行纯函数断言及 client test runtime 的集成测试。

## 安装

在已构建的包目录中执行 `dsh plugin --profile web add .` 安装；卸载时执行 `dsh plugin --profile web remove @michengai/dsh-codex-ui`，默认侧栏会恢复。

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源许可。

## 致谢

会话管理工作流参考了 [Semidia/dsh-session-manager](https://github.com/Semidia/dsh-session-manager)。本插件通过 DSH 公开插槽和服务独立实现，不需要该项目使用的宿主源码补丁。
