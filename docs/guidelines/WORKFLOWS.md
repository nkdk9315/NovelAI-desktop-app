# ワークフロー

## 1. 実装ワークフロー

### 1.1 ブランチ戦略

| ブランチ | 用途 | 例 |
|---------|------|-----|
| `main` | 安定版 | — |
| `feature/<phase>-<feature>` | 機能実装 | `feature/p1-settings`, `feature/p2-image-gen` |
| `fix/<description>` | バグ修正 | `fix/image-save-crash` |

### 1.2 実装手順

#### Rust（バックエンド）

1. `models/dto.rs` — DTO 定義（Row 構造体 + IPC 用 DTO）
2. `repositories/` — SQL データアクセス + テスト
3. `services/` — ビジネスロジック + テスト
4. `commands/` — Tauri コマンド登録（thin wrapper）
5. `main.rs` — `.invoke_handler()` にコマンド追加

#### Frontend

1. `types/index.ts` — 型定義（Rust DTO のミラー）
2. `lib/ipc.ts` — `invoke()` wrapper 追加
3. `stores/` — Zustand store 作成
4. `hooks/` — カスタムフック（必要な場合のみ）
5. `components/` — UI コンポーネント
6. `pages/` — ページ統合

#### 完了確認

```bash
cargo test                  # Rust テスト
cargo clippy --all-targets  # Lint
npm run test                # Frontend テスト（Vitest）
cargo tauri dev             # 手動動作確認
```

### 1.3 コミットメッセージ規約

Conventional Commits 準拠。

```
<type>(<scope>): <description>
```

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `test` | テスト追加/修正 |
| `docs` | ドキュメント |
| `chore` | ビルド/設定変更 |

**例:**

```
feat(settings): add API key management
fix(image): handle missing file on save
test(project-repo): add cascade delete test
refactor(prompt): extract tag assembly logic
```

## 2. コードレビューチェックリスト

### 構造

- [ ] レイヤー境界遵守（Commands → Services → Repositories）
- [ ] 1 ファイル 300 行以内
- [ ] 命名規則準拠（coding-guidelines.md 参照）

### セキュリティ

- [ ] SQL パラメータバインド使用（文字列連結無し）
- [ ] API キーに SecretString 使用
- [ ] パストラバーサル防御（ファイルパス操作がある場合）
- [ ] innerHTML の直接操作無し

### エラーハンドリング

- [ ] AppError の適切なバリアント選択
- [ ] `unwrap()` / `expect()` がプロダクションコードに無い
- [ ] Frontend: error kind に基づく適切な UI 応答

### テスト

- [ ] Repository 変更 → repository テスト追加/更新
- [ ] Service 変更 → service テスト追加/更新
- [ ] `cost.ts` 変更 → Vitest テスト追加/更新

### 型安全

- [ ] Rust: 不要な `clone()` 回避
- [ ] TypeScript: `any` 型不使用
- [ ] DTO のフロントエンド/バックエンド同期

## 3. メンテナンスワークフロー

### 3.1 依存関係更新

```bash
# Rust
cargo update              # 依存更新
cargo audit               # セキュリティ監査

# Frontend
npm update                # 依存更新
npm audit                 # セキュリティ監査
```

### 3.2 DB マイグレーション

1. 新ファイル作成: `migrations/00N_<description>.sql`
2. `db.rs` の `run_migrations()` にファイル追加（`include_str!`）
3. `schema_version` を settings テーブルで更新
4. 既存データの互換性確認（テストで検証）

### 3.3 novelai-api crate 更新

```bash
git submodule update --remote novelai_api_client
```

1. CHANGELOG / diff で Breaking Changes 確認
2. 影響範囲: `services/generation.rs`, `services/vibe.rs`
3. 型変更がある場合は DTO・Frontend 型も更新

### 3.4 デバッグ手順

| 対象 | 方法 |
|------|------|
| Rust ログ | `RUST_LOG=debug cargo tauri dev` |
| Frontend | Chrome DevTools（Tauri WebView） |
| SQLite | DB Browser for SQLite — `$APPDATA/novelai-desktop/app.db` |
| IPC 通信 | `lib/ipc.ts` の wrapper 内で `console.log` |

### 3.5 リリース準備チェックリスト

- [ ] `cargo clippy --all-targets` — 警告無し
- [ ] `cargo test` — 全テスト通過
- [ ] `npm run build` — Frontend ビルド成功
- [ ] `cargo tauri build` — プロダクションバイナリ生成
- [ ] Tauri CSP 設定確認（SECURITY.md 参照）
- [ ] 環境変数 URL 上書きが無効であること確認
- [ ] `cargo audit` + `npm audit` — 脆弱性無し
