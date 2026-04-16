-- プロンプトエントリに名前フィールド追加（表示用ラベル）
ALTER TABLE prompt_group_tags ADD COLUMN name TEXT NOT NULL DEFAULT '';
-- default_strength を REAL に変更（小数点対応）は ALTER TABLE では不可のため、既存データはそのまま
