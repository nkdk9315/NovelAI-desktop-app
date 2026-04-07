# コーディングガイドライン

## 1. ファイル命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| Rust ソースファイル | snake_case | `settings_repo.rs`, `image_service.rs` |
| Rust モジュールディレクトリ | snake_case | `commands/`, `services/` |
| TypeScript ファイル | kebab-case | `settings-store.ts`, `use-debounce.ts` |
| React コンポーネント | PascalCase.tsx | `SettingsDialog.tsx`, `ImageViewer.tsx` |
| SQL マイグレーション | `00N_description.sql` | `001_initial_schema.sql` |

## 2. コード命名規則

### Rust

| 対象 | 規則 | 例 |
|------|------|-----|
| 構造体・Enum | PascalCase | `AppError`, `GenerateImageRequest` |
| 関数・メソッド | snake_case | `find_by_id`, `cleanup_unsaved_images` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_TOKENS`, `DEFAULT_STEPS` |
| モジュール | snake_case | `mod settings_repo;` |

### TypeScript

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `ImageViewer`, `PromptEditor` |
| 関数・変数 | camelCase | `getSettings`, `estimateCost` |
| 型・Interface | PascalCase | `ProjectDto`, `GenerateParams` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_CHARACTERS`, `DEFAULT_MODEL` |
| Store | camelCase + Store | `useSettingsStore`, `useProjectStore` |

## 3. DB 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| テーブル名 | snake_case 複数形 | `genres`, `prompt_groups`, `generated_images` |
| カラム名 | snake_case | `is_saved`, `created_at`, `genre_id` |
| IPC ペイロード | camelCase（serde rename） | `isSaved`, `createdAt`, `genreId` |

## 4. ID・タイムスタンプ規則

- **UUID**: `uuid::Uuid::new_v4().to_string()` で Rust 側で生成。TEXT 型で保存
- **タイムスタンプ**: ISO 8601 TEXT 型 — `datetime('now')` (SQLite)
- **システムエンティティ ID**: 固定文字列（例: `"genre-male"`, `"genre-female"`, `"genre-other"`）

## 5. ファイルサイズ制限

- **最大 300 行/ファイル**
- 超過時はドメイン別に分割（例: `dto.rs` → `dto/project.rs`, `dto/generation.rs`）
- **例外**: マイグレーション SQL、型定義ファイル（dto.rs, types/index.ts）

## 6. エラーハンドリング

### Rust: AppError

```rust
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("validation: {0}")]
    Validation(String),
    #[error("database: {0}")]
    Database(String),
    #[error("api client: {0}")]
    ApiClient(String),
    #[error("io: {0}")]
    Io(String),
    #[error("not initialized: {0}")]
    NotInitialized(String),
}
```

- `From` 実装: `rusqlite::Error` → `Database`, `NovelAIError` → `ApiClient`, `io::Error` → `Io`
- Command 層: `AppError` → `String` に変換して IPC 返却

### Frontend

- `error.kind` で分岐 → Toast 通知
- `NotInitialized` → 設定ダイアログへ誘導

## 7. レイヤールール (Rust)

```
Commands → Services → Repositories → Models/DTO
```

- **skip 禁止**: Commands が Repositories を直接呼んではならない
- **Commands**: thin wrapper — 引数パース → Service 呼び出し → エラー変換
- **Services**: ビジネスロジック、オーケストレーション、ファイル I/O
- **Repositories**: `fn(conn: &Connection, ...) → Result<T, AppError>` — SQL のみ
- **Models/DTO**: `Serialize` / `Deserialize` のみ、ロジック無し

## 8. レイヤールール (React)

```
Pages → Components → Hooks → Stores → lib/ipc → types
```

- **Pages**: レイアウト構成のみ
- **Components**: UI 要素、Props でデータ受取
- **Hooks**: カスタムフック（debounce, autocomplete, cost）
- **Stores**: Zustand — IPC 呼び出しは Store の action 内で実行
- **lib/ipc**: typed `invoke()` wrapper — 1:1 で Tauri command にマッピング
- **lib/cost**: 純粋関数（IPC 不要）
- コンポーネントの `useState` は UI 状態（開閉、入力中テキスト等）のみ

## 9. セキュリティルール

- API キーは `secrecy::SecretString` でメモリ保持（Debug 出力でマスク）
- SQL は `rusqlite` パラメータバインド（`?` プレースホルダー）のみ — 文字列連結禁止
- innerHTML の直接操作禁止
- 外部プロセス実行禁止
- Tauri CSP 設定を遵守:
  ```
  default-src 'self'; img-src 'self' asset: https://image.novelai.net;
  style-src 'self' 'unsafe-inline'; script-src 'self'
  ```

## 10. テスト規則

| レイヤー | テスト | 方法 |
|---------|--------|------|
| Repository | **必須** | In-memory SQLite (`":memory:"`) |
| Service (DB) | **必須** | In-memory SQLite + `tempdir` |
| Service (API) | 不要 | novelai-api crate 側でカバー |
| Command | 不要 | thin wrapper のため |
| Frontend (cost.ts) | **必須** | Vitest（純粋関数） |
| Frontend (Store/UI) | 不要 | IPC 依存のため手動テスト |

- テスト命名: `test_<関数名>_<シナリオ>`（例: `test_find_by_id_returns_none_when_missing`）
- `test_utils.rs`: `setup_test_db()`, `create_test_project()` 等のヘルパー提供
- `unwrap()` / `expect()` はテストコード内のみ許可

## 11. インポート規則

### Rust

- `mod.rs` で re-export（`pub use`）
- 外部 crate は `Cargo.toml` で管理、ワイルドカードインポート禁止

### TypeScript

- barrel export（`index.ts`）は非推奨（tree-shaking 阻害）
- 同レイヤー内: 相対パス（`./`）
- レイヤー跨ぎ: `@/` エイリアス（例: `@/stores/settings-store`）
- `any` 型禁止
