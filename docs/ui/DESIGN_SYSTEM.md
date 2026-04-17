# デザインシステム

> **実装の真実源は `src/index.css`**。本ドキュメントのカラートークン表は 2026-04 時点の実装に追従しているが、細部の oklch 値（L, C, H の 3 桁精度）は `src/index.css` 側が最終。齟齬を発見したら `src/index.css` を優先すること。

## 1. デザイン方針

| 項目 | 方針 |
|------|------|
| スタイル | クリーン・ミニマル。Mac ネイティブアプリ / Notion / Linear 風 |
| 禁止事項 | AI 風グラデーション、ネオンカラー、光彩エフェクト |
| テーマ | ダークモードデフォルト、ライトモード切替可能 |
| 角丸 | 丸め重視（lg = 0.75rem） |
| 密度 | 標準（shadcn/ui New York スタイル） |
| ブランド | NovelAI に寄せない。独立したニュートラルデザイン |

---

## 2. カラーパレット

oklch カラースペースで定義。shadcn/ui v2+ 互換。背景・サイドバーはわずかに青紫を含むスレート（chroma ≈ 0.008, hue 245）で統一し、アクセントはブルー（hue 230）を使用する（PR #23 で cyan hue 195 → blue hue 230 に変更）。

### 2.1 ダークモード（デフォルト）

| トークン | oklch | 近似 Hex | 用途 |
|----------|-------|----------|------|
| `--background` | `0.145 0 0` | #1a1a1a | アプリ背景 |
| `--foreground` | `0.95 0 0` | #f0f0f0 | プライマリテキスト |
| `--card` | `0.17 0 0` | #222222 | カード・パネル表面 |
| `--card-foreground` | `0.95 0 0` | #f0f0f0 | カード上のテキスト |
| `--popover` | `0.17 0 0` | #222222 | ポップオーバー背景 |
| `--popover-foreground` | `0.95 0 0` | #f0f0f0 | ポップオーバーテキスト |
| `--primary` | `0.62 0.10 230` | #5b7bd5 | ボタン、リンク、フォーカス |
| `--primary-foreground` | `0.98 0 0` | #fafafa | primary 上のテキスト |
| `--secondary` | `0.22 0 0` | #2d2d2d | サブトル表面 |
| `--secondary-foreground` | `0.9 0 0` | #e0e0e0 | secondary 上のテキスト |
| `--muted` | `0.22 0 0` | #2d2d2d | ミュート背景 |
| `--muted-foreground` | `0.65 0 0` | #8a8a8a | セカンダリテキスト |
| `--accent` | `0.25 0 0` | #333333 | ホバー・アクティブ背景 |
| `--accent-foreground` | `0.95 0 0` | #f0f0f0 | accent 上のテキスト |
| `--destructive` | `0.55 0.2 25` | #d44444 | 削除・エラー |
| `--destructive-foreground` | `0.98 0 0` | #fafafa | destructive 上のテキスト |
| `--border` | `0.28 0 0` | #3a3a3a | ボーダー・ディバイダー |
| `--input` | `0.28 0 0` | #3a3a3a | 入力フィールドボーダー |
| `--ring` | `0.62 0.10 230` | #5b7bd5 | フォーカスリング |

#### サイドバー（左パネル・右パネル）

| トークン | oklch | 近似 Hex |
|----------|-------|----------|
| `--sidebar-background` | `0.16 0 0` | #202020 |
| `--sidebar-foreground` | `0.9 0 0` | #e0e0e0 |
| `--sidebar-border` | `0.25 0 0` | #333333 |
| `--sidebar-accent` | `0.25 0 0` | #333333 |
| `--sidebar-accent-foreground` | `0.95 0 0` | #f0f0f0 |
| `--sidebar-ring` | `0.62 0.10 230` | #5b7bd5 |

### 2.2 ライトモード

| トークン | oklch | 近似 Hex | 用途 |
|----------|-------|----------|------|
| `--background` | `0.99 0 0` | #fafafa | アプリ背景 |
| `--foreground` | `0.12 0 0` | #1a1a1a | プライマリテキスト |
| `--card` | `1.0 0 0` | #ffffff | カード表面 |
| `--card-foreground` | `0.12 0 0` | #1a1a1a | カード上のテキスト |
| `--popover` | `1.0 0 0` | #ffffff | ポップオーバー背景 |
| `--popover-foreground` | `0.12 0 0` | #1a1a1a | ポップオーバーテキスト |
| `--primary` | `0.55 0.11 230` | #4a65c0 | ボタン、リンク、フォーカス |
| `--primary-foreground` | `0.98 0 0` | #fafafa | primary 上のテキスト |
| `--secondary` | `0.96 0 0` | #f2f2f2 | サブトル表面 |
| `--secondary-foreground` | `0.2 0 0` | #282828 | secondary 上のテキスト |
| `--muted` | `0.96 0 0` | #f2f2f2 | ミュート背景 |
| `--muted-foreground` | `0.45 0 0` | #6b6b6b | セカンダリテキスト |
| `--accent` | `0.93 0 0` | #ebebeb | ホバー・アクティブ背景 |
| `--accent-foreground` | `0.15 0 0` | #1e1e1e | accent 上のテキスト |
| `--destructive` | `0.5 0.2 25` | #c03030 | 削除・エラー |
| `--destructive-foreground` | `0.98 0 0` | #fafafa | destructive 上のテキスト |
| `--border` | `0.90 0 0` | #e0e0e0 | ボーダー |
| `--input` | `0.90 0 0` | #e0e0e0 | 入力フィールドボーダー |
| `--ring` | `0.55 0.11 230` | #4a65c0 | フォーカスリング |

#### サイドバー（ライトモード）

| トークン | oklch | 近似 Hex |
|----------|-------|----------|
| `--sidebar-background` | `0.97 0 0` | #f5f5f5 |
| `--sidebar-foreground` | `0.2 0 0` | #282828 |
| `--sidebar-border` | `0.90 0 0` | #e0e0e0 |
| `--sidebar-accent` | `0.93 0 0` | #ebebeb |
| `--sidebar-accent-foreground` | `0.15 0 0` | #1e1e1e |
| `--sidebar-ring` | `0.55 0.11 230` | #4a65c0 |

### 2.3 セマンティックカラーの使い分け

| 意味 | トークン | 使用例 |
|------|----------|--------|
| 主要アクション | `primary` | Generate ボタン、アクティブタブ |
| 二次アクション | `secondary` | キャンセルボタン、トグルグループ |
| 破壊的アクション | `destructive` | 削除ボタン、エラーメッセージ |
| サブトル表面 | `accent` | ホバー状態、選択行 |
| 補助テキスト | `muted-foreground` | ラベル、プレースホルダー、タイムスタンプ |
| 区切り線 | `border` | パネル間ボーダー、セクション区切り |

---

## 3. Typography

### 3.1 フォントファミリー

| 用途 | フォント | フォールバック |
|------|----------|----------------|
| UI テキスト（英数） | IBM Plex Sans (400, 500, 600, 700) | IBM Plex Sans JP, Noto Sans JP, ui-sans-serif, system-ui, sans-serif |
| 日本語 | Noto Sans JP (400, 500, 700) / IBM Plex Sans JP | — |
| コード・数値 | JetBrains Mono (Variable) | IBM Plex Mono, ui-monospace, monospace |

フォントは `@fontsource` / `@fontsource-variable` でセルフホスト（デスクトップアプリなので CDN 不使用）。PR #22（2026-04-16）で Inter → IBM Plex Sans に移行。

```
npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-sans-jp \
            @fontsource/noto-sans-jp @fontsource-variable/jetbrains-mono
```

### 3.2 OpenType Features

Inter の代替文字形を有効化し、可読性を向上させる。

```css
body {
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}
```

| Feature | 効果 |
|---------|------|
| cv02 | 曖昧さのない `a` |
| cv03 | 開いた `6`, `9` |
| cv04 | 開いた `4` |
| cv11 | `I` と `l` の区別 |

### 3.3 フォントサイズスケール

| 名前 | サイズ | 行高 | 用途 |
|------|--------|------|------|
| xs | 12px (0.75rem) | 16px | バッジ、キャプション |
| sm | 14px (0.875rem) | 20px | セカンダリテキスト、ラベル |
| base | 16px (1rem) | 24px | 本文テキスト |
| lg | 18px (1.125rem) | 28px | セクションタイトル |
| xl | 20px (1.25rem) | 28px | ページタイトル |
| 2xl | 24px (1.5rem) | 32px | アプリタイトル（S1） |

### 3.4 フォントウェイト

| 名前 | 値 | 用途 |
|------|-----|------|
| normal | 400 | 本文、入力テキスト |
| medium | 500 | ラベル、ボタンテキスト、セクションヘッダー |
| semibold | 600 | 強調テキスト |
| bold | 700 | ページタイトル |

---

## 4. Spacing & Sizing

### 4.1 スペーシングスケール

Tailwind CSS のデフォルトスケール（4px 刻み）をそのまま使用。

| トークン | 値 | 主な用途 |
|----------|-----|----------|
| 0.5 | 2px | アイコンと隣接テキストのギャップ |
| 1 | 4px | タイト内部パディング |
| 1.5 | 6px | コンパクトボタン内パディング |
| 2 | 8px | フォーム要素の内部パディング |
| 3 | 12px | カード内パディング |
| 4 | 16px | セクション内パディング、パネルパディング |
| 5 | 20px | セクション間マージン |
| 6 | 24px | 大きなセクション間マージン |
| 8 | 32px | ページレベルパディング |

### 4.2 コンポーネントサイズ

| コンポーネント | 高さ | 備考 |
|----------------|------|------|
| ヘッダー | h-12 (48px) | 固定 |
| ボタン (default) | h-9 (36px) | — |
| ボタン (sm) | h-8 (32px) | コンパクトエリア |
| ボタン (icon) | h-9 w-9 (36px) | アイコンのみ |
| Input | h-9 (36px) | — |
| Select trigger | h-9 (36px) | — |
| Badge | h-5 (20px) | Anlas 表示等 |

### 4.3 レイアウト固定値・可変値

PR #25（2026-04-17）で左右サイドバーは**ドラッグリサイズ可能**となった。幅は `src/stores/layout-store.ts` が管理し `localStorage` に永続化する。

| 要素 | 初期値 | 最小 | 最大 | 実装 |
|------|-------|------|------|------|
| 左パネル幅 | 320px | 240px | 560px | `layout-store.leftSidebarWidth` |
| 右パネル幅 | 256px | 200px | 480px | `layout-store.rightSidebarWidth` |
| 中央パネル | 残りスペース | — | — | `flex-1` |
| ヘッダー高さ | 48px | — | — | `h-12` |
| 初期ウィンドウサイズ | 1400×900 | — | — | Tauri 設定 |
| 最小ウィンドウ幅 | ~800px | — | — | — |

永続化キーは `layout-state`（Zustand `persist` middleware）。

---

## 5. Border Radius

丸めのデザインを採用。shadcn/ui のコンポーネントはこれらの変数を参照する。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--radius-lg` | 0.75rem (12px) | カード、ダイアログ、大きなコンテナ |
| `--radius-md` | calc(0.75rem - 2px) = 10px | ボタン、入力フィールド |
| `--radius-sm` | calc(0.75rem - 4px) = 8px | バッジ、小さな要素 |

---

## 6. Elevation / Shadow

ダークモードでは shadow ではなく `border` で面の区分けを行う。ライトモードでは subtle shadow を併用。

### ダークモード

```
カード区分け: border border-border（1px solid #3a3a3a）
ポップオーバー: border border-border
ダイアログ: border border-border
```

### ライトモード

```
カード: shadow-sm + border border-border
ポップオーバー: shadow-md + border border-border
ダイアログ: shadow-lg + border border-border
```

---

## 7. アイコン

**ライブラリ**: Lucide React (`lucide-react`)

| 用途 | アイコン名 |
|------|-----------|
| 戻る | `ArrowLeft` |
| 設定 | `Settings` |
| 追加 | `Plus` |
| 削除 | `Trash2` |
| 閉じる | `X` |
| 保存 | `Save` |
| フォルダ | `FolderOpen` |
| 画像 | `Image` |
| テーマ切替（ダーク→ライト） | `Sun` |
| テーマ切替（ライト→ダーク） | `Moon` |
| ローディング | `Loader2`（animate-spin） |
| 展開 | `ChevronDown` |
| 折りたたみ | `ChevronRight` |
| チェック | `Check` |
| 警告 | `AlertTriangle` |
| 情報 | `Info` |

**サイズ規則**:

| コンテキスト | サイズ | 備考 |
|-------------|--------|------|
| ヘッダーアイコン | 16px | `size={16}` |
| ボタン内アイコン | 16px | テキスト横に配置 |
| 空状態アイコン | 48px | 中央配置 |
| アイコンボタン | 16px | `size="icon"` ボタン内 |

---

## 8. テーマ切替メカニズム

### 方式

クラスベーストグル。`:root` にダークモード変数を定義し、`.light` クラスでライトモード変数を上書きする。

```
ダーク（デフォルト）: <html lang="ja">         → :root の変数が適用
ライト:              <html lang="ja" class="light"> → .light の変数が適用
```

`prefers-color-scheme` メディアクエリは使用しない（ユーザー明示制御のみ）。

### 永続化

- Zustand `persist` middleware で `localStorage` に保存
- `onRehydrate` コールバックで初回レンダリング前にクラスを適用（FOUC 防止）

---

## 9. CSS 実装（`src/index.css`）

> 現在の `src/index.css` を正とする。以下は骨格イメージ。実装ではカラートークンは CSS 変数参照（`var(--primary)` 等）で `@theme` 内に登録される（Tailwind v4 `@theme` 構文）。

```css
@import "tailwindcss";

/* ── Tailwind v4 テーマ拡張 ── */
@theme {
  --font-sans: "IBM Plex Sans", "IBM Plex Sans JP", "Noto Sans JP", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
  --radius-lg: 0.75rem;
  --radius-md: calc(var(--radius-lg) - 2px);
  --radius-sm: calc(var(--radius-lg) - 4px);
  /* カラートークンは CSS 変数を参照する（--color-primary: var(--primary) など） */
}

/* ── ダークモード（デフォルト） ── */
:root {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.95 0 0);
  --card: oklch(0.17 0 0);
  --card-foreground: oklch(0.95 0 0);
  --popover: oklch(0.17 0 0);
  --popover-foreground: oklch(0.95 0 0);
  --primary: oklch(0.62 0.10 230);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.22 0 0);
  --secondary-foreground: oklch(0.9 0 0);
  --muted: oklch(0.22 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.25 0 0);
  --accent-foreground: oklch(0.95 0 0);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.28 0 0);
  --input: oklch(0.28 0 0);
  --ring: oklch(0.62 0.10 230);
  --sidebar-background: oklch(0.16 0 0);
  --sidebar-foreground: oklch(0.9 0 0);
  --sidebar-border: oklch(0.25 0 0);
  --sidebar-accent: oklch(0.25 0 0);
  --sidebar-accent-foreground: oklch(0.95 0 0);
  --sidebar-ring: oklch(0.62 0.10 230);
}

/* ── ライトモード ── */
.light {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.12 0 0);
  --card: oklch(1.0 0 0);
  --card-foreground: oklch(0.12 0 0);
  --popover: oklch(1.0 0 0);
  --popover-foreground: oklch(0.12 0 0);
  --primary: oklch(0.55 0.11 230);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.96 0 0);
  --secondary-foreground: oklch(0.2 0 0);
  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.45 0 0);
  --accent: oklch(0.93 0 0);
  --accent-foreground: oklch(0.15 0 0);
  --destructive: oklch(0.5 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.90 0 0);
  --input: oklch(0.90 0 0);
  --ring: oklch(0.55 0.11 230);
  --sidebar-background: oklch(0.97 0 0);
  --sidebar-foreground: oklch(0.2 0 0);
  --sidebar-border: oklch(0.90 0 0);
  --sidebar-accent: oklch(0.93 0 0);
  --sidebar-accent-foreground: oklch(0.15 0 0);
  --sidebar-ring: oklch(0.55 0.11 230);
}

/* ── ベーススタイル ── */
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }

  /* Tauri デスクトップ: テキスト以外のドラッグ選択を無効化 */
  body {
    -webkit-user-select: none;
    user-select: none;
  }
  input, textarea, [contenteditable="true"] {
    -webkit-user-select: text;
    user-select: text;
  }

  /* macOS 風スクロールバー */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: oklch(0.4 0 0);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: oklch(0.5 0 0);
  }
  .light ::-webkit-scrollbar-thumb {
    background: oklch(0.75 0 0);
  }
  .light ::-webkit-scrollbar-thumb:hover {
    background: oklch(0.65 0 0);
  }

  /* インタラクティブ要素のトランジション */
  button, [role="button"] {
    transition: background-color 150ms ease, color 150ms ease, opacity 150ms ease;
  }
}
```

---

## 10. shadcn/ui 設定（`components.json`）

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**スタイル選択**: New York — Default より密度が高く、Notion/Linear 的なコンパクトさ。
