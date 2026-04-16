-- Unified many-to-many "default-visible genres" for both user-created and
-- system prompt groups. Replaces the former per-type wiring:
--   * user groups used `prompt_groups.genre_id` as a single-value default
--   * system groups used the dedicated `system_group_genre_defaults` table
-- Both are migrated in here, then `system_group_genre_defaults` is dropped.
--
-- NOTE: system prompt groups are seeded at runtime (after migrations run),
-- so at this point `prompt_groups` does NOT yet contain the system group
-- rows referenced by `system_group_genre_defaults`. We therefore cannot put
-- a FK from `prompt_group_id` to `prompt_groups(id)` here — we would hit
-- FOREIGN KEY violations during the carry-over INSERT. Cleanup of orphaned
-- rows is handled at runtime via ON DELETE of the prompt_groups row (see
-- the repository `delete` path which also clears default-genre entries).

-- Drop any leftover table from a previously-failed run of this migration
-- (earlier drafts created `prompt_group_default_genres` with a FK on
-- `prompt_group_id` that conflicts with runtime-seeded system groups).
-- The table is always repopulated below, so no data is lost.
DROP TABLE IF EXISTS prompt_group_default_genres;

CREATE TABLE IF NOT EXISTS prompt_group_default_genres (
    prompt_group_id TEXT NOT NULL,
    genre_id        TEXT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_group_id, genre_id)
);
CREATE INDEX IF NOT EXISTS idx_pg_default_genres_group
    ON prompt_group_default_genres(prompt_group_id);
CREATE INDEX IF NOT EXISTS idx_pg_default_genres_genre
    ON prompt_group_default_genres(genre_id);

-- 1) Carry over any user-group single-genre ownership as a default-visible row.
--    Guard the FK side (genres) with EXISTS in case of orphaned genre_ids.
INSERT OR IGNORE INTO prompt_group_default_genres (prompt_group_id, genre_id)
SELECT pg.id, pg.genre_id
FROM prompt_groups pg
WHERE pg.genre_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM genres g WHERE g.id = pg.genre_id);

-- 2) Carry over explicit system-group defaults (show_by_default = 1),
--    guarded by genre existence. prompt_group_id has no FK in this table
--    so system group ids that don't yet exist in prompt_groups are fine.
INSERT OR IGNORE INTO prompt_group_default_genres (prompt_group_id, genre_id)
SELECT sgd.system_group_id, sgd.genre_id
FROM system_group_genre_defaults sgd
WHERE sgd.show_by_default = 1
  AND EXISTS (SELECT 1 FROM genres g WHERE g.id = sgd.genre_id);

-- 3) Null out the legacy column so nothing accidentally reads it.
UPDATE prompt_groups SET genre_id = NULL;

-- 4) Retire the old system-only table.
DROP TABLE IF EXISTS system_group_genre_defaults;
