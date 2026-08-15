# DSH Codex UI

English | [简体中文](README.md)

An independent DSH Web client plugin that replaces the sidebar through the official `sidebar` slot. It does not modify DSH source code or conversation data. DSH continues to render the native workspace tree, conversation menus, messages, tool calls, permissions, model selection, and streaming output.

For project handover documentation, see [docs/00-交接入口/00-阅读导航.md](docs/00-交接入口/00-阅读导航.md).

## Scope

- The custom navigation occupies only `sidebar` and declares `sidebar.workspaces`, `sidebar.settings`, and `sidebar.footer.action`, so third-party footer actions can continue to register.
- Pinned workspaces are browser-local shortcuts only. Conversation operations, archiving, and workspace management remain in the native DSH workspace browser.
- Skills, connectors, and archived conversations are DSH Settings sections. Skill and connector catalogs are scoped to the active conversation and never expose local paths, commands, or credentials.
- The conversation area changes only its container and composer-card visuals. Turn navigation jumps through existing DSH chat anchors and does not change the conversation data model.

## Dependencies and development

All runtime dependencies are declared as `peerDependencies` and supplied by the DSH host. Development uses the publicly available DSH `0.1.0-rc.6` packages for type checking and tests. After `pnpm install`, `pnpm test` runs pure-function assertions and a client test runtime integration test.

## Installation

In the built package directory, run `dsh plugin --profile web add .`. To uninstall, run `dsh plugin --profile web remove @michengai/dsh-codex-ui`; the default sidebar is restored.

## License

Licensed under the [Apache License 2.0](LICENSE).
