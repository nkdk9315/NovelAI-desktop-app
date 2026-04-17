-- Add sort_key to prompt_presets for drag-reorder within a folder.

ALTER TABLE prompt_presets ADD COLUMN sort_key INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve the previous created_at DESC listing order as the
-- initial sort_key so users see the same order after the migration.
UPDATE prompt_presets
SET sort_key = (
    SELECT COUNT(*)
    FROM prompt_presets AS later
    WHERE COALESCE(later.folder_id, -1) = COALESCE(prompt_presets.folder_id, -1)
      AND later.created_at > prompt_presets.created_at
);

CREATE INDEX idx_prompt_presets_folder_sort
    ON prompt_presets(folder_id, sort_key);
