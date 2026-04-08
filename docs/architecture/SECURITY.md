# セキュリティ設計

## 1. 認証・認可

- **認証方式**: NovelAI APIキー（Bearer Token）のみ
- **認可モデル**: なし（シングルユーザーデスクトップアプリ。ユーザー間のアクセス制御不要）
- **セッション管理**: なし（APIキーをAppStateに保持。セッションの概念なし）

### APIキー管理

| 項目 | 方針 |
|------|------|
| メモリ上の保持 | `secrecy::SecretString`（`NovelAIClient`内部で使用） |
| 永続化 | SQLite `settings` テーブルに保存 |
| 暗号化 | Phase 1ではプレーンテキスト。将来的にOS Keychainへの移行を検討 |
| 漏洩リスク軽減 | `SecretString`の`Debug`実装は`[REDACTED]`を出力 |

### 将来検討: OS Keychain連携

| OS | API |
|----|-----|
| macOS | Security Framework (Keychain Services) |
| Windows | Windows Credential Manager |
| Linux | libsecret (GNOME Keyring / KDE Wallet) |

Tauri 2にはkeychain pluginの選択肢がある。Phase 1後の優先度で検討。

---

## 2. 脅威モデル

OWASP Top 10に基づき、本アプリケーションへの該当を評価。

| 脅威 | 該当 | 対策 |
|------|------|------|
| **A01: アクセス制御の不備** | No | シングルユーザーデスクトップアプリ。ユーザー間のアクセス制御不要 |
| **A02: 暗号化の失敗** | Yes | APIキーのDB保存。Phase 1はプレーンテキスト、将来OS Keychain移行。HTTPS通信はnovelai-api crateが強制（URLバリデーション） |
| **A03: インジェクション** | Yes | **SQLインジェクション**: rusqliteのパラメータバインド(`?`プレースホルダ)を全クエリで使用。文字列連結によるSQL構築を禁止。**コマンドインジェクション**: 外部プロセス実行なし。**XSS**: Reactのデフォルトエスケープに依存。生のHTMLを挿入するAPIの使用を禁止（信頼できないコンテンツのサニタイズにはDOMPurify等のHTMLサニタイザーを使用） |
| **A04: 安全でない設計** | No | 設計段階でレイヤー分離と入力バリデーションを組み込み済み |
| **A05: セキュリティ設定ミス** | Yes | Tauri CSP設定を適切に構成（下記参照）。不要なAPIの無効化 |
| **A06: 脆弱で古いコンポーネント** | Low | Cargo.lock/package-lock.jsonでバージョン固定。`cargo audit` / `npm audit`で定期チェック |
| **A07: 認証の不備** | No | 本アプリ自体にユーザー認証なし。NovelAI API認証はcrate側で実装済み |
| **A08: ソフトウェアとデータ整合性の不備** | Low | Tauri 2のアップデーターを使用する場合はコード署名検証 |
| **A09: セキュリティログとモニタリングの不備** | Low | デスクトップアプリのため集中ログ不要。`tracing`でローカルログ出力 |
| **A10: SSRF** | Yes | novelai-api crateのURL検証機能（`validate_novelai_url`）でnovelai.netドメイン+HTTPSのみ許可。環境変数によるURL上書きはリリースビルドでSSRF防御 |

### XSS対策

| 対策 | 詳細 |
|------|------|
| React デフォルトエスケープ | JSX内の`{}`は自動エスケープ |
| 生HTML挿入の禁止 | 生のHTMLを挿入するReact APIの使用を禁止。信頼できないコンテンツの表示が必要な場合はDOMPurify等のサニタイザーを使用 |
| Tauri CSP | `tauri.conf.json`でContent Security Policyを設定 |
| 外部スクリプト | CDNからのスクリプト読込なし（バンドル済み） |

### Tauri CSP設定方針

```json
{
  "security": {
    "csp": "default-src 'self'; img-src 'self' asset: https://image.novelai.net; style-src 'self' 'unsafe-inline'; script-src 'self'",
    "assetProtocol": {
      "enable": true,
      "scope": ["**"]
    }
  }
}
```

- `default-src 'self'`: 自身のオリジンのみ
- `img-src`: `asset:` プロトコル（Tauri画像配信）+ NovelAI画像サーバー
- `style-src 'unsafe-inline'`: Tailwind CSS用
- `script-src 'self'`: バンドルされたスクリプトのみ
- `assetProtocol`: `convertFileSrc()` によるローカル画像表示に必要。Cargo.toml の `protocol-asset` feature と併用

---

## 3. データ保護

### 機密データの特定

| データ | 機密度 | 保存場所 | 保護方針 |
|--------|--------|----------|----------|
| APIキー | 高 | AppState (メモリ) + settings テーブル (SQLite) | メモリ: SecretString。DB: Phase 1はプレーンテキスト、将来Keychain |
| 生成画像 | 低 | プロジェクトディレクトリ | OSのファイルパーミッションに依存 |
| プロンプト履歴 | 低 | generated_images.prompt_snapshot (JSON) | DBファイルパーミッションに依存 |
| 設定値 | 低 | settings テーブル | 特になし |

### 通信の暗号化

| 通信経路 | 暗号化 |
|----------|--------|
| アプリ → NovelAI API | HTTPS (rustls-tls、novelai-api crateが強制) |
| Frontend → Backend (IPC) | Tauri IPC (プロセス内通信、ネットワーク経由なし) |

### ファイルシステムセキュリティ

| 対策 | 詳細 |
|------|------|
| パストラバーサル防御 | novelai-api crateの`validate_safe_path`を利用。ファイル保存時にディレクトリ外への書込み防止 |
| ZIPボム防御 | novelai-api crateのレスポンスパーサーで実装済み（エントリ数, 展開サイズ, 圧縮比チェック） |
| DBファイル | `$APPDATA/novelai-desktop/app.db`。OS標準のユーザーディレクトリ保護 |
| Vibeファイル | `$APPDATA/novelai-desktop/vibes/`。インポート時にファイル内容のパース検証 |
| 画像パス | DB内は相対パスで保存（ポータビリティ + パストラバーサルリスク低減） |

### データ保持ポリシー

| データ | 保持期間 | 削除方針 |
|--------|----------|----------|
| 未保存画像 | プロジェクト再オープンまで | `cleanup_unsaved_images`で自動削除 |
| 保存済み画像 | ユーザーが明示的に削除するまで | `delete_image`コマンド |
| プロジェクト | ユーザーが明示的に削除するまで | `delete_project`でCASCADE DELETE |
| Vibe | ユーザーが明示的に削除するまで | `delete_vibe`でファイル+レコード削除 |
| 設定 | アプリアンインストールまで | OS標準のアプリデータ削除 |

---

## 4. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-04-07 | 初版作成 |
