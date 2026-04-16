# アーキテクチャ設計

## 1. 技術スタック

| レイヤー | 技術 |
|----------|------|
| Desktop Shell | Tauri 2 |
| Backend | Rust (Tauri commands) |
| Frontend | React + TypeScript |
| UIライブラリ | Tailwind CSS + shadcn/ui |
| State管理 | Zustand |
| DB | SQLite (rusqlite, bundled) |
| API Client | `novelai-api` crate (path: `novelai_api_client/rust-api`) |
| 対応OS | macOS / Windows / Linux |

---

## 2. レイヤーアーキテクチャ

### Rust バックエンド

| レイヤー | 責務 | 依存先 |
|---------|------|--------|
| models/dto | 型定義・DTOのSerialize/Deserialize | なし |
| repositories | SQLiteデータアクセス（`&Connection`受取） | models |
| services | ビジネスロジック、オーケストレーション | models, repositories, novelai-api crate |
| commands | Tauriコマンド（thin layer: 引数パース → service呼び出し → エラー変換） | models, services |

### React フロントエンド

| レイヤー | 責務 | 依存先 |
|---------|------|--------|
| types | TypeScript型定義（Rust DTOのミラー） | なし |
| lib/ipc | typed `invoke()` wrapper | types |
| lib/constants | モデル・サンプラー・制約値 | なし |
| lib/cost | コスト計算（純粋関数） | types, constants |
| stores | Zustand stores（状態管理 + IPC呼び出し） | types, lib/ipc |
| hooks | カスタムフック（debounce, autocomplete, cost estimate） | stores, lib |
| components | UIコンポーネント | types, stores, hooks |
| pages | ページレベルレイアウト | components, stores |

### 依存方向ルール

- コードは「前方」にのみ依存できる（上の表で下→上は禁止）
- 横断的関心事はプロバイダー経由でのみアクセス

```mermaid
graph TD
    subgraph "Rust Backend"
        Commands --> Services
        Services --> Repositories
        Services --> NovelAIClient["novelai-api crate"]
        Repositories --> Models["Models/DTO"]
        Services --> Models
        Commands --> Models
    end

    subgraph "React Frontend"
        Pages --> Components
        Components --> Hooks
        Components --> Stores
        Hooks --> Stores
        Stores --> IPC["lib/ipc"]
        IPC --> Types
        Stores --> Types
    end

    IPC -.->|"Tauri IPC (JSON)"| Commands
```

---

## 3. AppState設計

```rust
use std::sync::Mutex;
use rusqlite::Connection;
use novelai_api::client::NovelAIClient;

pub struct AppState {
    /// SQLite接続。single-writer。WAL mode有効。
    pub db: Mutex<Connection>,

    /// APIクライアント。APIキー未設定時はNone。
    /// キー変更時にSwap可能。async context で .await 越しにロック保持するため tokio::sync::Mutex を使用。
    pub api_client: tokio::sync::Mutex<Option<NovelAIClient>>,

    /// システムプロンプトDB。起動時にCSVからロード。
    /// immutableなのでMutex不要。
    pub system_tags: SystemPromptDB,
}
```

| フィールド | 型 | 理由 |
|-----------|-----|------|
| db | `Mutex<Connection>` | SQLiteはsingle-writer。シングルユーザーアプリにpool不要 |
| api_client | `tokio::sync::Mutex<Option<NovelAIClient>>` | APIキー未設定時None。変更時にSwap。async context で .await 越しにロック保持が必要なため tokio::sync::Mutex |
| system_tags | `SystemPromptDB` | 起動時ロード、以後immutable。ロック不要 |

---

## 4. モジュール構成

domain-model.mdの境界コンテキストをモジュールに対応させる。

| モジュール | 境界コンテキスト | 責務 | 許容する依存先 |
|-----------|----------------|------|--------------|
| project | プロジェクト管理 | Project CRUD, GeneratedImage管理, 未保存クリーンアップ | settings（デフォルト取得） |
| generation | 画像生成 | パラメータ組立, API呼び出し, ファイル書込, コスト計算 | project（画像保存先）, vibe（エンコーディング取得） |
| prompt | プロンプトシステム | PromptGroup/PromptGroupTag CRUD, Genre管理, デフォルト制御 | なし |
| vibe | Vibe・スタイル管理 | Vibe import/delete/encode, サムネイル管理, StylePreset CRUD, .naiv4vibeパース | なし |
| project_vibe | プロジェクト×Vibe管理 | プロジェクトへのVibe追加/削除, 表示/非表示切替, JOINクエリ | vibe |
| system_prompt | システムプロンプト | CSV読込, インメモリ検索, カテゴリ管理 | なし |
| settings | 設定・認証 | KVS読み書き, APIクライアント初期化, Anlas残高取得 | なし |

### モジュール間依存図

```mermaid
graph LR
    generation --> project
    generation --> vibe
    generation --> settings
    project --> settings
    project_vibe --> vibe
```

- **system_prompt** と **prompt** は他モジュールに依存しない独立モジュール
- **generation** が最も依存の多いモジュール（オーケストレーション役）
- **project_vibe** は vibe モジュールのリポジトリを参照（JOIN クエリ）

---

## 5. 横断的関心事

### 5-1. エラーハンドリング

全レイヤーを貫くエラー型 `AppError` をプロバイダーとして設計。

```rust
#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Validation(String),
    #[error("{0}")]
    Database(String),
    #[error("{0}")]
    ApiClient(String),
    #[error("{0}")]
    Io(String),
    #[error("{0}")]
    NotInitialized(String),
}
```

- `thiserror` で `Display/Error` 自動実装
- `serde::Serialize` + `#[serde(tag = "kind")]` でフロントエンドがkindでマッチ可能
- `From` 実装: `rusqlite::Error` → `Database`, `NovelAIError` → `ApiClient`, `io::Error` → `Io`
- `InsufficientAnlas` は `ApiClient` に含め、メッセージから判別

**フロントエンド側:**

```typescript
interface AppError {
  kind: 'NotFound' | 'Validation' | 'Database' | 'ApiClient' | 'Io' | 'NotInitialized';
  message: string;
}
```

各Store actionでtry/catch → `toastError(String(e))` で通知。`NotInitialized` は設定ダイアログ誘導。

**`toastError()` ヘルパー** (`src/lib/toast-error.ts`):

- `toast.error()` を Sonner の `action` オプション付きでラップ
- アクションボタン: Copy アイコン（lucide-react）— クリックでメッセージをクリップボードへコピー → `toast.success(copied)` を表示
- 全モーダル・ページで `toast.error()` の直接呼び出しを禁止し、このヘルパーを使用

**インラインエラー表示**（例: `ImageDisplay.tsx`）:

- `useState` + `navigator.clipboard.writeText()` で Copy/Check アイコンボタンを実装
- コピー後2秒間 Check アイコンを表示してフィードバック

### 5-2. ロギング

- Rust側: `tracing` crate（Tauri 2のlog pluginと連携）
- 構造化ログ: `tracing::info!(project_id = %id, "project opened")`
- フロントエンド側: `console.log/warn/error`（デスクトップアプリのためシンプルに）

### 5-3. 認証

- NovelAI APIキーのみ（ユーザー認証なし：シングルユーザーデスクトップアプリ）
- APIキーは `secrecy::SecretString` でメモリ上に保持
- DB保存は `settings` テーブルのKVS（暗号化はSECURITY.mdで検討）

---

## 6. データベース設計

### ER図

```mermaid
erDiagram
    Genre ||--o{ PromptGroup : "has"
    PromptGroup ||--o{ PromptGroupTag : "contains"
    Project ||--o{ GeneratedImage : "has"
    StylePreset ||--o{ StylePresetVibe : "has"
    Vibe ||--o{ StylePresetVibe : "used in"

    Genre {
        TEXT id PK
        TEXT name UK
        INTEGER is_system
        INTEGER sort_order
        TEXT created_at
    }

    PromptGroup {
        TEXT id PK
        TEXT name
        TEXT genre_id FK
        INTEGER is_default_for_genre
        INTEGER is_system
        TEXT usage_type
        TEXT created_at
        TEXT updated_at
    }

    PromptGroupTag {
        TEXT id PK
        TEXT prompt_group_id FK
        TEXT tag
        INTEGER sort_order
    }

    Project {
        TEXT id PK
        TEXT name
        TEXT project_type
        TEXT directory_path
        TEXT created_at
        TEXT updated_at
    }

    GeneratedImage {
        TEXT id PK
        TEXT project_id FK
        TEXT file_path
        INTEGER seed
        TEXT prompt_snapshot
        INTEGER width
        INTEGER height
        TEXT model
        INTEGER is_saved
        TEXT created_at
    }

    Vibe {
        TEXT id PK
        TEXT name
        TEXT file_path
        TEXT model
        TEXT created_at
    }

    StylePreset {
        TEXT id PK
        TEXT name
        TEXT artist_tags
        TEXT created_at
    }

    StylePresetVibe {
        TEXT style_preset_id PK_FK
        TEXT vibe_id PK_FK
    }

    Settings {
        TEXT key PK
        TEXT value
    }
```

### マイグレーション方針

- `migrations/001_init.sql` にフルスキーマ定義（domain-model.mdの `## 3. SQLiteスキーマ定義` をそのまま使用）
- `include_str!("../migrations/001_init.sql")` でバイナリに埋め込み
- アプリ起動時に `db.rs` で実行
- 将来のスキーマ変更は `002_xxx.sql`, `003_xxx.sql` と番号付きで追加
- `settings` テーブルに `schema_version` キーで現在のバージョンを管理

---

## 7. データフロー

### 画像生成フロー（E2E）

```
[Frontend]                           [Tauri Backend]                    [novelai-api crate]
    │                                     │                                  │
    │ generation-store.generate()          │                                  │
    │  → isGenerating = true              │                                  │
    │  → GenerateRequestDto組立           │                                  │
    │                                     │                                  │
    │ ipc.generateImage(dto)              │                                  │
    │ ─────── invoke('generate_image') ──>│                                  │
    │                                     │ commands::generate_image()        │
    │                                     │  → services::generation::generate()
    │                                     │     1. api_client取得 (Mutex lock)│
    │                                     │     2. Vibe読込 (DB → ファイル)   │
    │                                     │     3. GenerateParams構築         │
    │                                     │        (Builder pattern)          │
    │                                     │     4. client.generate()          │
    │                                     │ ──────────────────────────────────>│
    │                                     │                                  │ HTTP POST
    │                                     │                                  │ (ZIP/msgpack)
    │                                     │     GenerateResult               │
    │                                     │ <──────────────────────────────────│
    │                                     │     5. ファイル書込               │
    │                                     │        {project}/images/{ts}_{seed}.png
    │                                     │     6. prompt_snapshot JSON構築   │
    │                                     │     7. DB INSERT (is_saved=0)     │
    │                                     │                                  │
    │  GenerateResultDto                  │                                  │
    │  { id, base64_image, seed,          │                                  │
    │    file_path, anlas_remaining }      │                                  │
    │ <───────────────────────────────────│                                  │
    │                                     │                                  │
    │ → isGenerating = false              │                                  │
    │ → history-store.addImage(result)    │                                  │
    │ → settings-store.refreshAnlas()     │                                  │
    │ → UI更新 (ImageViewer + History)    │                                  │
```

### プロンプト組み立てフロー

```
メインプロンプト入力 (freeText)
  + プロンプトグループ選択 → assembleFullPrompt() → タグ結合
  = base_caption
  ネガティブ: negativeOverride ?? assembleNegativeFromGroups(groups)

キャラクター × N
  各キャラクター:
    プロンプト入力 + グループタグ結合 = char_caption
    ネガティブ: negativeOverride ?? assembleNegativeFromGroups(groups)
    center_x, center_y = 位置座標

アーティストタグ（sidebarArtistTags + 有効プリセット、この順で結合）→ base_captionに追記

  ↓ v4_prompt JSON構造に変換

v4_prompt: {
  caption: {
    base_caption: "...",
    char_captions: [{ char_caption: "...", centers: [{x, y}] }, ...]
  }
}
```

**ネガティブプロンプト優先順位**:
1. `negativeOverride` が非 `null` → その値をそのまま使用（手動入力 or 旧データ移行値）
2. `negativeOverride === null` → `assembleNegativeFromGroups(groups)` の結果を使用（タグの `negativePrompt` フィールドを収集）

---

## 8. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
| 2026-04-16 | PR-E: ネガティブプロンプト組み立てフロー更新 (negativeOverride + assembleNegativeFromGroups) |
| 2026-04-16 | feat/sidebar-direct-artist-tags: サイドバー直接アーティストタグ入力を追加 (useSidebarArtistTagsStore, useArtistTagInput hook) |
