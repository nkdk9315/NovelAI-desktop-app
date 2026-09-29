# 実行計画: 差分制作（F13）

コントラクト: [docs/contracts/sprite-variants.md](../contracts/sprite-variants.md)
前提: インペイントのマスク修正（PR #39、nkdk9315/NovelAI-api-client#35）

## P1 — 最小構成

| タスク | 内容 | 状態 |
|---|---|---|
| P1-1 | migration 029、`sprite_set` / `sprite_cell` repository・service・command、`project_type = "sprite"` | 未着手 |
| P1-2 | `lib/sprite/{spec,cells,prompt,plan}.ts` とテスト | 未着手 |
| P1-3 | `/sprite/:id` ページ、プロジェクト種別「差分」、セット切り替え | 未着手 |
| P1-4 | 定義エディタ（ポーズ・衣装パーツと破損段階・軸・領域・セット設定） | 未着手 |
| P1-5 | 領域マスクエディタ | 未着手 |
| P1-6 | マトリクス・セル詳細・1 セル生成（txt2img / inpaint）・候補の採用 | 未着手 |
| P1-7 | 書き出し（汎用: PNG + manifest.json / csv、名前テンプレート） | 未着手 |

## P2 — まとめて作る

| タスク | 内容 | 状態 |
|---|---|---|
| P2-1 | 一括生成キュー（親→子の順、親の自動採用、停止、費用見積もり） | 未着手 |
| P2-2 | テンプレート（組み込み 3 種 + ユーザー登録） | 未着手 |
| P2-3 | 画像の取り込み・マスク手直し再生成・孤立セル掃除・セット複製 | 未着手 |
| P2-4 | 一括後処理（背景除去・アップスケール） | 未着手 |
| P2-5 | エンジン別の書き出し（ツクール MZ/MV・ウディタ・ティラノ・吉里吉里・Ren'Py・Unity・Godot・Unreal） | 未着手 |

## P3 — 仕上げ

| タスク | 内容 | 状態 |
|---|---|---|
| P3-1 | 顔 × 体の画素合成（composite 軸） | 未着手 |
| P3-2 | 差分レイヤー書き出し（ティラノ `chara_layer`・Ren'Py `layeredimage`・汎用） | 未着手 |
| P3-3 | Web 向けテクスチャアトラス（JSON Hash、複数ページ） | 未着手 |
| P3-4 | ユーザー目線の見直しと改善 | 未着手 |
