-- nax.moe (NovelAI Tag Experiments) explorer.
--
-- nax_galleries / nax_images are a local cache of the public catalog
-- (https://nax.moe/api + downloads/tags.zip). A sync replaces them wholesale,
-- so nothing else may reference their rows. Images themselves are never
-- stored: the UI loads them from the CDN while online.
--
-- tag_key is the lookup form of a tag: lowercase, underscores as spaces, so
-- "ei_(eiei_e1)" in a prompt matches "ei (eiei e1)" in the catalog.

CREATE TABLE nax_galleries (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model_version TEXT NOT NULL,
    description TEXT,
    image_base_url TEXT NOT NULL,
    image_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE nax_images (
    gallery_slug TEXT NOT NULL,
    tag TEXT NOT NULL,
    tag_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    up_votes INTEGER NOT NULL DEFAULT 0,
    down_votes INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (gallery_slug, tag)
) WITHOUT ROWID;

CREATE INDEX idx_nax_images_tag_key ON nax_images(tag_key);

-- Favorited non-artist tags (characters, hair, ...). Artist favorites live in
-- the existing `artist_favorites` setting so they stay one list app-wide.
CREATE TABLE nax_favorite_tags (
    tag_key TEXT PRIMARY KEY,
    tag TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TEXT NOT NULL
);
