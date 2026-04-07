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

再利用可能なプロンプトタグの集合。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| name | TEXT | グループ名 |
| genre_id | TEXT | FK → Genre.id（NULL許容） |
| is_default_for_genre | INTEGER | このジャンルのデフォルトか |
| is_system | INTEGER | 1=システム（編集/削除不可） |
| usage_type | TEXT | `main` / `character` / `both` |
| created_at | TEXT (ISO 8601) | 作成日時 |
| updated_at | TEXT (ISO 8601) | 更新日時 |

### PromptGroupTag（プロンプトグループタグ）

プロンプトグループに所属する個別タグ。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| prompt_group_id | TEXT | FK → PromptGroup.id（CASCADE DELETE） |
| tag | TEXT | タグ文字列 |
| sort_order | INTEGER | 表示・連結順 |

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

### StylePreset（スタイルプリセット）

アーティストタグ + Vibeの組み合わせ。

| フィールド | 型 | 説明 |
|------------|-----|------|
| id | TEXT (UUID) | PK |
| name | TEXT | プリセット名 |
| artist_tags | TEXT (JSON Array) | アーティストタグリスト（JSON文字列） |
| created_at | TEXT (ISO 8601) | 作成日時 |

### StylePresetVibe（スタイルプリセット×Vibe中間テーブル）

| フィールド | 型 | 説明 |
|------------|-----|------|
| style_preset_id | TEXT | FK → StylePreset.id（CASCADE DELETE） |
| vibe_id | TEXT | FK → Vibe.id（CASCADE DELETE） |

複合PK: (style_preset_id, vibe_id)

### Settings（設定）

Key-Valueストア。

| フィールド | 型 | 説明 |
|------------|-----|------|
| key | TEXT | PK。設定キー |
| value | TEXT | 設定値 |

想定キー: `api_key`, `default_model`, `default_width`, `default_height`, `default_steps`, `default_sampler`, `default_noise_schedule`, `default_scale`

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

┌──────────┐       ┌──────────────────┐       ┌──────────┐
│  Vibe    │*    * │StylePresetVibe   │*    1 │StylePreset│
│          │───────│                  │───────│           │
│ id       │       │ vibe_id (FK)     │       │ id        │
│ name     │       │ style_preset_id  │       │ name      │
│ file_path│       │     (FK)         │       │artist_tags│
│ model    │       └──────────────────┘       └───────────┘
└──────────┘

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
    genre_id              TEXT REFERENCES genres(id) ON DELETE SET NULL,
    is_default_for_genre  INTEGER NOT NULL DEFAULT 0,
    is_system             INTEGER NOT NULL DEFAULT 0,
    usage_type            TEXT NOT NULL DEFAULT 'both',
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- プロンプトグループタグ
CREATE TABLE IF NOT EXISTS prompt_group_tags (
    id              TEXT PRIMARY KEY,
    prompt_group_id TEXT NOT NULL REFERENCES prompt_groups(id) ON DELETE CASCADE,
    tag             TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_prompt_group_tags_group
    ON prompt_group_tags(prompt_group_id);

-- プロジェクト
CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    project_type    TEXT NOT NULL DEFAULT 'simple',
    directory_path  TEXT NOT NULL,
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
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    model       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- スタイルプリセット
CREATE TABLE IF NOT EXISTS style_presets (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    artist_tags TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- スタイルプリセット × Vibe
CREATE TABLE IF NOT EXISTS style_preset_vibes (
    style_preset_id TEXT NOT NULL REFERENCES style_presets(id) ON DELETE CASCADE,
    vibe_id         TEXT NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
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
        vibes: [VibeConfig { ... }, ...],
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
[ユーザー: ファイル選択]
    │
    ▼
add_vibe(file_path, name)
    │
    ├─ .naiv4vibeファイルを$APPDATA/novelai-desktop/vibes/にコピー
    ├─ ファイル内容を解析してモデル情報を取得
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
| `list_projects` | - | `Vec<ProjectDto>` | 一覧 |
| `create_project` | name, project_type, directory_path | `ProjectDto` | 作成 |
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
| `list_prompt_groups` | genre_id?, usage_type?, search? | `Vec<PromptGroupDto>` | 一覧（フィルタ/検索） |
| `get_prompt_group` | id | `PromptGroupDto` | 取得 |
| `create_prompt_group` | name, genre_id?, usage_type, tags | `PromptGroupDto` | 作成 |
| `update_prompt_group` | id, name?, genre_id?, tags?, is_default? | - | 更新 |
| `delete_prompt_group` | id | - | 削除（非システムのみ） |

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
| `add_vibe` | file_path, name | `VibeDto` | インポート |
| `delete_vibe` | id | - | 削除 |
| `encode_vibe` | image_path, model, name | `VibeDto` | 画像からVibeエンコード |

### スタイルプリセット

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `list_style_presets` | - | `Vec<StylePresetDto>` | 一覧 |
| `create_style_preset` | name, artist_tags, vibe_ids | `StylePresetDto` | 作成 |
| `update_style_preset` | id, name?, artist_tags?, vibe_ids? | - | 更新 |
| `delete_style_preset` | id | - | 削除 |

### システムプロンプト

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `get_system_prompt_categories` | - | `Vec<CategoryDto>` | カテゴリ一覧 |
| `search_system_prompts` | query, category?, limit | `Vec<SystemTagDto>` | 検索（部分一致） |
