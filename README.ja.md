<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **DeepSeek Harness 向け最新インターフェース拡張スイート：入力履歴の即時呼び出し、フルスクリーン設定スキン、物理フロストガラス換膚、モジュール式サイドバー**

  [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

  [更新履歴](CHANGELOG.md) · [Apache-2.0](LICENSE)

  [![ライセンス: Apache-2.0](https://img.shields.io/badge/ライセンス-Apache--2.0-blue.svg)](LICENSE)
  [![npm package](https://img.shields.io/npm/v/%40michengai%2Fdsh-codex-ui.svg?label=npm%20package)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![npm ダウンロード数](https://img.shields.io/npm/dt/%40michengai%2Fdsh-codex-ui.svg?label=npm%20ダウンロード数&v=2)](https://www.npmjs.com/package/@michengai/dsh-codex-ui)
  [![DSH Web Plugin](https://img.shields.io/badge/DSH%20Web-Plugin-0f766e.svg)](https://github.com/MichengAI/dsh-codex-ui)
  [![Node.js 22 or later](https://img.shields.io/badge/Node.js-22%20or%20later-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

> **免責事項**：DSH Codex UI はコミュニティによって保守されている DeepSeek Harness（DSH）向け UI 拡張プラグインであり、DeepSeek AI 公式の製品ではありません。

---

## なぜ Codex UI 2.0 なのか？

DeepSeek Harness を日常的に使用する際、標準インターフェースでは設定モーダルの狭さ、単一のカラーテーマ、サイドバーの整理の難しさ、入力履歴の消失などの課題が生じることがあります。**Codex UI 2.0 はアーキテクチャから視覚デザインに至るまで全面的に再構築**され、**7つの独立したサブプラグイン**によって高性能・低侵入・ネイティブ志向の最新 UI システムを提供します：

* 🚀 **入力履歴の呼び出しとスマート予測**：インラインでの入力意図予測と補完（`Tab` で採用、`Alt+↓/↑` で候補切り替え）、ターミナル風の入力履歴（`↑` / `↓` 呼び出し）、アダプティブな幅調整ハンドル；
* 🪟 **フルスクリーン設定ワークベンチ**：狭いダイアログから脱却し、Ambient Ground 拡散キャンバスと浮遊カードワークベンチを採用；
* 🎨 **物理フロストガラスと換膚**：Codex カーボンブラックやミニマルペーパーホワイトを含む7種類の高品質配色、マイカ浮遊とフラットガラスの2つのレイアウトモード、3段階のマテリアルプリセットと地面光斑スイッチ；
* 🧭 **モジュール式サイドバー**：展開時はスムーズなアコーディオン収納とドラッグによる並べ替えに対応、折りたたみ時は**公式の 56px ネイティブレールに 100% 準拠**；
* 🧠 **スマートセッションタイトル**：最初のメッセージのセマンティクスを解析し、推論モデルの長文コンテキストにも適した規範的なタイトルを自動生成；
* 🌐 **公式全8言語のネイティブ多言語対応**：日本語、英語、中国語、スペイン語、フランス語、ドイツ語、ロシア語、ポルトガル語（`ja`, `en`, `zh`, `es`, `fr`, `de`, `ru`, `pt`）を完全サポート。UI 文言、タスク提案、右クリックメニュー、セッションタイトルが自動適応；
* 🖥️ **デスクトップネイティブウィンドウメニュー**：デスクトップ版のタイトルバーにヘルプメニューを追加し、ページ再読み込みやアプリ/Host の安全な再起動を提供；
* 📦 **エコシステム管理**：公式およびサードパーティプラグインの一元管理、バージョン検知、およびワンクリック一括アップデート。

---

## アーキテクチャ：7つのコアサブプラグイン

| サブプラグイン ID | 名称 | 機能 |
| :--- | :--- | :--- |
| `composer` | **入力欄拡張 (Composer)** | スマートインライン予測（`Tab` 採用）、ターミナル風入力履歴（`↑`/`↓`）、ワークスペース別独立保存、幅調整ハンドル、タスク提案カード。 |
| `settings-skin` | **ネイティブ設定スキン (Settings Skin)** | フルスクリーンワークベンチレイアウト、浮遊カードシステム、Ambient Ground 背景、ネイティブ検索。 |
| `theme` | **テーマとマテリアル (Theme)** | 7種類のカラーパレット、オリジナルフラット vs マイカ浮遊モード、3段階のぼかしプリセット、光斑トグル。 |
| `sidebar` | **モジュール式サイドバー (Sidebar)** | アコーディオン展開、ドラッグによる並び替え、未読/既読切り替え、公式 56px レールへの完全追従。 |
| `session-title` | **スマートタイトル (Session Title)** | 最初のプロンプトから標準タイトルを自動生成、8言語完全対応、最大 4096 トークンの推論に対応。 |
| `desktop-menu` | **デスクトップメニュー (Desktop Menus)** | デスクトップアプリのタイトルバー統合、ビュー更新およびクロスプラットフォーム対応の安全な再起動。 |
| `dependencies` | **連携管理 (Dependencies)** | 関連プラグインの集中ダッシュボード、リアルタイム npm ダウンロード数表示、ワンクリック一括更新。 |

---

## ホスト互換性

* **サポート対象世代**：DeepSeek Harness `0.2.x` 全系（`>=0.2.0-rc.1 <0.3.0-0`）；
* **検証済みビルド**：すべての `0.2.x` RC（`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`～`0.2.1-rc.5`, `0.2.2-rc.1`）；
* **実行要件**：Node.js `^22.19.0 || >=24.0.0`、pnpm `^11.0.0`。

---

## インストールと利用開始

### 方法 A: エージェントによる自動インストール（推奨）

ターミナル実行権限を持つエージェントに以下の指示を送信してください（`web` を対象プロファイル名に置き換えてください）：

```text
以下のコマンドを実行して、DSH プラグイン @michengai/dsh-codex-ui をローカルの web プロファイルにインストールしてください:
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
その後 dsh --profile web --dump-config で有効化を確認し、ブラウザの再読み込みを促してください。
```

### 方法 B: 手動インストール

PowerShell または MSYS Bash で実行します：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
dsh plugin --profile web add @michengai/dsh-codex-ui@latest --registry=https://registry.npmjs.org/
dsh --profile web --dump-config
```

インストール完了後、DSH Web を再起動し、ブラウザを強制再読み込み（`Ctrl + Shift + R` または `Cmd + Shift + R`）してください。

---

## ライセンス

[Apache License 2.0](LICENSE) に基づいて配布およびライセンスされています。
