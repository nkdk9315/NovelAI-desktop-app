-- Genre: アイコン・色追加
ALTER TABLE genres ADD COLUMN icon TEXT NOT NULL DEFAULT 'user';
ALTER TABLE genres ADD COLUMN color TEXT NOT NULL DEFAULT '#888888';
UPDATE genres SET icon = 'user-round', color = '#3b82f6' WHERE id = 'genre-male';
UPDATE genres SET icon = 'user-round', color = '#ef4444' WHERE id = 'genre-female';
UPDATE genres SET icon = 'circle-help', color = '#888888' WHERE id = 'genre-other';

-- PromptGroup: サムネイル、is_default、category 追加
ALTER TABLE prompt_groups ADD COLUMN thumbnail_path TEXT;
ALTER TABLE prompt_groups ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_groups ADD COLUMN category INTEGER;
UPDATE prompt_groups SET is_default = is_default_for_genre;

-- PromptGroupTag: デフォルト強度、サムネイル追加
ALTER TABLE prompt_group_tags ADD COLUMN default_strength INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_group_tags ADD COLUMN thumbnail_path TEXT;
