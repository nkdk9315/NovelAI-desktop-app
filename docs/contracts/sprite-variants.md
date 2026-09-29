# 差分制作（スプライト差分）コントラクト

ゲーム立ち絵の差分（ポーズ × 服の破損 × 傷 × 表情 …）を NovelAI で作り、管理し、各ゲームエンジン向けに書き出す機能。
通常生成・漫画モードとは別のページ（`/sprite/:id`）で動く。左パネルは通常ページのものをそのまま使う。

実 API での検証結果は「§9 検証結果」を参照。設計はすべてこの結果を前提にしている。

---

## 1. 用語

| 用語 | 意味 |
|---|---|
| 差分セット (sprite set) | 1 キャラクター分の差分定義と生成結果。1 プロジェクトに複数持てる |
| ポーズ (pose) | 構図ごと作り直す軸。各ポーズの「素体」は txt2img で生成する |
| 軸 (axis) | 素体からインペイントで派生させる変化の種類（服の破損・傷・疲労・恐怖…） |
| 段階 (level) | 軸の値。先頭の段階が「変化なし」 |
| 衣装パーツ (outfit part) | 衣装を構成する部品。下着など「覆われていて見えない」部品を持てる |
| 破損段階 (damage stage) | 衣装軸の段階。パーツごとの状態（無傷 / 破れ / 露出 / 消失）を持つ |
| 領域 (region) | ポーズごとに描く名前付きマスク（服・顔・腕…）。軸は領域に紐づく |
| セル (cell) | ポーズと各軸の段階の組み合わせ 1 つ。候補画像を複数持ち、1 枚を採用する |
| 候補 (candidate) | セルのために作った画像。生成・インペイント・合成・取り込み・後処理のどれか |

---

## 2. データモデル

### 2.1 SQLite（migration 029）

定義（ポーズ・衣装・軸・領域・マスク）は一緒に編集される文書なので JSON 1 列に入れる。
セルと候補は画像と個別に結びつき、1 件ずつ変わるのでテーブルにする。

```sql
CREATE TABLE sprite_sets (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  spec        TEXT NOT NULL,              -- SpriteSpec JSON
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE sprite_cells (
  set_id            TEXT NOT NULL REFERENCES sprite_sets(id) ON DELETE CASCADE,
  cell_key          TEXT NOT NULL,
  adopted_image_id  TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
  excluded          INTEGER NOT NULL DEFAULT 0,
  note              TEXT NOT NULL DEFAULT '',
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (set_id, cell_key)
);
CREATE TABLE sprite_candidates (
  id               TEXT PRIMARY KEY,
  set_id           TEXT NOT NULL REFERENCES sprite_sets(id) ON DELETE CASCADE,
  cell_key         TEXT NOT NULL,
  image_id         TEXT NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
  parent_image_id  TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
  method           TEXT NOT NULL,   -- txt2img | inpaint | composite | import | edit
  created_at       TEXT NOT NULL
);
CREATE INDEX idx_sprite_candidates_cell ON sprite_candidates(set_id, cell_key);
```

- 候補の画像は `generated_images` に通常どおり保存する（履歴にも出る）。採用した画像は `is_saved = 1` にする。
- `projects.project_type` に `"sprite"` を追加する。

### 2.2 SpriteSpec（`src/lib/sprite/spec.ts`）

```ts
interface SpriteSpec {
  version: 1;
  characterKey: string;          // 書き出し名の {char}
  width: number; height: number; // セット内の全画像で共通（位置合わせのため）
  seed: number | null;           // null = ランダム
  candidatesPerCell: number;     // 1 回の生成で作る候補数（既定 2）
  inpaintStrength: number;       // 既定 1.0
  poses: SpritePose[];
  outfit: { parts: OutfitPart[]; stages: DamageStage[] };
  axes: SpriteAxis[];            // 派生の順番どおり。衣装軸（kind: "outfit"）は 0〜1 個
  regions: SpriteRegion[];
  masks: Record<string /*poseId*/, Record<string /*regionId*/, string /*1/8 セルの白黒 PNG base64*/>>;
  export: SpriteExportSettings;
}
interface SpritePose   { id; key; label; prompt; negative }
interface SpriteRegion { id; key; label; color }
interface OutfitPart   { id; name; prompt; negative; coveredBy: string[] }  // coveredBy が空でなければ「下に着ている物」
type PartState = "intact" | "torn" | "exposed" | "gone";
interface DamageStage  { id; key; label; prompt; states: Record<partId, PartState>; overrides: Record<partId, string> }
interface SpriteAxis   { id; key; label; kind: "outfit" | "prompt"; regionIds: string[];
                         chain: boolean;      // true: 段階 n は段階 n-1 から派生。false: 段階 0 から直接
                         composite: boolean;  // true: 他の軸と組み合わせたセルを画素合成で作れる
                         levels: AxisLevel[] } // kind="outfit" のときは outfit.stages から導出（空）
interface AxisLevel    { id; key; label; prompt; negative; weight: number } // weight≠1 で `w::prompt::`
```

### 2.3 セルキー（`src/lib/sprite/cells.ts`）

`poseId` に、段階 0 以外の軸だけを `|axisId=levelId` の形で軸 ID 順に連結する。

- 例: `p1|ax_damage=st2|ax_fear=lv1`。素体は `p1`。
- 軸や段階を後から足しても、既存セルのキーは変わらない（新しい軸は段階 0 とみなす）。
- 段階や軸を消すと、そのキーのセルは「孤立セル」になる。孤立セルは一覧で見せ、まとめて削除できる。

---

## 3. プロンプトの組み立て（`src/lib/sprite/prompt.ts`）

セルのプロンプト = 左パネルのメインプロンプト（キャラの外見。全セル共通）+ 次の断片。
断片は `RequestOverrides.mainSuffix` で、`Text:` ブロックより前・クオリティタグより前に入る。

1. ポーズの `prompt`
2. 衣装: `outfitPromptAt(stage)`
3. 各プロンプト軸の段階の `prompt`（`weight ≠ 1` なら `w::prompt::`）

`outfitPromptAt(stage)` は次の順に組み立てる。

- まず `stage.prompt`（例: `torn clothes`）を入れる。
- 次にパーツを順に処理する。状態は `states[part] ?? "intact"`、テキストは `overrides[part]` があればそれを使い、なければ状態で決める。

| 状態 | 既定のテキスト |
|---|---|
| intact | `prompt` |
| torn | `torn {prompt}` |
| exposed | `heavily torn {prompt}` |
| gone | なし |

- `coveredBy` を持つパーツ（下着など）は、覆っているパーツのどれかが `exposed` か `gone` になるまで入れない。
  - 覆っているパーツが**全部** `gone` なら、そのままのテキストを入れる。
  - 一部だけなら `{text} visible through tears` を付ける。
- ネガティブ = ポーズ・パーツ・段階の `negative` を連結したもの（左パネルのネガティブに足す）。

---

## 4. 派生計画（`src/lib/sprite/plan.ts`）

`planCell(spec, key, cells) → CellPlan | Blocker`

| セル | 方法 | 親 | マスク |
|---|---|---|---|
| 素体（全軸が段階 0） | txt2img（`seed + i`） | なし | — |
| 軸が 1 つだけ非 0 | inpaint | 親キー（下記） | その軸の領域の和 |
| 非 0 の軸が複数 | 合成（下の条件をすべて満たすとき）か inpaint | 親キー（下記） | 変える軸の領域 |

親キーの決め方:

- 軸の順番で最後の非 0 軸を 1 段下げる（`chain`）か、0 に戻す（`!chain`）。
- 例: `damage=2, fear=1` の親は `damage=2`。`damage=2`（chain）の親は `damage=1`。

合成の条件:

- 最後の非 0 軸が `composite` である。
- 親セルと「素体 + その軸だけ」のセルの両方に採用画像がある。
- その軸の領域が、他の非 0 軸の領域と重ならない。

合成では、その軸の領域から他の非 0 軸の領域を引いたマスクで、「素体 + その軸だけ」の画像を親画像に重ねる。
採用候補を「合成ではなくインペイントで作り直す」こともできる（`preferInpaint`）。

Blocker（生成できない理由）:

- `parentNotAdopted`: 親に採用画像がない
- `maskMissing`: 領域のマスクが未作成
- `noRegion`: 軸に領域が紐づいていない
- `excluded`: 除外したセル
- `orphan`: 孤立セル

---

## 5. Tauri コマンド（`commands/sprites.rs`）

| コマンド | 引数 → 戻り値 |
|---|---|
| `list_sprite_sets` | `projectId` → `SpriteSetDto[]` |
| `create_sprite_set` | `CreateSpriteSetRequest { projectId, name, spec }` → `SpriteSetDto` |
| `update_sprite_set` | `UpdateSpriteSetRequest { id, name?, spec? }` → `SpriteSetDto` |
| `delete_sprite_set` | `id` → `()`（候補画像は残す） |
| `duplicate_sprite_set` | `id, name` → `SpriteSetDto`（定義だけ複製） |
| `list_sprite_cells` | `setId` → `SpriteCellDto[]`（候補付き） |
| `add_sprite_candidate` | `AddSpriteCandidateRequest { setId, cellKey, imageId, parentImageId?, method }` → `SpriteCandidateDto` |
| `import_sprite_candidate` | `ImportSpriteCandidateRequest { setId, cellKey, path }` → `SpriteCandidateDto`（ファイルをプロジェクトに取り込む） |
| `save_sprite_image` | `SaveSpriteImageRequest { setId, cellKey, imageBase64, parentImageId?, method, sourceImageIds }` → `SpriteCandidateDto`（合成・手直し結果の保存） |
| `adopt_sprite_candidate` | `setId, cellKey, imageId?` → `()`（null で採用解除。採用画像は保存扱い） |
| `remove_sprite_candidate` | `id, deleteImage` → `()` |
| `set_sprite_cell_state` | `setId, cellKey, excluded?, note?` → `()` |
| `delete_sprite_cells` | `setId, cellKeys` → `()`（孤立セルの掃除。候補も消す） |
| `export_sprite_set` | `SpriteExportPlan` → `SpriteExportResultDto` |

DTO（camelCase）:

```ts
interface SpriteSetDto { id; projectId; name; spec: SpriteSpec; sortOrder; createdAt; updatedAt }
interface SpriteCandidateDto { id; cellKey; imageId; parentImageId: string | null; method; createdAt; filePath; seed }
interface SpriteCellDto { cellKey; adoptedImageId: string | null; excluded: boolean; note: string; candidates: SpriteCandidateDto[] }
```

---

## 6. 生成（`src/lib/sprite/run.ts`・`src/stores/sprite-queue-store.ts`）

- 1 セルの生成は次の手順で行う。
  1. `planCell` で方法を決める。
  2. txt2img / inpaint なら、`buildGenerateRequest(projectId, overrides)` を `candidatesPerCell` 回呼ぶ。
     - `overrides = { mainSuffix, negativeSuffix, seed, width, height, action, snapshotExtra: { sprite: { setId, cellKey } } }`
     - 呼ぶたびに `generate_image` → `add_sprite_candidate` を行う。
  3. 合成なら、フロントの canvas で合成して `save_sprite_image` で保存する。
- インペイントのマスクは、領域のセル（1/8 の白黒 PNG）の和をとって作る。等倍化は API クライアントが行う（§9）。
- **一括生成キュー**:
  - 選んだセルを親 → 子の順に並べる。
  - 「親を自動採用」をオンにすると、親の 1 枚目の候補を採用してから子へ進む。
  - 途中で停止できる。失敗したセルは記録して次へ進む。
  - 生成の前に `estimate_cost` の合計を表示する。1 Anlas でもかかるなら確認を出す。
- **後処理**: 採用画像にまとめて背景除去（bg-removal）やアップスケールをかける。
  - 結果は `method: "edit"` の候補として保存する。オプションで採用する。
  - bg-removal は Opus でも有料なので、費用を確認してから実行する。

---

## 7. 書き出し（`src/lib/sprite/export/*`・`services/sprite_export.rs`）

フロントの変換器（エンジン別）が `SpriteExportPlan` を作り、Rust がファイルを書く。

```ts
interface SpriteExportPlan {
  setId; outDir;
  images: { imageId; relPath; scale: number;
            layer?: { baseImageId; maskBase64 /*1/8 セル*/ } }[];  // layer 指定時は差分だけ残した透過 PNG
  texts:  { relPath; content }[];
  atlas?: { name; maxSize; padding; relDir; entries: { imageId; frame: string }[]; scale };
}
interface SpriteExportResultDto { outDir; files: string[] }
```

- `relPath` は `..`・絶対パス・空の区間を拒否する（`AppError::Validation`）。
- 差分レイヤーは、マスク（1 セル膨張）の中で素体と 12 以上違う画素だけを残し、それ以外を透明にする。
- アトラスは棚詰め（shelf packing）で作る。1 枚に収まらなければ複数ページに分け、TexturePacker の JSON Hash 形式で出す。

| 書き出し先 | 出力 |
|---|---|
| 汎用 | `sprites/*.png` + `manifest.json` + `manifest.csv` |
| RPGツクール MZ / MV | `img/pictures/*.png` + `js/plugins/NaiSprite_{char}.js`（変数から立ち絵を切り替えるプラグインコマンド） |
| ウディタ | `Data/Picture/{char}/*.png` + `{char}_sprites.csv`（DB 取り込み用） |
| ティラノスクリプト | `data/fgimage/chara/{char}/*.png` + `data/scenario/{char}_sprites.ks`（`chara_new` / `chara_face`、レイヤー時は `chara_layer`） |
| 吉里吉里Z (KAG) | `fgimage/*.png` + `scenario/{char}_sprites.ks`（表示マクロ） |
| Ren'Py | `game/images/{char}/*.png` + `game/{char}_sprites.rpy`（`image` 定義、レイヤー時は `layeredimage`） |
| Unity | `Assets/NaiSprites/{char}/*.png` + `{char}.json` + `NaiSpriteLibrary.cs` |
| Godot | `sprites/{char}/*.png` + `{char}_sprites.gd`（辞書と取得関数） |
| Unreal | `Sprites/{char}/*.png` + `DT_{char}.csv`（DataTable） |
| Web（Phaser / PixiJS） | `atlas/{char}-N.png` + `{char}-N.json`（JSON Hash）+ `manifest.json` |

ファイル名はテンプレートで決める。

- 既定: `{char}_{pose}_{axisKey…}`
- 使えるトークン: `{char}` `{pose}` `{<軸 key>}` `{index}`
- 同じ名前になった場合は、末尾に `_2` などを付けて区別する。

---

## 8. 画面（`src/pages/SpritePage.tsx`・`src/components/sprite/*`）

- **ヘッダー / 左パネル**: 通常ページと同じ。左パネルの上にヒントを出す（「メインプロンプトはキャラの外見。全差分に入る」）。
- **中央**: タブで切り替える。
  - **マトリクス**:
    - 行はポーズ、列は選んだ 1 軸の段階。その他の軸は段階を選ぶチップで絞り込む。
    - セルには採用画像か状態（未生成 / 生成待ち / 候補あり / 採用済み / 除外 / 生成できない理由）を表示する。
    - 複数選択して一括生成できる。
  - **定義**: ポーズ・衣装（パーツ表 × 破損段階）・軸・領域・セット設定（サイズ・シード・候補数）。
  - **書き出し**: 書き出し先・名前テンプレート・倍率・差分レイヤー・アトラス。対象の一覧をプレビューしてから書き出す。
- **右**: セル詳細。
  - 送られるプロンプト
  - 親と派生方法
  - 候補（採用 / 削除 / 拡大）
  - 生成 / 取り込み / マスク手直し再生成
  - メモ・除外
- **領域マスクエディタ**（ダイアログ）:
  - ポーズの素体（採用画像）の上に、領域を色分けして 8px セル単位で描く。
  - 道具はブラシ（サイズ可変）・消しゴム・矩形・全消去・他領域から複製。
- **テンプレート**:
  - 組み込み: RPG 戦闘立ち絵 / ノベル立ち絵（表情）/ 表情差分のみ
  - ユーザー登録: `settings.sprite_templates`

---

## 9. 検証結果（2026-09-29、nai-diffusion-5-full、0 Anlas）

- マスクは**等倍・白黒・8px 格子**で送らないと、V5 はマスク境界に灰色の枠を描く（1/8 サイズや半端な境界でも出る）。novelai-api の `resize_mask_image` で対応済み（nkdk9315/NovelAI-api-client#35）。
- 服の破損 0→3 は、1 段ずつ（chain）でも段階 0 から直接でも作れる。
- 下着のプロンプトを段階 0・1 では入れず、2（`visible through tears`）と 3（`underwear only`）で入れる方式で、色と種類はシード・ポーズを変えても保たれる（柄は揺れる）。
- 顔だけのインペイントで表情（疲労・恐怖）を変えられる。`1.6::…::` で強くなる。
- マスク外も完全には保たれない。境界から 8px 以内で約 7%、離れた所で約 1% の画素が少し変わる。そのため合成・差分レイヤーは領域マスクで切り取る。
- 顔差分と体差分の画素合成は、領域が重ならなければ使える。重なると継ぎ目が出るので、他の軸の領域を引いてから合成する。
- ポーズ違いをプロンプトだけで作ると、顔と衣装の大枠は保たれるが細部（上着の丈・紋章・ベルト）が揺れる。V5 はキャラ参照・Vibe が使えないため、衣装パーツ表で細部まで言葉にしておく。
