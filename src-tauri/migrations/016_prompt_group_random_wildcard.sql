-- Random selection and wildcard insertion support for prompt groups.
ALTER TABLE prompt_groups ADD COLUMN random_mode INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_groups ADD COLUMN random_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE prompt_groups ADD COLUMN random_source TEXT NOT NULL DEFAULT 'enabled';
ALTER TABLE prompt_groups ADD COLUMN wildcard_token TEXT;
