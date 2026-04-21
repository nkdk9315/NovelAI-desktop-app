# 設計上の重要な決定

## 7.1 Double-option パターン（nullable フィールドの3状態更新）

`UpdatePromptGroupRequest` の `thumbnail_path` / `wildcard_token` 等で使用。旧 `genre_id` 3状態は `default_genre_ids: Vec<String>` に置換済み。

| JSON | Rust | 意味 |
|------|------|------|
| フィールド省略 | `None` | 変更なし |
| `"thumbnailPath": null` | `Some(None)` | NULL にクリア |
| `"thumbnailPath": "xxx"` | `Some(Some("xxx"))` | 指定値にセット |

## 7.2 generate_image の Mutex ロック戦略

```
1. db.lock()      → Vibe情報 + Project情報取得 → drop(guard)
2. api_client.lock() → client.generate().await  → drop(guard)
3. ファイル書込 (ロック不要)
4. db.lock()      → image_repo::insert          → drop(guard)
```

DB ロックと API ロックを同時に保持しない。API 呼び出し中（数秒）に DB がブロックされるのを防ぐ。

## 7.3 novelai-api crate の型再利用

以下の型はサービス層内部でのみ使用し、IPC には露出しない:
- `GenerateParams`, `GenerateParamsBuilder`
- `GenerateResult`, `VibeEncodeResult`
- `NovelAIClient`
- `Model`, `Sampler`, `NoiseSchedule` (IPC では文字列として受け渡し、サービス層で `FromStr` parse)
- `GenerationCostParams`, `GenerationCostResult`

## 7.4 カテゴリ名マッピング

```rust
fn category_name(id: u8) -> &'static str {
    match id {
        0 => "一般タグ",
        1 => "アーティスト",
        3 => "作品名",
        4 => "キャラクター",
        5 => "メタ",
        _ => "その他",
    }
}
```

## 7.5 Vibe マージ戦略（プリセット × 単品 重複時）

フロントエンド（`ActionBar.tsx`）で生成リクエスト組み立て時に、同一 `vibeId` を1エントリに統合する。

**優先順位**:
1. **有効プリセットのVibes（先勝ち）** — `sidebarPresets` 配列順に走査。同一 vibeId が複数プリセットに含まれる場合、先に登場したプリセットの `strength` を採用
2. **単品Vibes（補完）** — プリセットに含まれない vibeId のみ追加

```
PresetA (enabled): vibe-1 (0.5), vibe-2 (0.8)
PresetB (enabled): vibe-1 (0.3), vibe-3 (0.6)
単品:               vibe-2 (0.4), vibe-4 (0.9)

→ 結果: vibe-1 (0.5), vibe-2 (0.8), vibe-3 (0.6), vibe-4 (0.9)
  vibe-1: PresetA先勝ち（PresetBの0.3は無視）
  vibe-2: PresetA先勝ち（単品の0.4は無視）
  vibe-3: PresetBから（PresetAに未登場）
  vibe-4: 単品から（プリセットに未登場）
```

コスト計算（`vibeCount`）もマージ後のユニーク数を使用。

## 7.6 アーティストタグのマージ順序（sidebarArtistTags → プリセット）

`ActionBar.tsx` の生成リクエスト組み立て時、`allArtistTags` を以下の順で結合する:

```
allArtistTags = [...sidebarArtistTags, ...activePresets.flatMap(p => p.artistTags)]
```

**優先順位**:
1. **`sidebarArtistTags`（直接入力、先頭）** — `useSidebarArtistTagsStore` が管理。プロジェクト別に永続化。
2. **有効プリセットのアーティストタグ** — `sidebarPresets` 配列順に追記。

重複除去は行わない（同名タグが複数エントリあっても API 側で許容）。
コスト計算（`artistTagCount`）は `allArtistTags.length` をそのまま使用。

## 7.7 Sidebar Preset Group Instance の三層構造

サイドバープリセットグループ機能は以下の 3 層で構成される:

| 層 | テーブル | 責務 |
|---|---|---|
| Folder | `preset_folders` | プリセットの静的分類（階層構造） |
| Instance | `sidebar_preset_group_instances` | `(project_id, folder_id, source_char, target_char)` を単位としたサイドバー配置 |
| Active Presets | `sidebar_preset_group_active_presets` | インスタンス内で有効化されたプリセット。強度上書きとアクティベーション時刻を持つ |

**強度の適用順**: per-preset 上書き値（NULL でなければ）→ インスタンスの `default_*_strength`。
**位置情報の競合解決**: 複数プリセットが同一キャラに異なる `position_x/y` を指定した場合、`activated_at` が最新のプリセットが wins（last-activated-wins）。

## 7.8 Strength Wrapping

強度 `s` が `1.0` でない場合、テキストは `"{s}::{text}::"` 形式でラップされる（NovelAI の重み記法）。

| strength | "red hair" |
|---|---|
| 1.0 | `red hair` |
| 0.5 | `0.5::red hair::` |
| 2.0 | `2.0::red hair::` |

有限性チェック（`is_finite()`）と範囲チェック（`1.0..=10.0`）は Service 層で実施。

## 7.9 キャラクター ID が FK でない設計

`sidebar_preset_group_instances.source_character_id` / `target_character_id` は UUID 文字列だが FK 制約を持たない。キャラクター情報が `GenerateParams` の JSON ブロブに格納されており、独立テーブルが存在しないため。フロントエンド/サービス層で整合性を担保する必要がある。

## 7.10 画像複数選択保存の設計

**課題**: 生成履歴から複数枚を一括保存したい（1枚ずつ or 全保存しかなかった）。

**選択**: `useHistoryStore` に `selectedImageIds: string[]` を追加し、ThumbnailGrid の各サムネイルにチェックボックスを重ねる方式。

**設計の判断点**:

| 検討事項 | 採用案 | 理由 |
|----------|--------|------|
| 選択 UI | ホバー時チェックボックス表示 | 常時表示はサムネイルの視認性を損なう |
| 選択状態の置き場 | `useHistoryStore` | 履歴と選択は同じドメイン; GenerationStore の `lastResult` とは分離 |
| 一括保存の実装 | フロントから `Promise.all(ids.map(ipc.saveImage))` | 新規 Rust コマンド不要。画像数は数十〜百程度なので並列 IPC で十分 |
| 表示選択との分離 | `lastResult`（primary 枠）と `selectedImageIds`（青枠）を別管理 | 「見ている画像」と「保存したい画像」は独立した操作 |

**エラーハンドリング**:
- ActionBar の `handleSave` / `handleSaveAll` を try/catch で包み、成功・失敗をトーストで通知
- `saveSelectedImages` の失敗も HistoryHeader 側で catch してトースト表示

## 7.11 V4 マルチキャラクタープロンプトを Character Reference として課金しない

**課題**: `CostDisplay` / `ActionBar` で `params.characters.length > 0` を `hasCharacterReference` として渡しており、キャラを 1 体でも追加すると `isOpusFree` が false になり `+5 Anlas` が加算されていた。Opus ユーザーが本来 0 Anlas で生成できるケースでも有料表示になっていた。

**選択**: `hasCharacterReference` を常に `false` に固定する。

**理由**: 本アプリの `characters` は V4 マルチキャラクタープロンプト（`CharacterConfig` — テキスト + `center_x/y`）であって、NovelAI の画像アップロード型 Character Reference とは別機能。NovelAI のコスト仕様（`novelai_api_client/docs/anlas-cost-calculation.md` §3.2）では Character Reference コストは画像 CharRef にのみ適用される。本アプリは画像 CharRef 機能を実装していないので、将来導入するまでは常に `false` で正しい。

## 7.12 Opus 無料判定から vibeCount を外す

**課題**: `src/lib/cost.ts` と サブモジュール `novelai_api::anlas` の `is_opus_free_generation` に `vibe_count == 0` 条件が入っており、サイドバープリセット経由で Vibe を 1 つでも有効化すると Opus プランでも有料価格を表示していた。NovelAI 実機では Vibe を使っていても生成本体は無料で、Vibe 5 個以上のときだけバッチ代が発生する。

**選択**: `src/lib/cost.ts` の `isOpusFree` 判定から `vibeCount === 0` を削除。`vibeBatchCost = max(0, vibeCount - 4) * 2` は `isOpusFree` と独立に加算されるので、`totalCost = 0`（Vibe ≤4）または `2 * (vibeCount - 4)`（Vibe ≥5）となり NovelAI の挙動と一致する。

`CostDisplay` の「Free」表示は `isOpusFree` ではなく `totalCost === 0` を基準にするよう変更（Opus + Vibe 5 個でバッチ代 2 Anlas のケースで誤って "Free" と表示しないため）。サブモジュール `novelai_api::anlas` 側も同じ修正が必要だが、フロントは `cost.ts` を直接使うため UI 上の表示は本アプリの修正だけで正しくなる。

## 7.13 履歴画像からの UI 状態復元（prompt_snapshot 内 ui_snapshot）

**課題**: 履歴サムネイルを Ctrl/Cmd+クリックで選び、そのとき使ったプロンプト・Vibe・サイドバープリセットを現在のセッションに戻したい。

**選択**: `GenerateImageRequest.uiSnapshot`（`Option<serde_json::Value>`）を追加し、Rust 側は中身を不透明 JSON として `prompt_snapshot` の `ui_snapshot` キーにそのまま保存する。フロント側 `restoreFromSnapshot` が `version` で分岐し、各 Zustand ストアの bulk setter（`setCharacters` / `setSelectedVibes` / `setSidebarPresets` / `setSidebarArtistTags` / `setTargets`）に書き戻す。

**設計の判断点**:

| 検討事項 | 採用案 | 理由 |
|----------|--------|------|
| DB スキーマ | `prompt_snapshot` 既存カラムに内包 | 新カラム追加はマイグレーション影響大。JSON ブロブ内なら前方互換で増やせる |
| Rust 側の型付け | `serde_json::Value` のまま通す | UI 状態の構造変更ごとに Rust の型定義を追いかけたくない。復元は完全にフロント責務 |
| バージョニング | `version: 1` フィールド + `restoreFromSnapshot` で分岐 | 将来の `v2` 追加時も `v1` データを壊さず移行できる |
| 旧画像の扱い | `ui_snapshot` 無し → "partial" を返して `width/height/steps/sampler/...` のみ復元 | Vibe/preset は再現不能でも、寸法・モデル情報は手繰れる価値があるため |
| macOS の Ctrl+クリック | `onClick` + `onContextMenu` 両方で復元をトリガ | macOS は Ctrl+クリック = 右クリック扱いで `click` が発火しないため、`contextmenu` 側で `preventDefault` + 復元を行う |
