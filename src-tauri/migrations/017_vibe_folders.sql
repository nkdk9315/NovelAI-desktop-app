-- Vibe folders: user-defined hierarchical organization for vibes.
-- Each vibe belongs to at most one folder (NULL = unclassified).
-- Sub-folders cascade on parent delete; vibes fall back to NULL (unclassified)
-- when their containing folder is removed.

CREATE TABLE vibe_folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    parent_id  INTEGER REFERENCES vibe_folders(id) ON DELETE CASCADE,
    sort_key   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX idx_vibe_folders_parent ON vibe_folders(parent_id);

ALTER TABLE vibes ADD COLUMN folder_id INTEGER
    REFERENCES vibe_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_vibes_folder ON vibes(folder_id);
