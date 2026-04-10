-- Vibe にサムネイル列を追加
ALTER TABLE vibes ADD COLUMN thumbnail_path TEXT;

-- プロジェクト × Vibe 紐付けテーブル
CREATE TABLE IF NOT EXISTS project_vibes (
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    vibe_id     TEXT NOT NULL REFERENCES vibes(id) ON DELETE CASCADE,
    is_visible  INTEGER NOT NULL DEFAULT 1,
    added_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (project_id, vibe_id)
);

CREATE INDEX IF NOT EXISTS idx_project_vibes_project
    ON project_vibes(project_id);
