-- Per-genre settings for system prompt groups. Keyed by stable
-- system_group_id ("system-group-cat-{n}") and genre_id, so the
-- settings persist independently of whether the system group is
-- currently added to any character's sidebar.

CREATE TABLE system_group_genre_defaults (
  system_group_id TEXT NOT NULL,
  genre_id TEXT NOT NULL,
  show_by_default INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (system_group_id, genre_id),
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

CREATE INDEX idx_sggd_genre ON system_group_genre_defaults(genre_id);
