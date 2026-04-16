-- Style preset folders: mirror of vibe_folders for style presets.

CREATE TABLE style_preset_folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    parent_id  INTEGER REFERENCES style_preset_folders(id) ON DELETE CASCADE,
    sort_key   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX idx_style_preset_folders_parent ON style_preset_folders(parent_id);

ALTER TABLE style_presets ADD COLUMN folder_id INTEGER
    REFERENCES style_preset_folders(id) ON DELETE SET NULL;
CREATE INDEX idx_style_presets_folder ON style_presets(folder_id);
