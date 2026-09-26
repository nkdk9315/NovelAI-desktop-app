-- nax.moe explorer: remember when each image first showed up in a sync.
--
-- nax.moe exposes no per-image dates (its "sort by date" is server-side
-- only), so "newest first" is based on when this app first saw an image.
-- Syncs upsert rows and bump sync_gen; rows not seen in the latest sync are
-- deleted, and first_seen_at is only ever written on insert.

ALTER TABLE nax_images ADD COLUMN first_seen_at TEXT NOT NULL DEFAULT '';
ALTER TABLE nax_images ADD COLUMN sync_gen INTEGER NOT NULL DEFAULT 0;

-- Rows from an earlier sync were first seen at that sync.
UPDATE nax_images SET first_seen_at =
    COALESCE((SELECT value FROM settings WHERE key = 'nax_synced_at'), '');
INSERT OR IGNORE INTO settings (key, value)
    SELECT 'nax_first_synced_at', value FROM settings WHERE key = 'nax_synced_at';
