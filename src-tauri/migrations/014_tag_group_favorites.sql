-- Favorite flag for tag_groups. PromptGroupModal only shows favorited
-- branches, so users can curate which groups appear without rendering
-- the entire tag database each time the modal opens.

ALTER TABLE tag_groups ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_tag_groups_is_favorite ON tag_groups(is_favorite) WHERE is_favorite = 1;
