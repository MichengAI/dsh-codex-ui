# DSH Codex UI

English | [简体中文](README.zh-CN.md)

An independent DSH Web client plugin that replaces the sidebar through the official `sidebar` slot. It does not modify DSH source code or conversation data. DSH continues to render native messages, tool calls, permissions, model selection, and streaming output.

For project handover documentation, see [docs/00-交接入口/00-阅读导航.md](docs/00-交接入口/00-阅读导航.md).

## Scope

- The custom navigation occupies only `sidebar` and declares `sidebar.workspaces`, `sidebar.settings`, and `sidebar.footer.action`, so third-party footer actions can continue to register.
- The workspace tree is a plugin implementation rendered through the public `sidebar.workspaces` slot. It keeps the native hierarchy, collapse, hover, and drag-ordering interaction model while adding project pinning and richer conversation actions; global search remains available from the sidebar header.
- Experts and skills open their dedicated management plugins from the DSH Settings panel. When either optional peer plugin is absent, the sidebar shows its package-specific installation prompt. Connectors remain this plugin's DSH Settings section; archived-conversation management is provided by a separate plugin. Connector catalogs never expose addresses, commands, or credentials.
- The conversation area changes only its container and composer-card visuals. Turn navigation jumps through existing DSH chat anchors and does not change the conversation data model.

## Session management

Project and conversation menus use only public DSH services. The workspace tree lists ordinary, active conversations and supports opening, local pin/unpin and unread markers, renaming, archiving, forking, ZIP export, opening the workspace folder, and copying the path/title/ID/deep link.

Pinned and unread state is browser-local. Permanent deletion and unarchiving are intentionally unavailable because DSH `0.1.0-rc.6` does not expose those operations to client plugins.

## Dependencies and development

All runtime dependencies are declared as `peerDependencies` and supplied by the DSH host. Development uses the publicly available DSH `0.1.0-rc.6` packages for type checking and tests. After `pnpm install`, `pnpm test` runs pure-function assertions and a client test runtime integration test.

## Installation

In the built package directory, run `dsh plugin --profile web add .`. To uninstall, run `dsh plugin --profile web remove @michengai/dsh-codex-ui`; the default sidebar is restored.

## License

Licensed under the [Apache License 2.0](LICENSE).

## Acknowledgements

The session-management workflow is inspired by [Semidia/dsh-session-manager](https://github.com/Semidia/dsh-session-manager). This plugin implements the workflow through public DSH slots and services and does not require its host-source patch.
