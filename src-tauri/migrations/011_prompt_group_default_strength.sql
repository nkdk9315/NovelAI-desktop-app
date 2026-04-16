-- グループ単位のデフォルト強度を追加
ALTER TABLE prompt_groups ADD COLUMN default_strength INTEGER NOT NULL DEFAULT 0;
