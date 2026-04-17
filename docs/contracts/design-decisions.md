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
