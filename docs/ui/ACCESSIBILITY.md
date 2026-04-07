# アクセシビリティガイドライン

## 1. 基本方針

- **準拠基準**: WCAG 2.1 AA
- **対象**: デスクトップアプリケーション（macOS / Windows / Linux）
- **shadcn/ui 活用**: shadcn/ui（Radix UI ベース）は WAI-ARIA を標準サポート。カスタムコンポーネントでも同等の a11y を確保する

---

## 2. WAI-ARIA ルール

### 2.1 ランドマーク

| 要素 | role / セマンティクス | 備考 |
|------|----------------------|------|
| ヘッダー | `<header>` | `role="banner"` は暗黙 |
| 左パネル | `<aside aria-label="プロンプト">` | — |
| 中央パネル | `<main>` | `role="main"` は暗黙 |
| 右パネル | `<aside aria-label="履歴">` | — |
| ナビゲーション | `<nav>` | S1 のプロジェクトリスト内 |

### 2.2 Dialog / AlertDialog

shadcn/ui の Dialog / AlertDialog は Radix UI ベースで以下を自動提供:

| 属性 | 値 | 提供元 |
|------|-----|--------|
| `role` | `dialog` / `alertdialog` | 自動 |
| `aria-modal` | `true` | 自動 |
| `aria-labelledby` | DialogTitle の id | 自動 |
| `aria-describedby` | DialogDescription の id | 自動 |

**注意**: `DialogTitle` と `DialogDescription` は必ず含める。省略すると Radix がコンソール警告を出す。

### 2.3 フォーム要素

| 要素 | 必須属性 | 実装例 |
|------|----------|--------|
| Input | `id` + `<Label htmlFor>` | `<Label htmlFor="name">名前</Label><Input id="name" />` |
| Textarea | `id` + `<Label htmlFor>` | 同上 |
| Select | `aria-label` or `<Label>` | shadcn Select は内部で管理 |
| Slider | `aria-label` or `aria-labelledby` | `<Slider aria-label="Position X" />` |
| Checkbox | `id` + `<Label htmlFor>` | shadcn Checkbox は内部で管理 |

#### バリデーションエラー

```tsx
<Input
  id="project-name"
  aria-invalid={!!error}
  aria-describedby={error ? "name-error" : undefined}
/>
{error && (
  <p id="name-error" role="alert" className="text-xs text-destructive">
    {error}
  </p>
)}
```

- `aria-invalid="true"` でエラー状態を伝達
- `aria-describedby` でエラーメッセージを関連付け
- `role="alert"` でスクリーンリーダーに即時通知

### 2.4 トグル・スイッチ

| 要素 | 属性 | 備考 |
|------|------|------|
| Vibe ON/OFF (Checkbox) | `aria-checked` | Radix が自動管理 |
| ネガティブ展開ボタン | `aria-expanded` | 手動設定が必要 |
| テーマ切替 | `aria-label="テーマ切替"` | アイコンのみボタン |
| 履歴フィルタ (ToggleGroup) | `aria-label="履歴フィルタ"` | グループに設定 |

```tsx
<button
  aria-expanded={showNegative}
  aria-controls="negative-prompt-section"
  onClick={() => setShowNegative(!showNegative)}
>
  Negative
</button>
<div id="negative-prompt-section" hidden={!showNegative}>
  <Textarea ... />
</div>
```

### 2.5 画像

| 画像種類 | alt テキスト |
|----------|-------------|
| 生成画像（中央パネル） | `"生成画像 seed:{seed} model:{model}"` |
| 履歴サムネイル | `"生成画像 {index}"` |
| 空状態アイコン | `""` (装飾的、`aria-hidden="true"`) |

```tsx
<img
  src={imageUrl}
  alt={`生成画像 seed:${seed} model:${model}`}
  className="object-contain"
/>
```

### 2.6 ローディング状態

```tsx
<div aria-busy={isGenerating} aria-live="polite">
  {isGenerating ? (
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="animate-spin" aria-hidden="true" />
      <span className="sr-only">画像を生成中</span>
      <span aria-hidden="true" className="text-sm text-muted-foreground">生成中...</span>
    </div>
  ) : (
    <img ... />
  )}
</div>
```

- `aria-busy="true"` で処理中を通知
- `aria-live="polite"` で完了時に自動通知
- スクリーンリーダー専用テキスト: `sr-only` クラス

### 2.7 リアルタイム更新（ライブリージョン）

| 要素 | aria-live | 備考 |
|------|-----------|------|
| コスト表示 | `polite` | パラメータ変更時に更新 |
| Anlas 残高 | `polite` | 生成後に更新 |
| エラーメッセージ | `assertive` | 即時通知 |
| トースト | — | sonner が内部管理 |

```tsx
<span aria-live="polite" aria-atomic="true" className="text-xs">
  Cost: ~{cost} Anlas
</span>
```

---

## 3. キーボード操作

### 3.1 グローバルショートカット

| キー | 動作 | 画面 |
|------|------|------|
| `Ctrl/Cmd + Enter` | 画像生成 | S2 |
| `Ctrl/Cmd + S` | 現在の画像を保存 | S2 |
| `Escape` | ダイアログ/オーバーレイを閉じる | 全画面 |

### 3.2 Tab 順序

S2（生成画面）の Tab 順序:

```
1. ヘッダー
   1.1 戻るボタン
   1.2 モデルセレクト
   1.3 Width 入力
   1.4 Height 入力
   1.5 Count 入力
   1.6 サンプラーセレクト
   1.7 Steps 入力
   1.8 Scale 入力
   1.9 設定ボタン
   1.10 テーマ切替ボタン
2. 左パネル
   2.1 メインプロンプト（ポジティブ）
   2.2 ネガティブ展開トグル
   2.3 ネガティブプロンプト（展開時）
   2.4 グループ追加ボタン
   2.5 キャラクター追加ボタン群
   2.6 キャラクターセクション（存在時）
   2.7 アーティスト/スタイルセクション
   2.8 Vibe セクション
3. 中央パネル
   3.1 Generate ボタン
   3.2 Save ボタン
   3.3 Save All ボタン
   3.4 Delete ボタン
4. 右パネル
   4.1 フィルタ切替 (All/Saved)
   4.2 サムネイル群
```

### 3.3 Dialog 内のキーボード操作

| キー | 動作 |
|------|------|
| `Tab` | 次のフォーカス可能要素へ（ダイアログ内でトラップ） |
| `Shift + Tab` | 前のフォーカス可能要素へ |
| `Escape` | ダイアログを閉じる |
| `Enter` | フォーカス中のボタンをアクティベート |

Radix UI の Dialog は以下を自動提供:
- フォーカストラップ
- 開閉時のフォーカス移動・復帰
- Escape キーで閉じる
- 背景クリックで閉じる

### 3.4 オートコンプリートのキーボード操作

| キー | 動作 |
|------|------|
| 文字入力 | 候補リスト表示（debounce 200ms 後） |
| `↑` / `↓` | 候補を移動 |
| `Enter` / `Tab` | 選択中の候補を挿入 |
| `Escape` | 候補リストを閉じる |

```tsx
// Command コンポーネントが ↑↓ Enter をハンドリング
// Escape は onKeyDown で手動処理
<Textarea
  onKeyDown={(e) => {
    if (e.key === "Escape" && showSuggestions) {
      e.preventDefault();
      setShowSuggestions(false);
    }
  }}
/>
```

### 3.5 スライダーのキーボード操作

Radix UI の Slider が自動提供:

| キー | 動作 |
|------|------|
| `←` / `→` | 1 step 増減 |
| `↑` / `↓` | 1 step 増減 |
| `Home` | 最小値へ |
| `End` | 最大値へ |
| `Page Up` | 大きく増加 |
| `Page Down` | 大きく減少 |

### 3.6 サムネイルグリッドのキーボード操作

| キー | 動作 |
|------|------|
| `Tab` | グリッドにフォーカス移動 |
| `←` / `→` / `↑` / `↓` | サムネイル間を移動 |
| `Enter` / `Space` | 選択（中央パネルに表示） |
| `Enter` × 2 (ダブル) | 画像詳細オーバーレイを開く |

サムネイルグリッドには `role="grid"` + `role="gridcell"` を適用:

```tsx
<div role="grid" aria-label="生成画像履歴" className="grid grid-cols-2 gap-1">
  {images.map((img, i) => (
    <div
      key={img.id}
      role="gridcell"
      tabIndex={i === focusedIndex ? 0 : -1}
      onKeyDown={handleGridKeyDown}
      onClick={() => selectImage(img)}
      onDoubleClick={() => openDetail(img)}
    >
      <img src={img.thumbnailUrl} alt={`生成画像 ${i + 1}`} />
    </div>
  ))}
</div>
```

---

## 4. フォーカス管理

### 4.1 Dialog の開閉

| イベント | フォーカス移動先 |
|----------|-----------------|
| Dialog 開く | 最初のフォーカス可能要素（Radix が自動処理） |
| Dialog 閉じる | トリガー要素に復帰（Radix が自動処理） |

### 4.2 キャラクター追加・削除

| イベント | フォーカス移動先 |
|----------|-----------------|
| キャラクター追加 | 新しいキャラクターセクションのプロンプトテキストエリア |
| キャラクター削除 | 前のキャラクターセクション、なければキャラクター追加ボタン |

```tsx
const addCharacter = (genreId: string) => {
  const newChar = createCharacter(genreId);
  // DOM 更新後にフォーカス移動
  requestAnimationFrame(() => {
    document.getElementById(`char-prompt-${newChar.id}`)?.focus();
  });
};

const removeCharacter = (index: number) => {
  deleteCharacter(index);
  requestAnimationFrame(() => {
    if (index > 0) {
      document.getElementById(`char-prompt-${characters[index - 1].id}`)?.focus();
    } else {
      document.getElementById("add-character-button")?.focus();
    }
  });
};
```

### 4.3 リスト項目の削除

| イベント | フォーカス移動先 |
|----------|-----------------|
| リスト項目削除 | 次の項目、なければ前の項目、なければ「追加」ボタン |

### 4.4 画像詳細オーバーレイ（S7）

| イベント | フォーカス移動先 |
|----------|-----------------|
| オーバーレイ開く | 閉じるボタン |
| オーバーレイ閉じる | トリガー元のサムネイル |

```tsx
const openDetail = (imageId: string) => {
  triggerRef.current = document.activeElement as HTMLElement;
  setDetailImage(imageId);
  requestAnimationFrame(() => {
    document.getElementById("detail-close-button")?.focus();
  });
};

const closeDetail = () => {
  setDetailImage(null);
  triggerRef.current?.focus();
};
```

---

## 5. コントラスト基準

### 5.1 WCAG 2.1 AA 要件

| テキスト種類 | 最低コントラスト比 |
|-------------|-------------------|
| 通常テキスト (< 24px / < 18.66px bold) | 4.5:1 |
| 大きいテキスト (≥ 24px / ≥ 18.66px bold) | 3:1 |
| UI コンポーネント（ボーダー、アイコン等） | 3:1 |

### 5.2 ダークモードのコントラスト検証

| 組み合わせ | 前景 oklch | 背景 oklch | 近似コントラスト比 | 判定 |
|-----------|-----------|-----------|-------------------|------|
| foreground / background | 0.95 / 0.145 | — | ~13:1 | AA |
| muted-foreground / background | 0.65 / 0.145 | — | ~5.5:1 | AA |
| muted-foreground / card | 0.65 / 0.17 | — | ~4.7:1 | AA |
| primary / background | 0.62 / 0.145 | — | ~5.2:1 | AA |
| primary-foreground / primary | 0.98 / 0.62 | — | ~5.5:1 | AA |
| destructive-foreground / destructive | 0.98 / 0.55 | — | ~4.8:1 | AA |
| foreground / card | 0.95 / 0.17 | — | ~11:1 | AA |
| sidebar-foreground / sidebar-bg | 0.9 / 0.16 | — | ~9:1 | AA |

### 5.3 ライトモードのコントラスト検証

| 組み合わせ | 前景 oklch | 背景 oklch | 近似コントラスト比 | 判定 |
|-----------|-----------|-----------|-------------------|------|
| foreground / background | 0.12 / 0.99 | — | ~15:1 | AA |
| muted-foreground / background | 0.45 / 0.99 | — | ~5.0:1 | AA |
| muted-foreground / card | 0.45 / 1.0 | — | ~5.5:1 | AA |
| primary / background | 0.55 / 0.99 | — | ~4.5:1 | AA |
| primary-foreground / primary | 0.98 / 0.55 | — | ~4.5:1 | AA |
| destructive-foreground / destructive | 0.98 / 0.5 | — | ~5.0:1 | AA |
| foreground / card | 0.12 / 1.0 | — | ~16:1 | AA |

### 5.4 UI コンポーネントのコントラスト

| 要素 | 前景 | 背景 | 備考 |
|------|------|------|------|
| ボーダー (dark) | border (0.28) / background (0.145) | — | 3:1 以上 |
| ボーダー (light) | border (0.90) / background (0.99) | — | 3:1 以上 |
| フォーカスリング | ring (primary) / background | — | 3:1 以上 |
| スクロールバー | thumb (0.4) / track (transparent→背景) | — | 3:1 以上 |

---

## 6. スクリーンリーダー対応

### 6.1 非表示テキスト

視覚的に表示しないが、スクリーンリーダーには読み上げるテキスト:

```tsx
<span className="sr-only">テキスト</span>
```

使用箇所:

| 箇所 | テキスト |
|------|---------|
| アイコンのみボタン | 各ボタンの機能説明 |
| ローディングスピナー | "画像を生成中" |
| 保存インジケーター ([*]) | "保存済み" / "未保存" |

### 6.2 装飾要素の非表示

スクリーンリーダーから隠す装飾的要素:

```tsx
<Loader2 className="animate-spin" aria-hidden="true" />
<Separator aria-hidden="true" />
```

### 6.3 動的コンテンツの通知

```tsx
// 生成完了通知
<div aria-live="polite" aria-atomic="true">
  {lastResult && <span className="sr-only">画像の生成が完了しました</span>}
</div>

// エラー通知
<div aria-live="assertive">
  {error && <span className="sr-only">エラー: {error}</span>}
</div>
```
