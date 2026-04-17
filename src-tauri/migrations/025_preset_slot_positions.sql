-- Per-slot character position. 0.5, 0.5 = center of canvas. When a sidebar
-- preset group instance has the preset active, the mapped character is moved
-- to this position. Multiple active presets affecting the same character are
-- resolved by activated_at ASC — the last one wins.
ALTER TABLE preset_character_slots
    ADD COLUMN position_x REAL NOT NULL DEFAULT 0.5;
ALTER TABLE preset_character_slots
    ADD COLUMN position_y REAL NOT NULL DEFAULT 0.5;

-- Activation timestamp to resolve "last active wins" for position.
ALTER TABLE sidebar_preset_group_active_presets
    ADD COLUMN activated_at TEXT NOT NULL DEFAULT (datetime('now'));
