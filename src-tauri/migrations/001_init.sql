-- ジャンル
CREATE TABLE IF NOT EXISTS genres (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    is_system   INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO genres (id, name, is_system, sort_order) VALUES
    ('genre-male',   '男',    1, 0),
    ('genre-female', '女',    1, 1),
    ('genre-other',  'その他', 1, 2);

-- プロンプトグループ
CREATE TABLE IF NOT EXISTS prompt_groups (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    genre_id              TEXT REFERENCES genres(id) ON DELETE SET NULL,
    is_default_for_genre  INTEGER NOT NULL DEFAULT 0,
    is_system             INTEGER NOT NULL DEFAULT 0,
    usage_type            TEXT NOT NULL DEFAULT 'both',
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- プロンプトグループタグ
CREATE TABLE IF NOT EXISTS prompt_group_tags (
    id              TEXT PRIMARY KEY,
    prompt_group_id TEXT NOT NULL REFERENCES prompt_groups(id) ON DELETE CASCADE,
    tag             TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_prompt_group_tags_group
    ON prompt_group_tags(prompt_group_id);

-- プロジェクト
CREATE TABLE IF NOT EXISTS projects (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    project_type    TEXT NOT NULL DEFAULT 'simple',
    directory_path  TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 生成画像
CREATE TABLE IF NOT EXISTS generated_images (
    id              TEXT PRIMARY KEY,
    project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    seed            INTEGER NOT NULL,
    prompt_snapshot TEXT NOT NULL,
    width           INTEGER NOT NULL,
    height          INTEGER NOT NULL,
    model           TEXT NOT NULL,
    is_saved        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_generated_images_project
    ON generated_images(project_id);

-- Vibe
CREATE TABLE IF NOT EXISTS vibes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    model       TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- スタイルプリセット
CREATE TABLE IF NOT EXISTS style_presets (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    artist_tags TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- スタイルプリセット × Vibe
CREATE TABLE IF NOT EXISTS style_preset_vibes (
    style_preset_id TEXT NOT NULL REFERENCES style_presets(id) ON DELETE CASCADE,
    vibe_id         TEXT NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
    PRIMARY KEY (style_preset_id, vibe_id)
);

-- 設定
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
