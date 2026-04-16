# NovelAI Desktop App - ドメインモデル

## 1. エンティティ定義

### Project（プロジェクト）

画像生成作業の単位。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| name | TEXT | プロジェクト名 |
| project_type | TEXT | `simple` / `manga` / `cg` |
| directory_path | TEXT | 画像保存先ディレクトリの絶対パス |
| thumbnail_path | TEXT (NULL許容) | サムネイル画像パス |
| created_at | TEXT (ISO 8601) | 作成日時 |
| updated_at | TEXT (ISO 8601) | 更新日時 |

### Genre（ジャンル）

プロンプトグループの分類カテゴリ。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK。システムジャンルは固定ID |
| name | TEXT | ジャンル名（UNIQUE） |
| is_system | INTEGER | 1=システム（削除不可）、0=ユーザー作成 |
| sort_order | INTEGER | 表示順 |
| created_at | TEXT (ISO 8601) | 作成日時 |

システムジャンル初期データ:
- `genre-male` / 男 / is_system=1 / sort_order=0
- `genre-female` / 女 / is_system=1 / sort_order=1
- `genre-other` / その他 / is_system=1 / sort_order=2

### PromptGroup（プロンプトグループ）

再利用可能なプロンプトタグの集合。PR-C で大幅改修（migrations 009-012, 016, 020）。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK。システムグループは `system-group-cat-{n}` 固定ID |
| name | TEXT | グループ名 |
| genre_id | TEXT | **Legacy** — migration 020 で NULL 化。列は残存 |
| is_default_for_genre | INTEGER | Legacy。`prompt_group_default_genres` に移行 |
| is_system | INTEGER | 1=システム（削除不可） |
| usage_type | TEXT | `main` / `character` / `both` |
| created_at / updated_at | TEXT (ISO 8601) | 日時 |
| thumbnail_path | TEXT | サムネイル (009) |
| is_default | INTEGER | サイドバー初期表示 (009) |
| category | INTEGER | CSV カテゴリ ID（システムグループのみ） (009) |
| default_strength | REAL | グループ単位デフォルト強度 (011) |
| random_mode | INTEGER | ランダム選択モード (016) |
| random_count | INTEGER | ランダム選択数 (016) |
| random_source | TEXT | `'all'` / `'enabled'` (016) |
| wildcard_token | TEXT | ワイルドカード置換トークン (016) |

### PromptGroupTag（プロンプトグループタグ）

名前付きエントリに拡張（migration 010）。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| prompt_group_id | TEXT | FK → PromptGroup.id（CASCADE） |
| name | TEXT | 表示名（空文字可）(010) |
| tag | TEXT | タグ文字列 |
| sort_order | INTEGER | 表示順 |
| default_strength | INTEGER | 強度 (009) |
| thumbnail_path | TEXT | サムネイル (009) |

### PromptGroupDefaultGenres（migration 020）

多対多ジャンル関連。旧 `genre_id` + `system_group_genre_defaults` を置換。

| フィールド | 型 | 説明 |
|------------|-----|------|
| prompt_group_id | TEXT | PK (1) |
| genre_id | TEXT | PK (2)。FK → Genre.id（CASCADE） |

### System Prompt Groups（PR-C）

起動時 `seed_system_prompt_groups()` が CSV カテゴリ毎に `prompt_groups` へ挿入（`is_system=1`）。タグは `SystemPromptDB`（in-memory）から `list_system_group_tags` で提供。

| ID | category | name |
|---|---|---|
| `system-group-cat-0` | 0 | General Tags |
| `system-group-cat-1` | 1 | Artist Tags |
| `system-group-cat-3` | 3 | Works Tags |
| `system-group-cat-4` | 4 | Character Tags |
| `system-group-cat-5` | 5 | Meta Tags |

### GeneratedImage（生成画像）

生成された画像のメタデータ。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| project_id | TEXT | FK → Project.id（CASCADE DELETE） |
| file_path | TEXT | プロジェクトディレクトリからの相対パス |
| seed | INTEGER | 使用されたseed値 |
| prompt_snapshot | TEXT (JSON) | 生成時の全パラメータスナップショット |
| width | INTEGER | 画像幅 |
| height | INTEGER | 画像高さ |
| model | TEXT | 使用モデルID |
| is_saved | INTEGER | 0=未保存（クリーンアップ対象）、1=保存済み |
| created_at | TEXT (ISO 8601) | 生成日時 |

### Vibe（バイブ）

インポートされた`.naiv4vibe`ファイルのメタデータ。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| name | TEXT | 表示名 |
| file_path | TEXT | `$APPDATA/novelai-desktop/vibes/`内の絶対パス |
| model | TEXT | エンコード時のモデルID |
| created_at | TEXT (ISO 8601) | 作成日時 |
| thumbnail_path | TEXT (NULL許容) | サムネイル画像パス（`$APPDATA/vibe-thumbnails/{id}.ext`） |
| is_favorite | INTEGER | 0=通常、1=お気に入り |

### ProjectVibe（プロジェクト×Vibe中間テーブル）

プロジェクトに紐付けられたVibeの管理。

| フィールド | 型 | 説明 |
|------------|-----|------|
| project_id | TEXT | FK → Project.id（CASCADE DELETE） |
| vibe_id | TEXT | FK → Vibe.id（CASCADE DELETE） |
| is_visible | INTEGER | 1=サイドバーに表示、0=非表示 |
| added_at | TEXT | 追加日時（DEFAULT datetime('now')） |

複合PK: (project_id, vibe_id)

### StylePreset（スタイルプリセット）

アーティストタグ + Vibeの組み合わせ。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| name | TEXT | プリセット名 |
| artist_tags | TEXT (JSON Array) | `ArtistTag[]`（`{name, strength}`のJSON配列） |
| created_at | TEXT (ISO 8601) | 作成日時 |
| thumbnail_path | TEXT (NULL許容) | サムネイル画像パス（`$APPDATA/preset-thumbnails/{id}.ext`） |
| is_favorite | INTEGER | 0=通常、1=お気に入り |
| model | TEXT | 対象モデルID |

### StylePresetVibe（スタイルプリセット×Vibe中間テーブル）

| フィールド | 型 | 説明 |
|------------|-----|------|
| style_preset_id | TEXT | FK → StylePreset.id（CASCADE DELETE） |
| vibe_id | TEXT | FK → Vibe.id（CASCADE DELETE） |
| strength | REAL | Vibe強度（デフォルト0.7） |

複合PK: (style_preset_id, vibe_id)

### Settings（設定）

Key-Valueストア。

| フィールド | 型 | 説明 |
|------------|-----|------|
| key | TEXT | PK。設定キー |
| value | TEXT | 設定値 |

想定キー: `api_key`, `default_model`, `default_width`, `default_height`, `default_steps`, `default_sampler`, `default_noise_schedule`, `default_scale`

### Tag Database（タグデータベース — migration 013–014）

Danbooru タグの階層グループをバンドル済み JSON から seed し、trigram FTS5 インデックス付きで保持する。オートコンプリートと PromptGroup 編集の両方から参照される。

| テーブル | 用途 |
|---|---|
| `tags` | タグ本体（`id`, `name`, `csv_category`） |
| `tags_fts` | `tags.name` の trigram FTS5 シャドウインデックス |
| `tag_groups` | タグの階層グループ（`slug`, `title`, `parent_id`, `kind`, `source`, `sort_key`, `is_favorite`）。`source = 'seed'` は read-only, `source = 'user'` のみ rename/move/delete 可 |
| `tag_group_members` | タグ×グループ中間テーブル（`tag_id`, `group_id`, `source`） |

**migration 014** で `tag_groups.is_favorite` を追加。PromptGroupModal は favorited ブランチのみ表示する運用のため、ユーザが毎回全タグ DB を展開せずに済む。

Seed ソース: `src-tauri/resources/tag_groups.json`, `character_groups.json`（両方とも scraper 出力）。起動時 `services::tag_seed::seed_if_empty` が `tags` 空のときだけ走る（失敗時は startup を bail、半端 seed 状態で起動しない）。

検索経路:
- 3 文字以上: `repositories::tag::search` が `tags_fts MATCH` で trigram 検索
- 1〜2 文字: `repositories::tag::search_like` が LIKE フォールバック
- FTS5 エスケープ（クォート・ダブルクォート escape）はリポジトリ層 `to_fts_match` に閉じている

---

## 2. エンティティリレーション図

```
┌──────────┐       ┌──────────────┐       ┌────────────────┐
│  Genre   │1    * │ PromptGroup  │1    * │ PromptGroupTag │
│          │───────│              │───────│                │
│ id       │       │ id           │       │ id             │
│ name     │       │ name         │       │ prompt_group_id│
│ is_system│       │ genre_id (FK)│       │ tag            │
│ sort_ordr│       │ is_default   │       │ sort_order     │
└──────────┘       │ is_system    │       └────────────────┘
                   │ usage_type   │
                   └──────────────┘

┌──────────┐       ┌────────────────┐
│ Project  │1    * │ GeneratedImage │
│          │───────│                │
│ id       │       │ id             │
│ name     │       │ project_id (FK)│
│ type     │       │ file_path      │
│ dir_path │       │ seed           │
└──────────┘       │ prompt_snapshot │
                   │ is_saved       │
                   └────────────────┘

┌──────────┐       ┌──────────────────┐       ┌─────────────┐
│  Vibe    │*    * │StylePresetVibe   │*    1 │ StylePreset │
│          │───────│                  │───────│             │
│ id       │       │ vibe_id (FK)     │       │ id          │
│ name     │       │ style_preset_id  │       │ name        │
│ file_path│       │     (FK)         │       │ artist_tags │
│ model    │       │ strength         │       │ model       │
│ thumb_..│       └──────────────────┘       │ thumb_path  │
│ is_fav   │                                  │ is_favorite │
└──────────┘                                  └─────────────┘
      │
      │ *    *
┌─────┴──────────┐
│ ProjectVibe    │
│                │
│ project_id(FK) │───── Project
│ vibe_id (FK)   │
│ is_visible     │
│ added_at       │
└────────────────┘

┌──────────┐
│ Settings │
│          │
│ key (PK) │
│ value    │
└──────────┘
```

---

## 3. SQLiteスキーマ定義

```sql
-- ジャンル
CREATE TABLE IF NOT EXISTS genres (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    is_system   INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO genres (id, name, is_system, sort_order) VALUES
    ('genre-male',   '男',    1, 0),
    ('genre-female', '女',    1, 1),
    ('genre-other',  'その他', 1, 2);

-- プロンプトグループ
CREATE TABLE IF NOT EXISTS prompt_groups (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    genre_id              TEXT,              -- legacy, NULL post-020
    is_default_for_genre  INTEGER NOT NULL DEFAULT 0, -- legacy
    is_system             INTEGER NOT NULL DEFAULT 0,
    usage_type            TEXT NOT NULL DEFAULT 'both',
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
    thumbnail_path        TEXT,
    is_default            INTEGER NOT NULL DEFAULT 0,
    category              INTEGER,
    default_strength      REAL NOT NULL DEFAULT 0,
    random_mode           INTEGER NOT NULL DEFAULT 0,
    random_count          INTEGER NOT NULL DEFAULT 1,
    random_source         TEXT NOT NULL DEFAULT 'enabled',
    wildcard_token        TEXT
);

CREATE TABLE IF NOT EXISTS prompt_group_tags (
    id              TEXT PRIMARY KEY,
    prompt_group_id TEXT NOT NULL REFERENCES prompt_groups(id) ON DELETE CASCADE,
    name            TEXT NOT NULL DEFAULT '',
    tag             TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    default_strength INTEGER NOT NULL DEFAULT 0,
    thumbnail_path  TEXT
);

CREATE INDEX IF NOT EXISTS idx_prompt_group_tags_group
    ON prompt_group_tags(prompt_group_id);

CREATE TABLE IF NOT EXISTS prompt_group_default_genres (
    prompt_group_id TEXT NOT NULL,
    genre_id        TEXT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_group_id, genre_id)
);

-- プロジェクト
CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    project_type    TEXT NOT NULL DEFAULT 'simple',
    directory_path  TEXT NOT NULL,
    thumbnail_path  TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 生成画像
CREATE TABLE IF NOT EXISTS generated_images (
    id              TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    seed            INTEGER NOT NULL,
    prompt_snapshot TEXT NOT NULL,
    width           INTEGER NOT NULL,
    height          INTEGER NOT NULL,
    model           TEXT NOT NULL,
    is_saved        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_generated_images_project
    ON generated_images(project_id);

-- Vibe
CREATE TABLE IF NOT EXISTS vibes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    model           TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    thumbnail_path  TEXT,
    is_favorite     INTEGER NOT NULL DEFAULT 0
);

-- プロジェクト × Vibe
CREATE TABLE IF NOT EXISTS project_vibes (
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vibe_id     TEXT NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
    is_visible  INTEGER NOT NULL DEFAULT 1,
    added_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (project_id, vibe_id)
);

-- スタイルプリセット
CREATE TABLE IF NOT EXISTS style_presets (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    artist_tags     TEXT NOT NULL DEFAULT '[]',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    thumbnail_path  TEXT,
    is_favorite     INTEGER NOT NULL DEFAULT 0,
    model           TEXT NOT NULL DEFAULT ''
);

-- スタイルプリセット × Vibe
CREATE TABLE IF NOT EXISTS style_preset_vibes (
    style_preset_id TEXT NOT NULL REFERENCES style_presets(id) ON DELETE CASCADE,
    vibe_id         TEXT NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
    strength        REAL NOT NULL DEFAULT 0.7,
    PRIMARY KEY (style_preset_id, vibe_id)
);

-- 設定
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 4. データフロー

### 4.1 画像生成フロー

```
[Frontend]                    [Tauri Backend]                [novelai-api crate]
    │                              │                              │
    │ generate_image(params)       │                              │
    │─────────────────────────────>│                              │
    │                              │ 1. Vibes取得 (DB → ファイル)  │
    │                              │ 2. GenerateParams構築         │
    │                              │    (Builder pattern)          │
    │                              │ 3. client.generate()          │
    │                              │─────────────────────────────>│
    │                              │                              │ HTTP POST
    │                              │                              │ (ZIP/msgpack)
    │                              │    GenerateResult             │
    │                              │<─────────────────────────────│
    │                              │ 4. 画像ファイル保存            │
    │                              │    (project/images/)          │
    │                              │ 5. DBレコード挿入             │
    │                              │    (is_saved=0)               │
    │  { image_base64, seed,       │                              │
    │    image_id, anlas }         │                              │
    │<─────────────────────────────│                              │
    │ 6. 画像表示 + 履歴追加       │                              │
```

### 4.2 プロンプト組み立てフロー

```
[ユーザー操作]
    │
    ├─ メインプロンプト入力 ─────────────────────> main_prompt
    ├─ メインネガティブ入力 ─────────────────────> main_negative
    ├─ プロンプトグループ選択 → タグ連結 ────────> main_prompt に追記
    │
    ├─ キャラクター追加（ジャンル選択）
    │   ├─ デフォルトグループ自動適用 ───────────> char_prompt 初期値
    │   ├─ 追加グループ選択 → タグ連結 ─────────> char_prompt に追記
    │   └─ ネガティブ入力 ──────────────────────> char_negative
    │
    ├─ アーティストタグ選択 ────────────────────> main_prompt に追記
    │
    ├─ Vibeマージ（vibeIdで重複排除）
    │   1. 有効プリセットのVibes（先勝ち: 先のプリセットの strength を採用）
    │   2. 単品Vibes（プリセットに未登場の vibeId のみ追加）
    │   ※ 同一 vibeId は1エントリに統合。プリセット > 単品の優先順
    │
    └─ [Generate]
        │
        ▼
    GenerateParams {
        prompt: main_prompt,                       ← 連結済み
        negative_prompt: main_negative,
        characters: [
            CharacterConfig {
                prompt: char_prompt,               ← グループタグ連結済み
                negative_prompt: char_negative,
                center_x, center_y
            },
            ...
        ],
        vibes: [VibeConfig { ... }, ...],          ← マージ済み（vibeId重複なし）
        model, width, height, steps, scale, ...
    }
        │
        ▼
    v4_prompt JSON構造に変換（payload.rs）
```

### 4.3 プロジェクト開閉フロー

```
[プロジェクトを開く]
    │
    ▼
cleanup_unsaved_images(project_id)
    │
    ├─ SELECT file_path FROM generated_images
    │  WHERE project_id = ? AND is_saved = 0
    │
    ├─ 各ファイルをディスクから削除
    │
    ├─ DELETE FROM generated_images
    │  WHERE project_id = ? AND is_saved = 0
    │
    └─ 残った画像（is_saved=1）を履歴として読み込み
```

### 4.4 Vibeインポートフロー

```
[ユーザー: ファイル選択 / D&D]
    │
    ▼
VibeImportDialog（名前・サムネイル入力）
    │
    ▼
add_vibe(file_path, name, thumbnail_path?)
    │
    ├─ .naiv4vibeファイルを$APPDATA/novelai-desktop/vibes/にコピー
    ├─ ファイル内容を解析してモデル情報を取得
    ├─ サムネイル画像コピー（任意、拡張子ホワイトリスト検証）
    ├─ DBにVibeレコード挿入
    │
    └─ VibeDto返却 → UI一覧に追加
```

### 4.5 Vibeエンコードフロー

```
[ユーザー: 画像ファイル選択 / D&D]
    │
    ▼
VibeEncodeDialog（名前・情報抽出度入力）
    │
    ▼
encode_vibe(image_path, model, name, information_extracted)
    │
    ├─ APIクライアントで encode_vibe 呼び出し (2 Anlas消費)
    ├─ .naiv4vibeファイルを$APPDATA/novelai-desktop/vibes/に保存
    ├─ ソース画像をサムネイルとしてコピー
    ├─ DBにVibeレコード挿入
    │
    └─ VibeDto返却 → UI一覧に追加
```

---

## 5. システムプロンプトデータ構造

### ソースファイル

`novelai_api_client/danbooru_content/ChenkinNoob-XL-V0.3_underscore.csv`

### CSV形式

```
tag_name,category,post_count,aliases
```

- ヘッダー行なし
- aliases はカンマ区切り（ダブルクォートで囲まれた場合あり）
- aliases が空の行もある

### カテゴリマッピング

| ID | Danbooru名称 | アプリ内表示名 | 件数 |
|----|-------------|---------------|------|
| 0 | General | 一般タグ | 47,756 |
| 1 | Artist | アーティスト | 60,631 |
| 2 | - | その他 | 166 |
| 3 | Copyright | 作品名 | 10,207 |
| 4 | Character | キャラクター | 43,729 |
| 5 | Meta | メタ | 4,879 |
| 6 | - | その他 | 2 |
| 7 | - | その他 | 437 |
| 8 | - | その他 | 100 |

### メモリ上のデータ構造（Rust側）

```rust
pub struct SystemTag {
    pub name: String,
    pub category: u8,
    pub post_count: u64,
    pub aliases: Vec<String>,
}

pub struct SystemPromptDB {
    pub tags: Vec<SystemTag>,           // post_countでソート済み
    pub by_category: HashMap<u8, Vec<usize>>,  // カテゴリ → tagsインデックス
}
```

---

## 6. Tauriコマンドインターフェース

### 設定・認証

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `get_settings` | - | `HashMap<String, String>` | 全設定取得 |
| `set_setting` | key, value | - | 設定保存 |
| `initialize_client` | api_key | - | APIクライアント初期化 |
| `get_anlas_balance` | - | `AnlasBalanceDto` | 残高取得 |

### プロジェクト

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `list_projects` | search?, project_type? | `Vec<ProjectDto>` | 一覧（名前検索・ジャンルフィルター） |
| `create_project` | name, project_type, directory_path?, thumbnail_path? | `ProjectDto` | 作成（directory_path 省略時は自動計算） |
| `update_project` | UpdateProjectRequest | `ProjectDto` | 名前・サムネイル更新 |
| `update_project_thumbnail` | id, thumbnail_path? | `ProjectDto` | サムネイル単体更新（null でクリア） |
| `get_default_project_dir` | project_type, name | `String` | デフォルト保存先パスを取得 |
| `open_project` | id | `ProjectDto` | 開く + 未保存画像クリーンアップ |
| `delete_project` | id | - | 削除 |

### 画像生成

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `generate_image` | GenerateRequestDto | `GenerateResultDto` | 画像生成 |
| `estimate_cost` | CostEstimateDto | `CostResultDto` | コスト予測（純粋計算） |
| `save_image` | image_id | - | 画像を保存済みに |
| `save_all_images` | project_id | - | 全画像を保存済みに |
| `delete_image` | image_id | - | 画像削除（ファイル + レコード） |
| `get_project_images` | project_id, saved_only | `Vec<ImageDto>` | 画像一覧取得 |
| `cleanup_unsaved_images` | project_id | - | 未保存画像削除 |

### プロンプトグループ

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `list_prompt_groups` | search? | `Vec<PromptGroupDto>` | 一覧 |
| `get_prompt_group` | id | `PromptGroupDto` | 取得 |
| `create_prompt_group` | CreatePromptGroupRequest | `PromptGroupDto` | 作成 |
| `update_prompt_group` | UpdatePromptGroupRequest | - | 更新 |
| `update_prompt_group_thumbnail` | id, thumbnail_path? | - | サムネイル更新 |
| `delete_prompt_group` | id | - | 削除（非システムのみ） |
| `list_prompt_group_default_genres` | group_id | `Vec<String>` | デフォルトジャンルID一覧 |
| `set_prompt_group_default_genres` | group_id, genre_ids | - | デフォルトジャンル設定 |

### ジャンル

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `list_genres` | - | `Vec<GenreDto>` | 一覧 |
| `create_genre` | name | `GenreDto` | 作成 |
| `delete_genre` | id | - | 削除（非システムのみ） |

### Vibe

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `list_vibes` | - | `Vec<VibeDto>` | 一覧 |
| `add_vibe` | file_path, name, thumbnail_path? | `VibeDto` | インポート |
| `delete_vibe` | id | - | 削除 |
| `update_vibe_name` | UpdateVibeNameRequest | `VibeDto` | 名前更新 |
| `update_vibe_thumbnail` | UpdateVibeThumbnailRequest | `VibeDto` | サムネイル更新 |
| `clear_vibe_thumbnail` | id | `VibeDto` | サムネイルクリア |
| `toggle_vibe_favorite` | id | `VibeDto` | お気に入りトグル |
| `export_vibe` | id, dest_path | - | エクスポート |
| `encode_vibe` | EncodeVibeRequest | `VibeDto` | 画像からVibeエンコード |
| `add_vibe_to_project` | project_id, vibe_id | - | プロジェクトにVibe追加 |
| `remove_vibe_from_project` | project_id, vibe_id | - | プロジェクトからVibe削除 |
| `set_vibe_visibility` | project_id, vibe_id, is_visible | - | 表示/非表示切替 |
| `list_project_vibes` | project_id | `Vec<VibeDto>` | プロジェクトのVibe一覧（visible only） |
| `list_project_vibes_all` | project_id | `Vec<ProjectVibeDto>` | プロジェクトのVibe一覧（全件） |

### スタイルプリセット

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `list_style_presets` | - | `Vec<StylePresetDto>` | 一覧 |
| `create_style_preset` | CreateStylePresetRequest | `StylePresetDto` | 作成 |
| `update_style_preset` | UpdateStylePresetRequest | - | 更新 |
| `delete_style_preset` | id | - | 削除 |
| `toggle_preset_favorite` | id | `StylePresetDto` | お気に入りトグル |
| `update_preset_thumbnail` | UpdatePresetThumbnailRequest | `StylePresetDto` | サムネイル更新 |
| `clear_preset_thumbnail` | id | `StylePresetDto` | サムネイルクリア |

### システムプロンプト

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `get_system_prompt_categories` | - | `Vec<CategoryDto>` | カテゴリ一覧 |
| `search_system_prompts` | query, category?, limit | `Vec<SystemTagDto>` | 検索（部分一致） |
| `list_system_group_tags` | category, query?, offset?, limit? | `ListSystemGroupTagsResponse` | カテゴリ別タグ一覧 |
| `get_random_artist_tags` | count | `Vec<SystemTagDto>` | ランダムアーティストタグ |

### システムグループ設定

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `get_system_group_genre_defaults` | system_group_id | `Vec<SystemGroupGenreDefaultDto>` | デフォルトジャンル設定取得 |
| `set_system_group_genre_defaults` | SetSystemGroupGenreDefaultsRequest | - | デフォルトジャンル設定 |
| `list_default_system_groups_for_genre` | genre_id | `Vec<String>` | ジャンル→デフォルトシステムグループ逆引き |
