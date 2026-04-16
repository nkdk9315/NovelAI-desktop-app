-- Prompt group folders: user-defined hierarchical organization for prompt groups.
-- Mirrors 017_vibe_folders.sql. A prompt_group with folder_id IS NULL is
-- treated as "unclassified" by the UI. Unlike vibes (SET NULL on folder
-- delete), deleting a prompt-group folder cascades into its groups — the UI
-- surfaces this with a "delete folder + contents" confirmation dialog.

CREATE TABLE prompt_group_folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    parent_id  INTEGER REFERENCES prompt_group_folders(id) ON DELETE CASCADE,
    sort_key   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX idx_prompt_group_folders_parent ON prompt_group_folders(parent_id);

ALTER TABLE prompt_groups ADD COLUMN folder_id INTEGER
    REFERENCES prompt_group_folders(id) ON DELETE CASCADE;
CREATE INDEX idx_prompt_groups_folder ON prompt_groups(folder_id);
