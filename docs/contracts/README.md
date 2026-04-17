# インターフェースコントラクト

フロントエンド（TypeScript）とバックエンド（Rust/Tauri）間の IPC 境界、および各レイヤー間の関数シグネチャを定義したドキュメント群。

## ファイル一覧

| ファイル | 内容 |
|---|---|
| [models.md](models.md) | DB Row 構造体 / IPC DTO / Request DTO / Row→DTO 変換 |
| [repositories.md](repositories.md) | Repository 層の全関数シグネチャ |
| [services.md](services.md) | Service 層の全関数シグネチャ |
| [commands.md](commands.md) | Tauri Command 定義（IPC エントリポイント）+ Tag DB |
| [frontend.md](frontend.md) | TypeScript 型定義 / IPC ラッパー / フロントエンドユーティリティ |
| [design-decisions.md](design-decisions.md) | 設計上の重要な決定 |
| [test-strategy.md](test-strategy.md) | テスト方針・テストケース一覧 |

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
| 2026-04-10 | Vibe UX強化に伴うDTO/Repository/Service/Command全面更新、Vibeマージ戦略追加 |
| 2026-04-16 | PR-C: Prompt Group overhaul — schema 009-020、DTO/Repo/Service/Command全面更新、system_group_settings互換シム |
| 2026-04-16 | PR-E: negative_prompt per entry — migration 021、TagInput/PromptGroupTagRow/Dto更新、SidebarPromptTag.negativePrompt、TargetPromptState.negativeOverride、assembleNegativeFromGroups追加 |
| 2026-04-16 | contracts.md を論理セクション別ファイルに分割 |
| 2026-04-17 | Token limit validation — `tokens` service/command 追加、`CountTokensRequest`/`CountTokensResponse` DTO、`usePromptTokenCounts` フック、`TokenCounter` コンポーネント、`ActionBar` で overflow 時 Generate ボタン無効化 |
