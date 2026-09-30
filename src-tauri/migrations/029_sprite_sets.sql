-- 差分制作（F13）: 差分セット・セル・候補
CREATE TABLE IF NOT EXISTS sprite_sets (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    spec        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sprite_sets_project ON sprite_sets(project_id);

CREATE TABLE IF NOT EXISTS sprite_cells (
    set_id            TEXT NOT NULL REFERENCES sprite_sets(id) ON DELETE CASCADE,
    cell_key          TEXT NOT NULL,
    adopted_image_id  TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
    excluded          INTEGER NOT NULL DEFAULT 0,
    note              TEXT NOT NULL DEFAULT '',
    updated_at        TEXT NOT NULL,
    PRIMARY KEY (set_id, cell_key)
);

CREATE TABLE IF NOT EXISTS sprite_candidates (
    id               TEXT PRIMARY KEY,
    set_id           TEXT NOT NULL REFERENCES sprite_sets(id) ON DELETE CASCADE,
    cell_key         TEXT NOT NULL,
    image_id         TEXT NOT NULL REFERENCES generated_images(id) ON DELETE CASCADE,
    parent_image_id  TEXT REFERENCES generated_images(id) ON DELETE SET NULL,
    method           TEXT NOT NULL,
    created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sprite_candidates_cell ON sprite_candidates(set_id, cell_key);
