# 計画管理方法論

## 1. フェーズ構成

本プロジェクトは 5 フェーズで実装する。各フェーズの対象機能は以下の通り。

| Phase | 名称 | 対象機能 | 概要 |
|-------|------|---------|------|
| 1 | 基盤 | F1, F10, F11 | Tauri 初期化、Settings、Projects、Anlas、Header UI |
| 2 | コア | F2, F3 | 画像生成、履歴表示、コスト計算、3 パネルレイアウト |
| 3 | キャラクター | F6 | マルチキャラクター対応、ポジションスライダー |
| 4 | グループ | F4, F5, F7 | Genre・PromptGroup CRUD、システムプロンプト、オートコンプリート |
| 5 | Vibe・スタイル | F8, F9 | Vibe インポート/管理、スタイルプリセット |

## 2. タスク分解の原則

### 垂直スライス

1 タスク = 1 機能のフルスタック実装（Repository → Service → Command → Frontend）。
水平スライス（「全 Repository を先に作る」）は禁止。

### 粒度

- 1 タスクの目安: 1〜4 時間で完了可能な単位
- 大きすぎる場合はサブタスクに分解

### 依存関係

- 各タスクの前提タスクを明記
- 依存チェーン: `F2(画像生成)` → `F1(プロジェクト)`, `F3(プロンプト)`, `F11(設定)`

### 完了条件

- テスト対象レイヤーのテスト通過
- 品質スコア基準クリア（QUALITY_SCORE.md 参照）
- 手動動作確認

## 3. タスク記述テンプレート

```markdown
### タスク: [Phase]-[連番] [タイトル]

- **Phase**: N
- **前提**: [依存タスクID、無ければ「なし」]
- **スコープ**:
  - Rust: [対象ファイル一覧]
  - Frontend: [対象ファイル一覧]
- **完了条件**:
  - [ ] Repository テスト通過
  - [ ] Service テスト通過
  - [ ] 手動動作確認
- **備考**: [制約・注意点]
```

## 4. 進捗追跡

- ステータス: `未着手` → `実装中` → `レビュー中` → `完了`
- ブロッカーがある場合: 何に依存して止まっているかを記録
- Phase 単位で進捗を集計

## 5. フェーズ完了基準

- [ ] 全タスクの完了条件クリア
- [ ] 品質スコア: 各カテゴリ 3 点以上、合計 18 点以上
- [ ] 手動 E2E テスト通過
- [ ] 該当するドキュメント更新（domain-model.md, contracts.md 等）

## 6. 計画変更の管理

- **スコープ変更**: `docs/architecture/implementation-plan.md` に変更履歴を追記
- **フェーズ間の機能移動**: 理由を明記（例:「F7 は F4 に依存するため Phase 4 に統合」）
- **新機能追加**: `docs/requirements/requirements-summary.json` への反映必須

## 7. 垂直スライス例: Phase 1 — Settings CRUD

実装順序:

1. **models/dto.rs**: `SettingDto` 定義
2. **repositories/settings.rs**: `get_all`, `get_by_key`, `set`（UPSERT）+ テスト
3. **services/settings.rs**: `get_all_settings`, `set_setting`, `initialize_client` + テスト
4. **commands/settings.rs**: `get_settings`, `set_setting` コマンド登録
5. **src/types/index.ts**: `SettingDto` 型定義
6. **src/lib/ipc.ts**: `getSettings()`, `setSetting()` wrapper 追加
7. **src/stores/settings-store.ts**: Zustand store 作成
8. **src/components/modals/SettingsDialog.tsx**: API キー入力 UI
9. テスト実行: `cargo test` + 手動確認
