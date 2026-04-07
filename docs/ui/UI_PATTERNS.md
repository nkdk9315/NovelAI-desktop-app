# UI パターンカタログ

本ドキュメントは、アプリ全体で一貫して使用する UI パターンを定義する。各パターンは shadcn/ui コンポーネントと Tailwind CSS クラスで実装する。

---

## 1. 状態パターン

### 1.1 ローディング

| パターン | 使用場面 | 実装 |
|----------|----------|------|
| Spinner | 短い操作（画像生成中、API 呼び出し） | `Loader2` + `animate-spin` |
| Skeleton | ページ初期ロード、データフェッチ | shadcn `Skeleton` |
| ボタン内ローディング | ボタン押下後の処理待ち | アイコンを `Loader2` に差し替え + `disabled` |

#### Spinner パターン（S2 中央パネル）

```
+--------------------------------------+
|                                      |
|          [Loader2 animate-spin]      |
|          "生成中..."                  |
|                                      |
+--------------------------------------+
```

- 中央パネルの画像表示エリアにオーバーレイ
- `bg-background/80 backdrop-blur-sm` で半透明背景
- `aria-busy="true"` を親要素に設定

#### ボタン内ローディング

```tsx
<Button disabled>
  <Loader2 className="animate-spin" size={16} />
  生成中...
</Button>
```

- Generate ボタン: 生成中は disabled + spinner
- 保存ボタン: 保存処理中は disabled + spinner

### 1.2 空状態（Empty State）

統一フォーマット: アイコン + メッセージ + アクションボタン

| 画面 | アイコン | メッセージ | アクション |
|------|---------|-----------|-----------|
| S1 プロジェクト一覧 | `FolderOpen` (48px) | "プロジェクトがありません" | "新規プロジェクト" ボタン |
| S2 中央パネル（未生成） | `Image` (48px) | "画像を生成してください" | — |
| S2 右パネル（履歴なし） | `Image` (32px) | "履歴がありません" | — |
| S4 グループ一覧 | — | "グループがありません" | "新規作成" ボタン |
| S5 Vibe 一覧 | — | "Vibe がありません" | "インポート" ボタン |

#### 実装パターン

```tsx
<div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
  <Icon size={48} />
  <p className="text-sm">メッセージ</p>
  <Button variant="outline" size="sm">アクション</Button>
</div>
```

### 1.3 エラー状態

3 段階のエラー表示を使い分ける。

| レベル | 使用場面 | 実装 |
|--------|----------|------|
| インライン | フォームバリデーション | フィールド下に赤テキスト |
| トースト | API エラー、操作失敗 | sonner トースト（右下） |
| ダイアログ | 致命的エラー（API キー無効等） | AlertDialog |

#### インラインエラー

```tsx
<div className="space-y-1.5">
  <Label>プロジェクト名</Label>
  <Input className="border-destructive" />
  <p className="text-xs text-destructive">名前は必須です</p>
</div>
```

- `aria-invalid="true"` + `aria-describedby` でエラーメッセージを関連付け

#### トーストエラー

```tsx
toast.error("画像の生成に失敗しました", {
  description: "API からエラーが返されました。設定を確認してください。",
});
```

#### 致命的エラーダイアログ

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>API キーが無効です</AlertDialogTitle>
      <AlertDialogDescription>
        設定画面で正しい API キーを入力してください。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction>設定を開く</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 1.4 無効状態（Disabled）

| 場面 | スタイル | 理由表示 |
|------|---------|----------|
| キャラクター上限到達 | `opacity-50 cursor-not-allowed` | Tooltip: "最大6人まで" |
| Anlas 不足 | `opacity-50 cursor-not-allowed` | Tooltip: "Anlas が不足しています" |
| API 未初期化 | `opacity-50 cursor-not-allowed` | Tooltip: "API キーを設定してください" |
| 生成中 | `opacity-50 cursor-not-allowed` | — (spinner で状態表示) |
| システムグループ | 編集/削除ボタン非表示 | — |

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span tabIndex={0}>
      <Button disabled>追加</Button>
    </span>
  </TooltipTrigger>
  <TooltipContent>最大6人まで</TooltipContent>
</Tooltip>
```

> `<span>` でラップする理由: `disabled` なボタンはホバーイベントを発火しないため。

### 1.5 成功状態

- トースト通知のみ使用（視覚的なインラインサクセス表示は不要）

```tsx
toast.success("画像を保存しました");
toast.success("プロジェクトを作成しました");
```

---

## 2. フォームパターン

### 2.1 テキスト入力

#### 標準入力（S8 プロジェクト名等）

```tsx
<div className="space-y-1.5">
  <Label htmlFor="project-name" className="text-sm font-medium">
    プロジェクト名
  </Label>
  <Input
    id="project-name"
    placeholder="名前を入力..."
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</div>
```

#### パスワード入力（S3 API キー）

```tsx
<div className="space-y-1.5">
  <Label htmlFor="api-key">API Key</Label>
  <Input id="api-key" type="password" />
</div>
```

### 2.2 ドロップダウン選択

#### ヘッダー用コンパクトセレクト

```tsx
<Select value={model} onValueChange={setModel}>
  <SelectTrigger className="h-8 w-40 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {MODELS.map((m) => (
      <SelectItem key={m} value={m}>{getModelDisplayName(m)}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- ヘッダー内セレクト: `h-8`（コンパクト）、`text-xs`
- モーダル内セレクト: `h-9`（標準）、`text-sm`

### 2.3 数値入力

#### ヘッダーパラメータ（Steps, Scale, Width, Height 等）

```tsx
<div className="flex items-center gap-1.5">
  <Label className="text-xs text-muted-foreground whitespace-nowrap">Steps</Label>
  <Input
    type="number"
    className="h-8 w-16 text-xs text-center"
    min={1}
    max={50}
    value={steps}
    onChange={(e) => setSteps(Number(e.target.value))}
  />
</div>
```

- ヘッダー内: `h-8 w-16 text-xs` — 極めてコンパクト
- 幅サイズ: 2桁=`w-14`、4桁=`w-16`、5桁=`w-20`

### 2.4 テキストエリア（プロンプト入力）

```tsx
<Textarea
  placeholder="プロンプトを入力..."
  className="min-h-[80px] resize-y text-sm"
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
/>
```

- メインプロンプト: `min-h-[80px]`、リサイズ可
- キャラクタープロンプト: `min-h-[60px]`
- オートコンプリート候補は `Popover` + `Command` で表示（セクション 4.1 参照）

### 2.5 スライダー

#### Position スライダー（キャラクター配置）

```tsx
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <Label className="text-xs text-muted-foreground">Position X</Label>
    <span className="text-xs font-mono text-muted-foreground">{value.toFixed(2)}</span>
  </div>
  <Slider
    min={0}
    max={1}
    step={0.01}
    value={[centerX]}
    onValueChange={([v]) => setCenterX(v)}
  />
</div>
```

- ラベル + 現在値を横並び表示
- 値は `font-mono` で等幅表示
- step: position=0.01、strength=0.05

#### Vibe Strength / Information Extracted

```tsx
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <Label className="text-xs text-muted-foreground">Strength</Label>
    <span className="text-xs font-mono text-muted-foreground">0.70</span>
  </div>
  <Slider min={0} max={1} step={0.05} value={[0.7]} />
</div>
```

### 2.6 トグル・チェックボックス

#### Vibe ON/OFF

```tsx
<div className="flex items-center gap-2">
  <Checkbox
    id={`vibe-${vibe.id}`}
    checked={isEnabled}
    onCheckedChange={setIsEnabled}
  />
  <Label htmlFor={`vibe-${vibe.id}`} className="text-sm truncate">
    {vibe.name}
  </Label>
</div>
```

#### ネガティブプロンプト折りたたみ

```tsx
<button
  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
  onClick={() => setShowNegative(!showNegative)}
>
  {showNegative ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
  Negative
</button>
```

### 2.7 タグリスト（プロンプトグループ編集）

```tsx
<div className="flex flex-wrap gap-1.5">
  {tags.map((tag, i) => (
    <Badge key={i} variant="secondary" className="gap-1 pr-1">
      {tag}
      <button
        className="ml-0.5 rounded-full hover:bg-accent p-0.5"
        onClick={() => removeTag(i)}
      >
        <X size={12} />
      </button>
    </Badge>
  ))}
</div>
```

---

## 3. フィードバックパターン

### 3.1 トースト通知

**ライブラリ**: sonner

**配置**: 右下（`<Toaster position="bottom-right" />`）

| 種類 | 使用場面 | 例 |
|------|----------|-----|
| success | 操作成功 | "画像を保存しました"、"プロジェクトを作成しました" |
| error | API エラー、操作失敗 | "生成に失敗しました"、"API エラー" |
| info | 情報通知 | "未保存画像をクリーンアップしました" |

```tsx
// App.tsx
<Toaster position="bottom-right" richColors closeButton />
```

### 3.2 リアルタイムコスト更新

ヘッダーの Anlas コスト表示はパラメータ変更に追従する。

```
パラメータ変更 → debounce 300ms → estimateCost() → コスト表示更新
```

| 状態 | 表示 |
|------|------|
| Opus 無料条件達成 | `Free` (text-primary) |
| 通常 | `~{cost} Anlas` (text-foreground) |
| 残高不足 | `~{cost} Anlas` (text-destructive) + AlertTriangle アイコン |

```tsx
<div className="flex items-center gap-1 text-xs">
  <span className="text-muted-foreground">Cost:</span>
  {isFree ? (
    <span className="text-primary font-medium">Free</span>
  ) : (
    <span className={insufficient ? "text-destructive" : ""}>
      ~{cost}
      {insufficient && <AlertTriangle size={12} className="ml-0.5 inline" />}
    </span>
  )}
</div>
```

### 3.3 インラインバリデーション

リアルタイムバリデーション（debounce 付き）を使用する場面:

| フィールド | バリデーション | タイミング |
|-----------|---------------|-----------|
| プロジェクト名 | 空チェック | onChange |
| Width / Height | 範囲チェック (64-2048)、ピクセル上限チェック | onChange (debounce 300ms) |
| Steps | 範囲チェック (1-50) | onChange |
| Scale | 範囲チェック (0.0-10.0) | onChange |
| API キー | 空チェック | onChange |

バリデーションエラーはフィールド直下に `text-xs text-destructive` で表示。

### 3.4 確認ダイアログ（S9 パターン）

破壊的操作の前に必ず確認ダイアログを表示する。

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon">
      <Trash2 size={16} />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>削除の確認</AlertDialogTitle>
      <AlertDialogDescription>
        プロジェクト「{name}」を削除しますか？この操作は元に戻せません。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={handleDelete}
      >
        削除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

確認が必要な操作一覧:

| 操作 | メッセージ |
|------|-----------|
| プロジェクト削除 | "プロジェクト「{name}」を削除しますか？この操作は元に戻せません。" |
| 画像削除 | "この画像を削除しますか？" |
| ジャンル削除 | "ジャンル「{name}」を削除しますか？紐づくプロンプトグループも削除されます。" |
| Vibe 削除 | "Vibe「{name}」を削除しますか？" |
| Vibe エンコード | "2 Anlas を消費します。実行しますか？" |
| プロンプトグループ削除 | "グループ「{name}」を削除しますか？" |
| スタイルプリセット削除 | "プリセット「{name}」を削除しますか？" |

---

## 4. インタラクションパターン

### 4.1 オートコンプリート（F7 システムプロンプト）

プロンプト入力中に Tauri コマンド経由でタグ候補を検索し、ドロップダウンで表示する。

```
キー入力 → debounce 200ms → searchSystemPrompts() → 候補リスト表示
```

#### 候補リスト表示

```tsx
<Popover open={showSuggestions}>
  <PopoverAnchor asChild>
    <Textarea ... />
  </PopoverAnchor>
  <PopoverContent className="w-64 p-0" align="start">
    <Command>
      <CommandList>
        {suggestions.map((s) => (
          <CommandItem key={s.tag} onSelect={() => insertTag(s.tag)}>
            <span>{s.tag}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {s.postCount.toLocaleString()}
            </span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

- ↑↓ で候補移動、Enter/Tab で選択、Escape で閉じる
- 候補の右側に `post_count` を表示（人気度の参考）

### 4.2 ホバー・フォーカスパターン

| 要素 | ホバー | フォーカス |
|------|--------|----------|
| ボタン (default) | `hover:bg-primary/90` | `focus-visible:ring-2 ring-ring ring-offset-2` |
| ボタン (ghost) | `hover:bg-accent` | 同上 |
| ボタン (outline) | `hover:bg-accent` | 同上 |
| カード | `hover:bg-accent` | `focus-visible:ring-2` |
| リスト項目 | `hover:bg-accent` | `focus-visible:bg-accent` |
| サムネイル | `hover:ring-2 ring-ring` | `focus-visible:ring-2` |

### 4.3 トランジション

```css
button, [role="button"] {
  transition: background-color 150ms ease, color 150ms ease, opacity 150ms ease;
}
```

- ボタン、ホバー: 150ms ease
- 折りたたみ展開: Tailwind `transition-all duration-200`
- モーダル開閉: shadcn/ui のデフォルトアニメーション（fade + scale）

### 4.4 スクロール

macOS 風の thin scrollbar を全体に適用。

```
幅: 6px
トラック: 透明
サム: oklch(0.4 0 0) / ライト時 oklch(0.75 0 0)
角丸: 3px
```

- 左パネル: `overflow-y-auto`（独立スクロール）
- 右パネル: `overflow-y-auto`（独立スクロール）
- 中央パネル: `overflow-hidden`（画像は `object-contain` でフィット）
- モーダル内リスト: `ScrollArea`（shadcn/ui）

---

## 5. モーダル/ダイアログパターン

### 5.1 Dialog（S3, S4, S5, S6, S8）

設定やリソース管理に使用するフルモーダル。

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>タイトル</DialogTitle>
    </DialogHeader>
    {/* コンテンツ */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
      <Button onClick={handleSave}>保存</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

| モーダル | max-width | 備考 |
|----------|-----------|------|
| S3 設定 | `max-w-md` (448px) | シンプルなフォーム |
| S4 プロンプトグループ | `max-w-3xl` (768px) | 2 カラムレイアウト |
| S5 Vibe 管理 | `max-w-lg` (512px) | リスト + エンコードセクション |
| S6 スタイルプリセット | `max-w-2xl` (672px) | 2 カラムレイアウト |
| S8 プロジェクト作成 | `max-w-md` (448px) | シンプルなフォーム |

### 5.2 AlertDialog（S9 確認ダイアログ）

破壊的操作の確認専用。セクション 3.4 参照。

### 5.3 Overlay（S7 画像詳細）

中央パネル上に表示するオーバーレイ。Dialog ではなくカスタム実装。

```tsx
<div className="absolute inset-0 z-10 flex flex-col bg-background/95 backdrop-blur-sm">
  <div className="flex items-center justify-between border-b border-border px-4 py-2">
    <h3 className="text-sm font-medium">画像詳細</h3>
    <Button variant="ghost" size="icon" onClick={onClose}>
      <X size={16} />
    </Button>
  </div>
  <div className="flex-1 overflow-y-auto p-4">
    {/* 画像 + メタデータ + プロンプトスナップショット */}
  </div>
  <div className="flex justify-end gap-2 border-t border-border px-4 py-2">
    <Button variant="outline" size="sm">Save</Button>
    <Button variant="destructive" size="sm">Delete</Button>
  </div>
</div>
```

- 中央パネルの `position: relative` 内に `position: absolute` で配置
- `bg-background/95 backdrop-blur-sm` で下層をぼかす
- Escape キーで閉じる

---

## 6. セクション構成パターン（左パネル）

左パネルの各セクションは統一フォーマットで構成する。

```tsx
<div className="space-y-2 px-4 py-3">
  {/* セクションヘッダー */}
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      セクション名
    </span>
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
      アクション
    </Button>
  </div>

  {/* セクションコンテンツ */}
  {/* ... */}
</div>

<Separator />
```

- セクション間は `Separator` で区切る
- ヘッダーラベル: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
- 内部スペーシング: `space-y-2`
- パディング: `px-4 py-3`
