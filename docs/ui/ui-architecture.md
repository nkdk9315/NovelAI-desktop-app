# UI アーキテクチャ設計書

## 1. 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | React | 19 |
| 言語 | TypeScript | 5.7 |
| スタイリング | Tailwind CSS (Vite plugin) | 4 |
| コンポーネントライブラリ | shadcn/ui (New York) | — |
| 状態管理 | Zustand | 5 |
| ルーティング | react-router-dom (MemoryRouter) | 7 |
| アイコン | Lucide React | — |
| トースト | Sonner | — |
| ビルド | Vite | 6 |
| デスクトップ | Tauri | 2 |

---

## 2. 依存パッケージ

### 2.1 追加インストールが必要なパッケージ

```bash
# フォント（セルフホスト — デスクトップアプリなので CDN 不使用）
npm install @fontsource-variable/inter @fontsource-variable/jetbrains-mono @fontsource/noto-sans-jp

# shadcn/ui 前提ライブラリ
npm install clsx tailwind-merge lucide-react class-variance-authority

# ルーティング
npm install react-router-dom

# トースト
npm install sonner
```

### 2.2 ユーティリティ関数

**ファイル**: `src/lib/utils.ts`（新規作成）

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

shadcn/ui の全コンポーネントが依存する `cn` 関数。

---

## 3. shadcn/ui コンポーネント

### 3.1 設定ファイル

**ファイル**: `components.json`（プロジェクトルートに新規作成）

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

### 3.2 コンポーネント一覧とインストール順

画面依存関係に基づいてバッチインストールする。

**Batch 1 — 基盤（全画面で使用）**

```bash
npx shadcn@latest add button input label separator
```

| コンポーネント | 主な使用画面 |
|---------------|-------------|
| Button | 全画面 |
| Input | S2 ヘッダー、S3、S8 |
| Label | 全フォーム |
| Separator | S2 左パネルセクション区切り |

**Batch 2 — レイアウト・ナビゲーション**

```bash
npx shadcn@latest add card scroll-area tabs badge
```

| コンポーネント | 主な使用画面 |
|---------------|-------------|
| Card | S1 プロジェクトカード |
| ScrollArea | S2 左・右パネル |
| Tabs | S4 ジャンルタブ |
| Badge | S2 Anlas 表示、タグ |

**Batch 3 — オーバーレイ**

```bash
npx shadcn@latest add dialog alert-dialog popover tooltip
```

| コンポーネント | 主な使用画面 |
|---------------|-------------|
| Dialog | S3, S4, S5, S6, S8 |
| AlertDialog | S9 削除確認 |
| Popover | オートコンプリート候補 |
| Tooltip | disabled 理由表示 |

**Batch 4 — フォームコントロール**

```bash
npx shadcn@latest add select slider textarea checkbox switch toggle toggle-group
```

| コンポーネント | 主な使用画面 |
|---------------|-------------|
| Select | S2 モデル・サンプラー選択 |
| Slider | S2 position、Vibe strength |
| Textarea | S2 プロンプト入力 |
| Checkbox | S5 Vibe ON/OFF |
| Switch | S3 設定トグル |
| Toggle | S2 ネガティブ展開 |
| ToggleGroup | S2 履歴 All/Saved フィルタ |

**Batch 5 — データ表示・フィードバック**

```bash
npx shadcn@latest add command dropdown-menu skeleton sonner
```

| コンポーネント | 主な使用画面 |
|---------------|-------------|
| Command | オートコンプリートリスト |
| DropdownMenu | コンテキストメニュー |
| Skeleton | 初期ロード |
| Sonner (Toaster) | トースト通知 |

---

## 4. ルーティング

### 4.1 ルーター設定

Tauri の WebView は `file://` プロトコルで動作するため、`BrowserRouter` は使用不可。`MemoryRouter` を使用する。

**ファイル**: `src/App.tsx`

```tsx
import { MemoryRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ProjectListPage />} />
        <Route path="/project/:id" element={<GenerationPage />} />
      </Routes>
      <Toaster position="bottom-right" richColors closeButton />
    </MemoryRouter>
  );
}
```

### 4.2 ルート定義

| パス | ページ | 画面 ID |
|------|--------|---------|
| `/` | `ProjectListPage` | S1 |
| `/project/:id` | `GenerationPage` | S2 |

### 4.3 画面遷移

| 遷移 | トリガー | 方法 |
|------|---------|------|
| S1 → S2 | プロジェクト開く/作成 | `navigate(\`/project/${id}\`)` |
| S2 → S1 | 戻るボタン | `navigate("/")` |

モーダル（S3〜S9）はルートとは独立。コンポーネント内の state で開閉を制御する。

---

## 5. コンポーネント階層

### 5.1 全体ツリー

```
App
└── MemoryRouter
    └── Routes
        ├── "/" → ProjectListPage (S1)
        │   ├── ProjectListHeader
        │   │   ├── Button ("新規プロジェクト")
        │   │   └── Button ("設定") → opens SettingsDialog
        │   ├── ProjectCardGrid
        │   │   └── ProjectCard × N
        │   │       ├── Card (shadcn)
        │   │       ├── Button ("開く")
        │   │       └── Button ("削除") → opens DeleteConfirmDialog
        │   ├── EmptyState (プロジェクト 0 件時)
        │   ├── CreateProjectDialog (S8)
        │   ├── SettingsDialog (S3)
        │   └── DeleteConfirmDialog (S9)
        │
        └── "/project/:id" → GenerationPage (S2)
            ├── Header
            │   ├── BackButton
            │   ├── ProjectName
            │   ├── AnlasDisplay
            │   │   └── Badge (残高 + ティア)
            │   ├── CostDisplay
            │   ├── GenerationParams
            │   │   ├── Select (Model)
            │   │   ├── Input (Width)
            │   │   ├── Input (Height)
            │   │   ├── Input (Count)
            │   │   ├── Select (Sampler)
            │   │   ├── Input (Steps)
            │   │   └── Input (Scale)
            │   ├── Button (設定) → opens SettingsDialog
            │   └── ThemeToggle
            │
            ├── LeftPanel (aside, w-80, ScrollArea)
            │   ├── MainPromptSection
            │   │   ├── Textarea (ポジティブ, autocomplete)
            │   │   ├── NegativeToggle
            │   │   ├── Textarea (ネガティブ, 折りたたみ)
            │   │   └── PromptGroupPicker
            │   ├── Separator
            │   ├── CharacterAddButtons
            │   │   └── Button × N (ジャンルごと)
            │   ├── Separator
            │   ├── CharacterSection × 0-6
            │   │   ├── CharacterHeader (番号 + ジャンル名 + 削除)
            │   │   ├── Textarea (ポジティブ, autocomplete)
            │   │   ├── NegativeToggle
            │   │   ├── Textarea (ネガティブ)
            │   │   ├── PositionSliders (Slider × 2)
            │   │   └── PromptGroupPicker
            │   ├── Separator
            │   ├── ArtistStyleSection
            │   │   ├── Input (アーティストタグ, autocomplete)
            │   │   ├── Select (スタイルプリセット)
            │   │   └── Button ("管理") → opens StylePresetModal
            │   ├── Separator
            │   └── VibeSection
            │       ├── VibeHeader (カウント + 管理ボタン)
            │       └── VibeItem × N
            │           ├── Checkbox (ON/OFF)
            │           ├── Label (Vibe 名)
            │           └── Slider × 2 (strength, info_extracted)
            │
            ├── CenterPanel (main, flex-1)
            │   ├── ImageDisplay
            │   │   ├── img (生成画像)
            │   │   ├── LoadingOverlay (生成中)
            │   │   └── EmptyState (未生成)
            │   ├── ActionBar
            │   │   ├── Button ("Generate")
            │   │   ├── Button ("Save")
            │   │   ├── Button ("Save All")
            │   │   └── Button ("Delete") → opens DeleteConfirmDialog
            │   └── ImageDetailOverlay (S7, 条件付き表示)
            │
            ├── RightPanel (aside, w-64, ScrollArea)
            │   ├── HistoryHeader
            │   │   ├── Label ("History")
            │   │   └── ToggleGroup (All / Saved)
            │   └── ThumbnailGrid
            │       └── ThumbnailItem × N
            │           ├── img (サムネイル)
            │           └── SaveIndicator
            │
            ├── SettingsDialog (S3)
            ├── PromptGroupModal (S4)
            │   ├── GenreSection
            │   │   ├── Tabs (ジャンル切替)
            │   │   └── GenreManagement (追加/削除)
            │   ├── GroupList
            │   │   ├── FilterBar (ジャンル/用途/検索)
            │   │   └── GroupItem × N
            │   └── GroupEditor
            │       ├── Input (名前)
            │       ├── Select (ジャンル)
            │       ├── Select (用途)
            │       ├── Checkbox (デフォルト)
            │       ├── TagList (Badge × N)
            │       └── TagInput (autocomplete)
            ├── VibeModal (S5)
            │   ├── ImportButton
            │   ├── VibeList
            │   └── EncodeSection
            ├── StylePresetModal (S6)
            │   ├── PresetList
            │   └── PresetEditor
            └── DeleteConfirmDialog (S9)
```

### 5.2 コンポーネント分類

| カテゴリ | パス | 説明 |
|----------|------|------|
| Pages | `src/pages/` | ルートに対応するトップレベルコンポーネント |
| Header | `src/components/header/` | ヘッダー関連 |
| Left Panel | `src/components/left-panel/` | 左パネルセクション群 |
| Center Panel | `src/components/center-panel/` | 画像表示・アクション |
| Right Panel | `src/components/right-panel/` | 履歴パネル |
| Modals | `src/components/modals/` | S3〜S9 のモーダル/ダイアログ |
| Shared | `src/components/shared/` | 複数箇所で使う共有コンポーネント |
| UI | `src/components/ui/` | shadcn/ui コンポーネント（CLI 生成） |

### 5.3 主要コンポーネントの責務

| コンポーネント | 責務 | 使用 Store |
|---------------|------|-----------|
| `ProjectListPage` | プロジェクト一覧表示、CRUD 操作 | `useProjectStore` |
| `GenerationPage` | 3 パネルレイアウト構成、プロジェクトデータロード | `useProjectStore` |
| `Header` | 生成パラメータ表示・編集、Anlas・コスト表示 | `useSettingsStore`, `useGenerationStore` |
| `LeftPanel` | プロンプト編集 UI の構成 | `usePromptStore` |
| `MainPromptSection` | メインプロンプト入力・グループ適用 | `usePromptStore` |
| `CharacterSection` | キャラクタープロンプト入力・位置設定 | `usePromptStore` |
| `ArtistStyleSection` | アーティストタグ・プリセット選択 | `usePromptStore` |
| `VibeSection` | Vibe 選択・パラメータ調整 | `usePromptStore` |
| `CenterPanel` | 画像表示・生成/保存/削除アクション | `useGenerationStore`, `useHistoryStore` |
| `RightPanel` | 履歴サムネイル表示・フィルタ | `useHistoryStore` |
| `SettingsDialog` | API キー・デフォルトパラメータ設定 | `useSettingsStore` |
| `PromptGroupModal` | グループ CRUD + ジャンル管理 | `usePromptStore` |
| `VibeModal` | Vibe インポート・エンコード・削除 | `usePromptStore` |
| `StylePresetModal` | スタイルプリセット CRUD | `usePromptStore` |

---

## 6. 状態管理

### 6.1 Store 一覧

| Store | ファイル | 責務 | middleware |
|-------|----------|------|-----------|
| `useSettingsStore` | `stores/settings-store.ts` | API キー、デフォルトパラメータ、Anlas 残高 | — |
| `useProjectStore` | `stores/project-store.ts` | プロジェクト CRUD、現在のプロジェクト | — |
| `useGenerationStore` | `stores/generation-store.ts` | 生成状態、生成パラメータ、最新結果 | — |
| `usePromptStore` | `stores/prompt-store.ts` | プロンプト、キャラクター、グループ、ジャンル、Vibe、プリセット | — |
| `useHistoryStore` | `stores/history-store.ts` | 生成履歴、フィルタ、選択画像 | — |
| `useThemeStore` | `stores/theme-store.ts` | テーマ状態（dark/light） | `persist` |

### 6.2 Store 間の依存関係

```
useSettingsStore (独立)
  ← useGenerationStore (Anlas 残高チェック、デフォルトパラメータ参照)

useProjectStore (独立)
  ← useHistoryStore (プロジェクト ID でフィルタ)
  ← usePromptStore (プロジェクト切替時のリセット)

useGenerationStore
  → useHistoryStore (生成完了時に履歴追加)
  → useSettingsStore (Anlas 残高更新)

usePromptStore (独立)

useHistoryStore (独立)

useThemeStore (完全独立)
```

### 6.3 サーバー状態 vs クライアント状態

| 分類 | 状態 | 永続化先 |
|------|------|---------|
| サーバー状態 | プロジェクト一覧、生成履歴、グループ、ジャンル、Vibe、プリセット、設定 | SQLite (Tauri backend) |
| クライアント状態 | 生成パラメータ（セッション中）、プロンプトテキスト、キャラクター構成、Vibe 選択状態 | Zustand (メモリ) |
| 永続クライアント状態 | テーマ | localStorage (Zustand persist) |

全てのサーバー状態は Tauri IPC (`src/lib/ipc.ts`) 経由で読み書きする。

### 6.4 テーマ Store 詳細

**ファイル**: `src/stores/theme-store.ts`（新規作成）

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => {
        document.documentElement.classList.toggle("light", theme === "light");
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },
    }),
    {
      name: "theme-preference",
      onRehydrate: () => {
        return (rehydratedState) => {
          if (rehydratedState) {
            document.documentElement.classList.toggle(
              "light",
              rehydratedState.theme === "light"
            );
          }
        };
      },
    }
  )
);
```

- デフォルト: `"dark"`
- `localStorage` キー: `"theme-preference"`
- `onRehydrate` でページロード時に即座にクラスを適用（FOUC 防止）

---

## 7. レイアウトシステム

### 7.1 S2 生成画面レイアウト

```
+------------------------------------------------------------------+
|  header     h-12  shrink-0  border-b                              |
+----------+----------------------------+-------------------------+
|  aside    |  main                      |  aside                  |
|  w-80     |  flex-1                    |  w-64                   |
|  shrink-0 |  overflow-hidden           |  shrink-0               |
|  overflow-y-auto  border-r             |  overflow-y-auto        |
|           |                            |  border-l               |
+----------+----------------------------+-------------------------+
```

**ファイル**: `src/pages/GenerationPage.tsx`

```tsx
function GenerationPage() {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 border-r border-border overflow-y-auto">
          <LeftPanel />
        </aside>
        <main className="flex-1 overflow-hidden">
          <CenterPanel />
        </main>
        <aside className="w-64 shrink-0 border-l border-border overflow-y-auto">
          <RightPanel />
        </aside>
      </div>
    </div>
  );
}
```

設計ポイント:
- `shrink-0`: サイドパネルの幅が flex で縮小されないようにする
- `overflow-hidden` (外側 flex): 子要素のスクロールを独立させる
- `overflow-y-auto` (サイドパネル): 各パネルが独立スクロール
- `flex-1` (中央): 残りスペースを全て占有

### 7.2 S1 プロジェクト一覧レイアウト

```tsx
function ProjectListPage() {
  return (
    <div className="flex h-screen flex-col">
      <ProjectListHeader />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          {projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- `max-w-4xl` で中央寄せ
- レスポンシブグリッド: 1〜3 カラム（ウィンドウ幅に応じて）

### 7.3 ヘッダーレイアウト

```tsx
<header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
  {/* 左グループ: 戻る + プロジェクト名 + Anlas */}
  <div className="flex items-center gap-2">
    <BackButton />
    <span className="text-sm font-medium truncate max-w-[160px]">{projectName}</span>
    <Separator orientation="vertical" className="h-5" />
    <AnlasDisplay />
    <Separator orientation="vertical" className="h-5" />
    <CostDisplay />
  </div>

  <div className="flex-1" /> {/* スペーサー */}

  {/* 右グループ: パラメータ + 設定 + テーマ */}
  <div className="flex items-center gap-2">
    <GenerationParams />
    <Separator orientation="vertical" className="h-5" />
    <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
      <Settings size={16} />
    </Button>
    <ThemeToggle />
  </div>
</header>
```

- `Separator orientation="vertical"` でグループを視覚的に区切る
- パラメータコントロールはコンパクト（`h-8`, `text-xs`）

---

## 8. データフロー

### 8.1 画像生成フロー

```
ユーザー操作
  │
  ├── プロンプト入力 → usePromptStore.setMainPrompt()
  ├── パラメータ変更 → useGenerationStore.setParams()
  │     └── debounce 300ms → useCostEstimate hook → CostDisplay 更新
  │
  └── Generate ボタン押下
        │
        v
      ActionBar.handleGenerate()
        │
        ├── パラメータ収集（artistTags, vibes, prompt 等）
        ├── useGenerationStore.generate(request)
        │     ├── isGenerating = true
        │     ├── ipc.generateImage(request)
        │     │     └── Tauri backend → NovelAI API
        │     ├── 成功: lastResult = response
        │     └── 失敗: error = message
        │           └── toast.error(message)
        │
        └── 生成成功後（並列実行）
              ├── useHistoryStore.loadImages(projectId)
              └── useSettingsStore.refreshAnlas()
```

### 8.2 プロジェクト操作フロー

```
S1: プロジェクト一覧
  │
  ├── 開く → ipc.openProject(id)
  │     ├── backend: cleanupUnsavedImages()
  │     ├── useProjectStore.setCurrentProject()
  │     ├── useHistoryStore.loadImages(projectId)
  │     └── navigate(`/project/${id}`)
  │
  ├── 作成 → ipc.createProject(req)
  │     ├── useProjectStore.addProject(project)
  │     └── navigate(`/project/${id}`)
  │
  └── 削除 → 確認ダイアログ → ipc.deleteProject(id)
        └── useProjectStore.removeProject(id)
```

---

## 9. フォントインポート

**ファイル**: `src/main.tsx`

```tsx
// フォントインポート（CSS import の前に配置）
import "@fontsource-variable/inter";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource-variable/jetbrains-mono";

import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## 10. ファイル構成（実装後の完成形）

```
src/
├── main.tsx                              # エントリポイント + フォントインポート
├── App.tsx                               # MemoryRouter + Routes + Toaster
├── index.css                             # Tailwind + デザイントークン
│
├── types/
│   └── index.ts                          # DTO・リクエスト型定義（既存）
│
├── lib/
│   ├── ipc.ts                            # Tauri IPC ラッパー（既存）
│   ├── cost.ts                           # コスト計算（既存）
│   ├── constants.ts                      # 定数（既存）
│   └── utils.ts                          # cn() ユーティリティ（新規）
│
├── stores/
│   ├── settings-store.ts                 # 設定・API キー・Anlas（既存、拡充）
│   ├── project-store.ts                  # プロジェクト管理（既存）
│   ├── generation-store.ts               # 生成状態（既存、拡充）
│   ├── prompt-store.ts                   # プロンプト・キャラクター・グループ等（既存 stub、要実装）
│   ├── history-store.ts                  # 履歴管理（既存 stub、要実装）
│   └── theme-store.ts                    # テーマ切替（新規）
│
├── hooks/
│   ├── use-debounce.ts                   # デバウンス（既存）
│   ├── use-autocomplete.ts               # オートコンプリート（既存）
│   └── use-cost-estimate.ts              # コスト計算フック（既存）
│
├── components/
│   ├── ui/                               # shadcn/ui コンポーネント（CLI 生成、~20 ファイル）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── separator.tsx
│   │   ├── card.tsx
│   │   ├── scroll-area.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── popover.tsx
│   │   ├── tooltip.tsx
│   │   ├── select.tsx
│   │   ├── slider.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── switch.tsx
│   │   ├── toggle.tsx
│   │   ├── toggle-group.tsx
│   │   ├── command.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── skeleton.tsx
│   │   └── sonner.tsx
│   │
│   ├── header/
│   │   ├── Header.tsx                    # ヘッダー全体
│   │   ├── AnlasDisplay.tsx              # Anlas 残高 + ティア表示
│   │   ├── CostDisplay.tsx               # コスト予測表示
│   │   ├── GenerationParams.tsx          # パラメータコントロール群
│   │   └── ThemeToggle.tsx               # テーマ切替ボタン
│   │
│   ├── left-panel/
│   │   ├── LeftPanel.tsx                 # 左パネル全体（ScrollArea）
│   │   ├── MainPromptSection.tsx         # メインプロンプト
│   │   ├── CharacterAddButtons.tsx       # キャラクター追加ボタン群
│   │   ├── CharacterSection.tsx          # キャラクターセクション（1 人分）
│   │   ├── PositionSliders.tsx           # Position X/Y スライダー
│   │   ├── PromptGroupPicker.tsx         # グループ選択 Popover
│   │   ├── ArtistStyleSection.tsx        # アーティスト/スタイルセクション
│   │   └── VibeSection.tsx               # Vibe セクション
│   │
│   ├── center-panel/
│   │   ├── CenterPanel.tsx               # 中央パネル全体
│   │   ├── ImageDisplay.tsx              # 画像表示（loading/empty/image）
│   │   ├── ActionBar.tsx                 # Generate/Save/Delete ボタン群
│   │   └── ImageDetailOverlay.tsx        # S7 画像詳細オーバーレイ
│   │
│   ├── right-panel/
│   │   ├── RightPanel.tsx                # 右パネル全体（ScrollArea）
│   │   ├── HistoryHeader.tsx             # "History" + フィルタ
│   │   └── ThumbnailGrid.tsx             # サムネイルグリッド
│   │
│   ├── modals/
│   │   ├── SettingsDialog.tsx            # S3 設定
│   │   ├── PromptGroupModal.tsx          # S4 グループ管理
│   │   ├── VibeModal.tsx                 # S5 Vibe 管理
│   │   ├── StylePresetModal.tsx          # S6 スタイルプリセット管理
│   │   ├── CreateProjectDialog.tsx       # S8 プロジェクト作成
│   │   └── DeleteConfirmDialog.tsx       # S9 削除確認
│   │
│   └── shared/
│       ├── EmptyState.tsx                # 空状態コンポーネント
│       ├── PromptTextarea.tsx            # オートコンプリート付きテキストエリア
│       └── TagList.tsx                   # タグリスト（Badge 群）
│
└── pages/
    ├── ProjectListPage.tsx               # S1
    └── GenerationPage.tsx                # S2
```

---

## 11. 実装優先順

| フェーズ | 対象 | 依存 |
|----------|------|------|
| 1 | 基盤セットアップ: パッケージインストール、index.css、utils.ts、components.json、shadcn コンポーネント追加、theme-store、App.tsx (Router) | — |
| 2 | S1 プロジェクト一覧: ProjectListPage、ProjectCard、EmptyState、CreateProjectDialog、DeleteConfirmDialog | フェーズ 1 |
| 3 | S2 フレーム: GenerationPage (3パネルレイアウト)、Header (パラメータ表示のみ) | フェーズ 1 |
| 4 | S2 左パネル: MainPromptSection、CharacterSection、PromptTextarea (autocomplete) | フェーズ 3 |
| 5 | S2 中央パネル: ImageDisplay、ActionBar、LoadingOverlay | フェーズ 3 |
| 6 | S2 右パネル: ThumbnailGrid、HistoryHeader | フェーズ 3 |
| 7 | モーダル群: SettingsDialog (S3)、PromptGroupModal (S4)、VibeModal (S5)、StylePresetModal (S6) | フェーズ 4 |
| 8 | S7 画像詳細オーバーレイ | フェーズ 6 |
| 9 | Vibe・スタイルプリセット: VibeSection、ArtistStyleSection | フェーズ 7 |
