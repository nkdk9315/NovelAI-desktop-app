-- Sidebar preset group instances: a "placement" of a preset folder (group)
-- into the sidebar with a source/target character pairing. Each instance can
-- have multiple presets toggled on; toggling a preset applies its source-slot
-- tags to source_character_id and target-slot tags to target_character_id.
--
-- folder_id references preset_folders (INTEGER PK, see migration 022).
-- character IDs are UUID strings stored in the frontend character list; they
-- are not FK-enforced because characters are project-scoped in a JSON-ish
-- generation-params blob rather than a dedicated table.

CREATE TABLE sidebar_preset_group_instances (
    id                   TEXT PRIMARY KEY,
    project_id           TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    folder_id            INTEGER NOT NULL REFERENCES preset_folders(id) ON DELETE CASCADE,
    source_character_id  TEXT NOT NULL,
    target_character_id  TEXT NOT NULL,
    position             INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sidebar_preset_group_instances_project
    ON sidebar_preset_group_instances(project_id);
CREATE INDEX idx_sidebar_preset_group_instances_folder
    ON sidebar_preset_group_instances(folder_id);

CREATE TABLE sidebar_preset_group_active_presets (
    instance_id TEXT NOT NULL
        REFERENCES sidebar_preset_group_instances(id) ON DELETE CASCADE,
    preset_id   TEXT NOT NULL
        REFERENCES prompt_presets(id) ON DELETE CASCADE,
    PRIMARY KEY (instance_id, preset_id)
);
CREATE INDEX idx_sidebar_preset_group_active_presets_preset
    ON sidebar_preset_group_active_presets(preset_id);
