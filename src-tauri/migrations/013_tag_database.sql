-- Tag database: unified tag store + hierarchical groups + FTS5 search.

CREATE TABLE tags (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL UNIQUE,
    csv_category INTEGER
);

CREATE TABLE tag_aliases (
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    alias  TEXT NOT NULL,
    PRIMARY KEY (tag_id, alias)
);
CREATE INDEX idx_tag_aliases_alias ON tag_aliases(alias);

CREATE TABLE tag_groups (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    slug       TEXT NOT NULL UNIQUE,
    title      TEXT NOT NULL,
    parent_id  INTEGER REFERENCES tag_groups(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'seed',
    sort_key   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);
CREATE INDEX idx_tag_groups_parent ON tag_groups(parent_id);
CREATE INDEX idx_tag_groups_source ON tag_groups(source);

CREATE TABLE tag_group_members (
    tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES tag_groups(id) ON DELETE CASCADE,
    source   TEXT NOT NULL DEFAULT 'seed',
    PRIMARY KEY (tag_id, group_id)
);
CREATE INDEX idx_tgm_group ON tag_group_members(group_id);

-- Trigram-based FTS5 for substring/prefix matching on tag names and aliases.
-- Contentless (content='') so we populate it explicitly during seeding.
CREATE VIRTUAL TABLE tags_fts USING fts5(
    name,
    aliases,
    content='',
    tokenize = 'trigram'
);
