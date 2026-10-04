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
| [sprite-variants.md](sprite-variants.md) | 差分制作（F13）のデータモデル・コマンド・生成・書き出し |
| [ai-prompt.md](ai-prompt.md) | AI プロンプト作成のデータモデル・コマンド・依頼文・取り込み |

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
| 2026-04-10 | Vibe UX強化に伴うDTO/Repository/Service/Command全面更新、Vibeマージ戦略追加 |
| 2026-04-16 | PR-C: Prompt Group overhaul — schema 009-020、DTO/Repo/Service/Command全面更新、system_group_settings互換シム |
| 2026-04-16 | PR-E: negative_prompt per entry — migration 021、TagInput/PromptGroupTagRow/Dto更新、SidebarPromptTag.negativePrompt、TargetPromptState.negativeOverride、assembleNegativeFromGroups追加 |
| 2026-04-16 | contracts.md を論理セクション別ファイルに分割 |
| 2026-04-17 | Token limit validation — `tokens` service/command 追加、`CountTokensRequest`/`CountTokensResponse` DTO、`usePromptTokenCounts` フック、`TokenCounter` コンポーネント、`ActionBar` で overflow 時 Generate ボタン無効化 |
| 2026-09-25 | V5 対応 — novelai-api 更新、V5 モデル追加、`AnlasBalanceDto.opusUsage`、`CostEstimateRequest.model/opusUsageExhausted`、`CountTokensRequest.model`（Qwen）、`GenerateImageRequest.transparentBackground`、モデル別キャラ上限（V5: 32）、V5 で Vibe 無効 |
| 2026-09-26 | 画像編集・画像ツール — `GenerateImageRequest.characterReference`（`CharacterReferenceRequest`）、`ImageSourceRequest` / `AugmentImageRequest` / `UpscaleImageRequest` / `ImageToolResponse` / `ImageDataDto`、`image_output` / `image_tools` service、`commands/image_tools.rs`（augment_image / upscale_image / get_image_data / read_image_file）、prompt_snapshot に `action` / `character_reference` 要約、`CostEstimateRequest.mode/strength`、stores 15・新規 hooks / lib |
| 2026-09-26 | 公式のプロンプトオプション — アニメ / ケモノモード（`fur dataset` 接頭辞）、クオリティタグプリセット（モデル別の standard / light(V5) / none + カスタム登録）、透過タグをクオリティタグの前に移動、`src/lib/prompt-decoration.ts`・`quality-tag-store`、`UiSnapshotV1.qualityPreset/furryMode/transparentBackground`、`ParsedMetadata.qualityPreset/furryMode/transparentBackground`（`splitQuality` 廃止）、`QUALITY_TAGS` 定数廃止 |
| 2026-09-26 | セリフ・画像内テキスト — `src/lib/dialogue.ts`、`TargetPromptState.dialogue`、`DialogueEditor`、`generation-params-store.stripNoTextWithDialogue`（`UiSnapshotV1` にも保存）、吹き出しの種類 21 種（`bubble-styles.ts`、図形ピッカー、カスタム登録 `bubble-style-store`）、文字スタイル（`lettering-styles.ts`）、行ごとの向き、`PromptDecoration.stripNoText`、`hasTextMarker` / `withoutNoText`、`splitDecorations` の `Text:` 対応、先頭 `Text:` の前に空白を入れる |
| 2026-09-27 | 効果音・エフェクト — `in-image-text.ts`（セリフと効果音の `Text:` 共有、`appendTargetExtras` / `textIssues`、dialogue.ts の append/issue を移動）、`sound-effects.ts`、`manga-effects.ts`、`TargetPromptState.sfx/effects`、`generation-params-store.autoSfx`（`UiSnapshotV1` にも保存）、`shouldStripNoText`（効果音があれば no text を自動で外す）、`SfxEditor` / `SfxRow` / `EffectPalette` |
| 2026-09-27 | 漫画モード — `manga-layouts.ts`（5 レイアウト）/ `manga-page.ts` / `manga-compose.ts` / `manga-request.ts`、`manga-store`、`use-project-manga-persistence`、`UiSnapshotV1.mangaPage`、`shouldStripNoText` の漫画対応、`left-panel/manga/*`、`EffectToggleGrid` |
| 2026-09-27 | 写植 — `save_typeset_image` コマンド / `image_tools::save_typeset`・`typeset_snapshot`、`SaveTypesetRequest`、履歴アクション `typeset`、`lib/typeset.ts`・`typeset-render.ts`、`typeset-store`、`use-undoable`、`modals/typeset/*`、画像ツールバーと履歴右クリックに「写植」 |
| 2026-09-29 | 漫画のコマ割り・衣装 — `manga-geometry.ts`（分割・結合・読み順・ラベル）、`manga-template.ts`（斜めコマの線画 img2img）、`MangaPage.layoutId="custom"`/`aspect`・`MangaPanel.shape`、`manga-template-store`、レイアウトエディタ、`Character.outfits/outfitId`・`outfits.ts`・`character-look.ts`、`MangaCast.outfitId/excludeTags`、場面・動作のプロンプトターゲット化（`PromptTargetInput`） |
| 2026-09-29 | 差分制作（F13）— `sprite-variants.md` を追加。migration 029（`sprite_sets` / `sprite_cells` / `sprite_candidates`）、`project_type = "sprite"`、`commands/sprites.rs`、`RequestOverrides.mainSuffix/negativeSuffix/seed/snapshotExtra` |
| 2026-10-01 | AI プロンプト作成 — `ai-prompt.md` を追加。migration 030（`ai_providers`）、`commands/ai.rs`、`services/ai_provider` / `ai_client` / `ai_prompt` / `ai_prompt_parse`、`repositories/ai_provider` / `tag_lookup`、`models/ai.rs`、`ipc-ai.ts`・`ai-provider-store`・`modals/ai/*`。`db.rs` のマイグレーションを表にまとめた |
