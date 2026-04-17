-- Prompt presets: multi-character interaction templates

CREATE TABLE preset_folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    parent_id  INTEGER REFERENCES preset_folders(id) ON DELETE CASCADE,
    sort_key   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_preset_folders_parent ON preset_folders(parent_id);

CREATE TABLE prompt_presets (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    folder_id  INTEGER REFERENCES preset_folders(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_prompt_presets_folder ON prompt_presets(folder_id);

CREATE TABLE preset_character_slots (
    id               TEXT PRIMARY KEY,
    preset_id        TEXT NOT NULL REFERENCES prompt_presets(id) ON DELETE CASCADE,
    slot_index       INTEGER NOT NULL,
    slot_label       TEXT NOT NULL DEFAULT '',
    genre_id         TEXT REFERENCES genres(id) ON DELETE SET NULL,
    positive_prompt  TEXT NOT NULL DEFAULT '',
    negative_prompt  TEXT NOT NULL DEFAULT '',
    role             TEXT NOT NULL DEFAULT 'none'
);
CREATE INDEX idx_preset_slots_preset ON preset_character_slots(preset_id);
