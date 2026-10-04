# AI プロンプト作成コントラクト

ユーザーが「作りたい場面」を書くと、LLM が 1 回の依頼でプロンプトをまとめて書き、プロンプトグループとして保存する機能。
入口はプロンプトグループモーダルの「AI で作る」。

---

## 1. 方針

| 方針 | 内容 |
|---|---|
| 一発生成 | 会話しない。フォーム → 1 リクエスト → JSON → プレビュー → 保存。直しはプレビュー上の手編集 |
| シーンだけを書かせる | 場所・時間・構図・ポーズ・表情・動作。画風・品質・アーティスト・ネガティブは書かせない |
| 書き方を選ぶ | タグのみ / 自然文のみ / タグ＋自然文（`AiPromptStyle`） |
| 任意で任せる | 衣装（既定オン）、外見（髪や目の色など。既定オフ） |
| プロバイダーは自由 | OpenAI 互換 `chat/completions` を 1 実装。ベース URL・API キー・モデル名をユーザーが登録 |
| コピペモード | API を使わない。依頼文をコピーして任意の AI に貼り、答えを貼り戻す |

---

## 2. データモデル

### 2.1 SQLite（migration 030）

`ai_providers(id, name, base_url, api_key, model, json_mode, sort_order, created_at, updated_at)`

- `base_url` は API ルート（`.../v1`）。末尾の `/` と `/chat/completions` は保存時に取り除く
- `api_key` は NovelAI のキーと同じく平文保存。フロントエンドへは返さない（`hasApiKey` のみ）
- フォームの選択（書き方・個数・使う AI など）は settings の `ai_prompt_prefs`（JSON）

### 2.2 DTO（`models/ai.rs` / `src/types/ai.ts`）

| 型 | フィールド |
|---|---|
| `AiProviderDto` | `id, name, baseUrl, model, jsonMode, hasApiKey` |
| `SaveAiProviderRequest` | `id?, name, baseUrl, model, jsonMode, apiKey?`（`apiKey` 省略 = 既存を保持、`""` = 消す） |
| `AiPromptOptions` | `theme, characters, count(1..=40), style, detail, adult, includeAppearance, includeOutfit` |
| `AiPromptRequestDto` | `system, user` |
| `AiPromptItemDto` | `name, tags[], text, unknownTags[], removedTags[]` |
| `AiPromptResultDto` | `name, items[]` |

---

## 3. コマンド（`commands/ai.rs`）

| コマンド | 引数 | 戻り値 |
|---|---|---|
| `list_ai_providers` | — | `AiProviderDto[]` |
| `save_ai_provider` | `req: SaveAiProviderRequest` | `AiProviderDto` |
| `delete_ai_provider` | `id` | — |
| `build_ai_prompt_request` | `options` | `AiPromptRequestDto`（コピペモード用） |
| `parse_ai_prompt_response` | `raw, style` | `AiPromptResultDto`（コピペモード用） |
| `generate_ai_prompts` | `providerId, options` | `AiPromptResultDto` |

`generate_ai_prompts` は DB ロックを取ってプロバイダーを読み、ロックを放してから通信し、取り直して取り込む。

---

## 4. サービス

| モジュール | 役割 |
|---|---|
| `ai_provider` | プロバイダーの CRUD と入力検証 |
| `ai_client` | `POST {base_url}/chat/completions`。`json_mode` なら `response_format: json_object`。タイムアウト 180 秒 |
| `ai_prompt` | `build_request`（依頼文の組み立て。純粋関数）、`request_raw` |
| `ai_prompt_parse` | `parse_response`（返答の取り込み） |

### 4.1 AI に返させる JSON

```json
{"name":"<セット名>","items":[{"name":"<短い名前>","tags":"<カンマ区切り>","text":"<英語の文章>"}]}
```

`name` は依頼の言語、`tags` / `text` は英語。書き方で使わない欄は空にさせ、取り込み時にも捨てる。

### 4.2 取り込み（寛容に読む）

- `<think>…</think>`、前置き、コードフェンスを無視して最初の JSON 値を読む
- 途中で切れた返答は、最後に閉じた項目までを採用する
- 最上位が配列でもよい。`tags` は文字列でも配列でもよい
- タグは小文字・アンダースコア区切りにしてタグ DB（名前とエイリアス）と照合する
  - 見つかった → DB の正式名に置き換える
  - 見つからない → そのまま残し `unknownTags` に入れる（プレビューで警告表示）
  - 品質タグの固定リスト、`artist:` 接頭辞、DB のカテゴリがアーティスト(1)・メタ(5) → 取り除き `removedTags` に入れる
- 使える項目が 1 つも無ければ `Validation` エラー（返答の先頭 200 文字を添える。拒否された場合にその文面が見える）

---

## 5. フロントエンド

| ファイル | 役割 |
|---|---|
| `lib/ipc-ai.ts` | IPC ラッパー |
| `lib/ai-prompt.ts` | フォーム設定の保存・復元、`composePrompt`（タグ → 文章の順で結合）、プレビュー行 ↔ `TagInput` |
| `lib/ai-provider-presets.ts` | プロバイダーのひな形（名前とベース URL） |
| `stores/ai-provider-store.ts` | プロバイダー一覧 |
| `components/modals/ai/AiPromptDialog.tsx` | フォーム → プレビュー → 保存 |
| `components/modals/ai/AiPromptForm.tsx` / `AiPromptResult.tsx` | フォーム / プレビュー |
| `components/modals/ai/AiProvidersDialog.tsx` | プロバイダーの登録・編集・削除（設定ダイアログからも開く） |

保存は既存の `create_prompt_group` を使う（各項目 = 1 エントリ。`name` = 短い名前、`tag` = プロンプト）。

---

## 6. 未対応

- キャラクター別の欄への振り分け（現状は 1 項目 = 1 つのプロンプト文字列）
- 差分セット・漫画ページ向けのレシピ
- 既存グループへの追加生成、選んだ行だけの作り直し
