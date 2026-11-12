<p align="center">
  <img src="assets/branding/dsh-banner.png" alt="DSH Codex UI" width="100%">
</p>

<div align="center">

  # DSH Codex UI v2.0

  **DeepSeek Harness 向け最新インターフェース拡張スイート：入力履歴の即時呼び出し、フルスクリーン設定スキン、物理フロストガラス外観変更、モジュール式サイドバー**

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

DeepSeek Harness を日常的に使用する際、標準インターフェースでは設定モーダルの狭さ、単一のカラーテーマ、サイドバーの整理の難しさ、入力履歴の消失などの課題が生じることがあります。**Codex UI 2.0 はアーキテクチャから視覚デザインに至るまで全面的に再構築**され、**6つの独立サブプラグインと内蔵エコシステム管理**によって高性能・低侵入・ネイティブ志向の最新 UI システムを提供します：

* 🚀 **入力履歴の呼び出しとスマート予測**：インラインでの入力意図予測と補完（`Tab` で採用、`Alt+↓/↑` で候補切り替え）、ターミナル風の入力履歴（`↑` / `↓` 呼び出し）、アダプティブな幅調整ハンドル；
* 🪟 **フルスクリーン設定ワークベンチ**：狭いダイアログから脱却し、Ambient Ground 拡散キャンバスと浮遊カードワークベンチを採用；
* 🎨 **物理フロストガラスと外観変更**：Codex カーボンブラックやミニマルペーパーホワイトを含む13種類の高品質配色、マイカ浮遊とフラットガラスの2つのレイアウトモード、3段階のマテリアルプリセットとグラウンドグロー；
* 🧭 **モジュール式サイドバー**：展開時はスムーズなアコーディオン収納とドラッグによる並べ替えに対応、折りたたみ時は**公式の 56px ネイティブレールに 100% 準拠**；
* 🧠 **スマートセッションタイトル**：最初のメッセージのセマンティクスを解析し、推論モデルの長文コンテキストにも適した規範的なタイトルを自動生成；
* 🌐 **公式全8言語のネイティブ多言語対応**：日本語、英語、中国語、スペイン語、フランス語、ドイツ語、ロシア語、ポルトガル語（`ja`, `en`, `zh`, `es`, `fr`, `de`, `ru`, `pt`）を完全サポート。UI 文言、タスク提案、右クリックメニュー、セッションタイトルが自動適応；
* 🖥️ **デスクトップネイティブウィンドウメニュー**：デスクトップ版のタイトルバーにヘルプメニューを追加し、ページ再読み込みやアプリ/Host の安全な再起動を提供；
* 📦 **エコシステム管理**：公式およびサードパーティプラグインの一元管理、バージョン検知、およびワンクリック一括アップデート。

---

## アーキテクチャの進化：なぜゼロから再構築したのか？

### 1. 旧 1.x の課題：強引なコンポーネント上書きによる技術的負債
初期の DSH プラグインエコシステムでは、公式の Slots レジストリやヘッドレスコンポーネントがまだ整備されていませんでした。そのため、旧 1.x では DOM 要素の直接乗っ取りや高特異性 CSS の強制挿入に依存していました。
その結果、上游 DSH のわずかな DOM 変更でレイアウト崩れが発生したり、プラグインを無効化してもグローバル CSS 変数が残留する「半劣化」状態に陥るメンテナンスの限界に直面しました。

### 2. 2.0 の設計方針：公式ネイティブ機能の全面的な尊重
2.0.0 では、1.x の上書きコードを**すべて破棄**し、以下の設計原則を確立しました：
* 🏛️ **公式 Primitives と Slots の厳格な採用**：カスタム手描き CSS コントロールを廃止し、公式の `Switch` や `Button` を使用。折りたたみ時も公式 56px アイコンレールに厳格に整列；
* 🧩 **6 つのマイクロカーネルサブプラグインと内蔵モジュール**：疎結合かつ高凝集な設計により、独立したライフサイクル管理と明瞭な責務分離を実現；
* 🛡️ **Fail-Closed 安全弁と適応型 UI**：サブプラグインが無効化されると、注入されたスタイルを即座に消去し、設定カードも DOM から完全に除去されて初期状態にクリーン復帰；
* 🔒 **プロファイル完全分離**：明確なプロファイルディレクトリ解決により環境汚染を防止。

---

## アーキテクチャ：6つのコアサブプラグインと内蔵モジュール

| サブプラグイン ID | 名称 | 機能 |
| :--- | :--- | :--- |
| `composer` | **入力欄拡張 (Composer)** | スマートインライン予測（`Tab` 採用）、ターミナル風入力履歴（`↑`/`↓`）、会話ごと／ワークスペースごとの保存切替、幅調整ハンドル、タスク提案カード。 |
| `settings-skin` | **ネイティブ設定スキン (Settings Skin)** | フルスクリーンワークベンチレイアウト、浮遊カードシステム、Ambient Ground 背景、ネイティブ検索。 |
| `theme` | **テーマとマテリアル (Theme)** | 13種類のカラーパレット、オリジナルフラット vs マイカ浮遊モード、3段階のぼかしプリセット、グラウンドグロートグル。 |
| `sidebar` | **モジュール式サイドバー (Sidebar)** | アコーディオン展開、ドラッグによる並び替え、未読/既読切り替え、公式 56px レールへの完全追従。 |
| `session-title` | **スマートタイトル (Session Title)** | 最初のプロンプトから標準タイトルを自動生成、8言語完全対応、最大 4096 トークンの推論に対応。 |
| `desktop-menu` | **デスクトップメニュー (Desktop Menus)** | デスクトップアプリのタイトルバー統合、ビュー更新およびクロスプラットフォーム対応の安全な再起動。 |
| `dependencies` | **エコシステム管理 (内蔵機能)** | 関連プラグインの集中ダッシュボード、リアルタイム npm ダウンロード数表示、ワンクリック一括更新。 |

---

## 実際の画面プレビュー

> *以下のスクリーンショットは、`ego-browser` を用いて実際の DeepSeek Harness Web 実行環境からキャプチャしたものです。*

### 1. 没入型ワークスペースと入力エリア（ダークモード）
Codex Dark 配色と中央のヒーローアクション、プロンプトカード、適応型幅調整ハンドルおよび `↑↓` 履歴ヒントを備えた入力欄。

![ダークモード 会話と入力欄](assets/screenshots/conversation.png)

---

### 2. ミニマルペーパーワークスペース（ライトモード）
Ambient Ground の拡散光グラデーションを採用した Codex Light 配色で、目に優しく温かみのある読書体験を提供。

![ライトモード Ambient Ground ワークスペース](assets/screenshots/conversation-light.png)

---

### 3. フルスクリーン設定ワークベンチ（モジュール式カードシステム）
機能概要、外観とテーマ、連携プラグインの各カードで構成される広々とした設定ワークベンチ。

![フルスクリーン設定ワークベンチ](assets/screenshots/settings-about.png)

---

### 4. 外観カスタマイズとフロストガラス
14 種類の高品質テーマ配色と 1 つの公式デフォルト（Codex、Claude、Dracula、Cyberpunk、Solarized、Gruvbox、Catppuccin シリーズを網羅）。公式フラットガラスと浮動 Mica のデュアルレイアウトモード、3 段階のマテリアルプリセット（Clear / Standard / Frosted）、地面反射グロースイッチに対応。純粋な Design Token 動的注入とクリーンな破棄により、グローバルスタイルの汚染を防止します。

#### 内蔵テーマおよび配色スキーム一覧

| シリーズ | テーマ名 | ID | モード | ビジュアルスタイル | コア配色 (アクセント / 背景 / テキスト) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **公式** | **公式デフォルト** | `stock` | 自動 | システムに追従 ネイティブUI | Accent: ![](https://img.shields.io/badge/-%233b82f6-3b82f6) `#3b82f6` (ホストの明暗モードに追従、カスタムトークン非注入) |
| **Codex** | **Codex ダーク** | `codex-dark` | ダーク | 没入型カーボンダーク ギークな質感 | Accent: ![](https://img.shields.io/badge/-%23339cff-339cff) `#339cff` · BG: ![](https://img.shields.io/badge/-%2309090b-09090b) `#09090b` · Text: ![](https://img.shields.io/badge/-%23fafafa-fafafa) `#fafafa` |
|  | **Codex ライト** | `codex-light` | ライト | ミニマルペーパーホワイト 快適な読書 | Accent: ![](https://img.shields.io/badge/-%230169cc-0169cc) `#0169cc` · BG: ![](https://img.shields.io/badge/-%23ffffff-ffffff) `#ffffff` · Text: ![](https://img.shields.io/badge/-%2318181b-18181b) `#18181b` |
| **Claude** | **Claude ダーク** | `claude-dark` | ダーク | 温かみのある黒炭とテラコッタ | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23141414-141414) `#141414` · Text: ![](https://img.shields.io/badge/-%23fdfdfd-fdfdfd) `#fdfdfd` |
|  | **Claude ライト** | `claude-light` | ライト | 温かみのある和紙感とテラコッタ | Accent: ![](https://img.shields.io/badge/-%23d97757-d97757) `#d97757` · BG: ![](https://img.shields.io/badge/-%23faf9f5-faf9f5) `#faf9f5` · Text: ![](https://img.shields.io/badge/-%231f1e1d-1f1e1d) `#1f1e1d` |
| **Dracula** | **Dracula (ドラキュラ)** | `dracula` | ダーク | 吸血鬼ピンクとサイバーネオン | Accent: ![](https://img.shields.io/badge/-%23ff79c6-ff79c6) `#ff79c6` · BG: ![](https://img.shields.io/badge/-%23191a21-191a21) `#191a21` · Text: ![](https://img.shields.io/badge/-%23f8f8f2-f8f8f2) `#f8f8f2` |
| **Cyberpunk** | **Cyberpunk (サイバーパンク)** | `cyberpunk` | ダーク | 黒地にネオングリーン · マトリックス端末 | Accent: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` · BG: ![](https://img.shields.io/badge/-%23000a00-000a00) `#000a00` · Text: ![](https://img.shields.io/badge/-%2300ff41-00ff41) `#00ff41` |
| **Solarized** | **Solarized ダーク** | `solarized-dark` | ダーク | 深海墨緑と青碧 | Accent: ![](https://img.shields.io/badge/-%232aa198-2aa198) `#2aa198` · BG: ![](https://img.shields.io/badge/-%23002b36-002b36) `#002b36` · Text: ![](https://img.shields.io/badge/-%2393a1a1-93a1a1) `#93a1a1` |
|  | **Solarized ライト** | `solarized-light` | ライト | 羊皮紙と日光青 | Accent: ![](https://img.shields.io/badge/-%23268bd2-268bd2) `#268bd2` · BG: ![](https://img.shields.io/badge/-%23fdf6e3-fdf6e3) `#fdf6e3` · Text: ![](https://img.shields.io/badge/-%23586e75-586e75) `#586e75` |
| **Gruvbox** | **Gruvbox ダーク** | `gruvbox-dark` | ダーク | 泥炭深茶と暖金レトロ | Accent: ![](https://img.shields.io/badge/-%23fabd2f-fabd2f) `#fabd2f` · BG: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` · Text: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` |
|  | **Gruvbox ライト** | `gruvbox-light` | ライト | 牛皮紙黄とヴィンテージ | Accent: ![](https://img.shields.io/badge/-%23b57614-b57614) `#b57614` · BG: ![](https://img.shields.io/badge/-%23fbf1c7-fbf1c7) `#fbf1c7` · Text: ![](https://img.shields.io/badge/-%23282828-282828) `#282828` |
| **Catppuccin** | **Mocha (モカ)** | `catppuccin-mocha` | ダーク | モカダーク 目に優しい落ち着き | Accent: ![](https://img.shields.io/badge/-%23cba6f7-cba6f7) `#cba6f7` · BG: ![](https://img.shields.io/badge/-%2311111b-11111b) `#11111b` · Text: ![](https://img.shields.io/badge/-%23cdd6f4-cdd6f4) `#cdd6f4` |
|  | **Macchiato (マキアート)** | `catppuccin-macchiato` | ダーク | マキアートダーク 優雅で柔らかなトーン | Accent: ![](https://img.shields.io/badge/-%23c6a0f6-c6a0f6) `#c6a0f6` · BG: ![](https://img.shields.io/badge/-%23181926-181926) `#181926` · Text: ![](https://img.shields.io/badge/-%23cad3f5-cad3f5) `#cad3f5` |
|  | **Frappé (フラッペ)** | `catppuccin-frappe` | ダーク | フラッペダーク 透明感のあるミスト | Accent: ![](https://img.shields.io/badge/-%23ca9ee6-ca9ee6) `#ca9ee6` · BG: ![](https://img.shields.io/badge/-%23232634-232634) `#232634` · Text: ![](https://img.shields.io/badge/-%23c6d0f5-c6d0f5) `#c6d0f5` |
|  | **Latte (ラテ)** | `catppuccin-latte` | ライト | ラテウォームホワイト 暖かく軽快 | Accent: ![](https://img.shields.io/badge/-%238839ef-8839ef) `#8839ef` · BG: ![](https://img.shields.io/badge/-%23eff1f5-eff1f5) `#eff1f5` · Text: ![](https://img.shields.io/badge/-%234c4f69-4c4f69) `#4c4f69` |

---

### 5. モジュール式サイドバーナビゲーション（展開時）
自由に並べ替え可能なナビゲーション項目、アコーディオン引き出しによるツール収納、およびピン留め行。

![モジュール式サイドバー（展開時）](assets/screenshots/sidebar.png)

---

### 6. 公式ネイティブ 56px レール（折りたたみ時）
公式の 56px コンパクトレールにシームレスに収まり、アイコンが整然と並び「新規チャット」が強調されます。

![公式ネイティブ 56px 折りたたみレール](assets/screenshots/sidebar-collapsed.png)

---

### 7. 拡張セッションメニュー
セッション行から直接利用できるクイック操作：ピン留め、名前変更、未読マーク、アーカイブ、フォーク、安全な削除。

![拡張セッションメニュー](assets/screenshots/session-menu.png)

---

## ホスト互換性

* **サポート対象世代**：DeepSeek Harness `0.2.x` 全系（`>=0.2.0-rc.1 <0.3.0-0`）；
* **検証済みビルド**：すべての `0.2.x` RC（`0.2.0-rc.1`, `0.2.0-rc.2`, `0.2.1-rc.1`～`0.2.1-rc.5`, `0.2.2-rc.1`）；
* **実行要件**：Node.js `^22.19.0 || >=24.0.0`、pnpm `^11.0.0`。

> ⚠️ **注意事項**：Codex UI と `ds-bot` を同時に有効化しないでください。サイドバーやセッションスロットの再設計が競合します。一方を有効にする前に、もう一方を無効化またはアンインストールしてください。

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

## 操作クイックリファレンス

| 機能 | 操作方法 |
| :--- | :--- |
| **入力予測を採用** | カーソルの後ろに薄い提案テキストが表示されたら `Tab` を押します。`Alt + ↓` / `Alt + ↑` で候補を切り替え、`Esc` で破棄します。 |
| **入力予測モードの設定** | **設定 → Codex UI** の「入力欄拡張」カードでモード（無効 / 続きのみ / 推測+続き）を選択します。プロファイル全体で停止するには `cordis.patch.yml` に `config.prediction: false` を設定します。 |
| **入力履歴の呼び出し** | 空の入力欄で `↑` / `↓` を押すと、現在の会話（または設定で切替可能な同一ワークスペース全体）の過去の入力（スコープごとに最大200件）を順に呼び出せます。 |
| **履歴の呼び出し範囲を切り替え** | **設定 → Codex UI → 入力欄の拡張** カードで「履歴の呼び出し範囲」を選択します：「現在の会話」（既定）ではこの会話の入力のみを呼び出します。「ワークスペース」に切り替えると同一 cwd のすべての会話と共有され、保存済みのワークスペース履歴も再び表示されます。 |
| **入力欄の幅調整** | 入力カードの左右の境界にマウスを乗せ、青いハンドルを左右にドラッグします。 |
| **テーマとぼかし切り替え** | **設定 → Codex UI** で 13 種類の配色やマイカ/オリジナルモード、マテリアルのぼかし度合いを選択します。 |
| **サイドバーの並べ替え** | アイコンを垂直方向にドラッグします。青いインジケーターに従って「その他」ドロワーへの出し入れが可能です。 |
| **サイドバーの折りたたみ** | サイドバー上部のトグルボタンをクリックすると、公式の 56px ネイティブレールに切り替わります。 |
| **プラグイン一括更新** | **設定 → Codex UI** の「連携管理プラグイン」カードで「すべてインストール/更新」をクリックします。 |

---

## エコシステム連携マトリクス

公式・公認のコンパニオンプラグインと組み合わせて、統一感のある開発ワークフローを構築できます：

| プラグイン | 用途 |
| :--- | :--- |
| [Codex UI](https://github.com/MichengAI/dsh-codex-ui) | **UI コア**：高速履歴呼び出し、設定スキン、フロストガラス、モジュール式サイドバー |
| [Agency Agents](https://github.com/MichengAI/dsh-agency-agents) | **専門家マトリクス**：特定タスクに特化した専門家エージェントの呼び出しとディスパッチ |
| [Skills Manager](https://github.com/MichengAI/dsh-skills-manager) | **スキルハブ**：ローカルエージェントスキルの検索、インポート、有効化、設定管理 |
| [Archive Manager](https://github.com/MichengAI/dsh-archive-manager) | **アーカイブ管理**：過去のセッションのディープ検索、復元、不要履歴の整理 |
| [IM Connect](https://github.com/MichengAI/dsh-im-connect) | **ブリッジ**：WeChat、DingTalk、Feishu、QQBot への接続連携 |
| [Automation](https://github.com/MichengAI/dsh-automation) | **自動化スケジューラ**：定期実行ワークフローと実行証跡の監査ログ |
| [Code Review](https://github.com/MichengAI/dsh-code-review) | **コードレビュー**：`/review` コマンドによるサブエージェント自律コード監査 |
| [Simplify](https://github.com/MichengAI/dsh-simplify) | **リファクタリング**：`/simplify` による4エージェント並列コードクリーンアップ |
| [PUA](https://github.com/MichengAI/dsh-pua) | **耐障害性**：障害回復、仮説切り替え、根拠検証によるタスク完遂支援 |
| [BTW](https://github.com/MichengAI/dsh-btw) | **サイドクエリ**：メインセッションのコンテキストを中断しない一時的な質問 |
| [Codex Pet](https://github.com/MichengAI/dsh-codex-pet) | **デスクトップペット**：承認リクエストや完了通知を行うインタラクティブペット |

---

## ライセンス

[Apache License 2.0](LICENSE) に基づいて配布およびライセンスされています。
