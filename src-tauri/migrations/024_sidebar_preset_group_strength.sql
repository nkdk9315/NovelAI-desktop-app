-- Per-instance default strengths (applied to any active preset whose individual
-- strength is NULL). Value semantics: 1.0 = neutral (no wrap); other values
-- wrap the contribution as `{strength}::{text}::`.
ALTER TABLE sidebar_preset_group_instances
    ADD COLUMN default_positive_strength REAL NOT NULL DEFAULT 1.0;
ALTER TABLE sidebar_preset_group_instances
    ADD COLUMN default_negative_strength REAL NOT NULL DEFAULT 1.0;

-- Per-active-preset overrides. NULL = inherit instance default.
ALTER TABLE sidebar_preset_group_active_presets
    ADD COLUMN positive_strength REAL;
ALTER TABLE sidebar_preset_group_active_presets
    ADD COLUMN negative_strength REAL;
