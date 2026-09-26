// nax.moe catalog cache (migration 027): galleries + images.
//
// `replace_catalog` swaps the whole cache in one transaction; everything else
// is a read-only lookup. Favorites live in `nax_favorite.rs`.

use rusqlite::{params, params_from_iter, Connection, Row};

use crate::error::AppError;
use crate::models::dto::{NaxGalleryRow, NaxImageRow};

/// Lookup form of a tag: trimmed, lowercase, underscores as spaces.
pub fn tag_key(tag: &str) -> String {
    tag.trim().to_lowercase().replace('_', " ")
}

fn map_gallery_row(r: &Row) -> rusqlite::Result<NaxGalleryRow> {
    Ok(NaxGalleryRow {
        slug: r.get(0)?,
        title: r.get(1)?,
        model_version: r.get(2)?,
        description: r.get(3)?,
        image_base_url: r.get(4)?,
        image_count: r.get(5)?,
        sort_order: r.get(6)?,
    })
}

fn map_image_row(r: &Row) -> rusqlite::Result<NaxImageRow> {
    Ok(NaxImageRow {
        gallery_slug: r.get(0)?,
        tag: r.get(1)?,
        filename: r.get(2)?,
        up_votes: r.get(3)?,
        down_votes: r.get(4)?,
        score: r.get(5)?,
        first_seen_at: r.get(6)?,
    })
}

const IMAGE_COLUMNS: &str =
    "i.gallery_slug, i.tag, i.filename, i.up_votes, i.down_votes, i.score, i.first_seen_at";

/// Swap in a freshly synced catalog. Images already known keep their
/// `first_seen_at`; new ones get `now`; ones no longer listed are dropped.
/// (`first_seen_at` on the passed rows is ignored.)
pub fn replace_catalog(
    conn: &mut Connection,
    galleries: &[NaxGalleryRow],
    images: &[NaxImageRow],
    now: &str,
) -> Result<(), AppError> {
    let tx = conn.transaction()?;
    let generation: i64 =
        tx.query_row("SELECT COALESCE(MAX(sync_gen), 0) + 1 FROM nax_images", [], |r| r.get(0))?;
    tx.execute("DELETE FROM nax_galleries", [])?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO nax_galleries
                (slug, title, model_version, description, image_base_url, image_count, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )?;
        for g in galleries {
            stmt.execute(params![
                g.slug, g.title, g.model_version, g.description, g.image_base_url, g.image_count, g.sort_order
            ])?;
        }
        // Upsert also absorbs the export occasionally repeating a tag.
        let mut stmt = tx.prepare(
            "INSERT INTO nax_images
                (gallery_slug, tag, tag_key, filename, up_votes, down_votes, score, first_seen_at, sync_gen)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(gallery_slug, tag) DO UPDATE SET
                tag_key = excluded.tag_key, filename = excluded.filename,
                up_votes = excluded.up_votes, down_votes = excluded.down_votes,
                score = excluded.score, sync_gen = excluded.sync_gen",
        )?;
        for i in images {
            stmt.execute(params![
                i.gallery_slug, i.tag, tag_key(&i.tag), i.filename, i.up_votes, i.down_votes, i.score,
                now, generation
            ])?;
        }
    }
    tx.execute("DELETE FROM nax_images WHERE sync_gen != ?1", [generation])?;
    tx.commit()?;
    Ok(())
}

pub fn list_galleries(conn: &Connection) -> Result<Vec<NaxGalleryRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT slug, title, model_version, description, image_base_url, image_count, sort_order
         FROM nax_galleries ORDER BY sort_order, slug",
    )?;
    let rows = stmt.query_map([], map_gallery_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Every image of one gallery, best-voted first.
pub fn list_gallery_images(conn: &Connection, slug: &str) -> Result<Vec<NaxImageRow>, AppError> {
    let sql = format!(
        "SELECT {IMAGE_COLUMNS} FROM nax_images i
         WHERE i.gallery_slug = ?1 ORDER BY i.score DESC, i.tag_key"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([slug], map_image_row)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
}

/// Images whose tag matches any of `keys` exactly (keys from `tag_key`),
/// across all galleries, in gallery order.
pub fn find_by_tag_keys(conn: &Connection, keys: &[String]) -> Result<Vec<NaxImageRow>, AppError> {
    let mut out = Vec::new();
    // Stay well below SQLite's bound-parameter limit.
    for chunk in keys.chunks(500) {
        let placeholders = vec!["?"; chunk.len()].join(",");
        let sql = format!(
            "SELECT {IMAGE_COLUMNS} FROM nax_images i
             JOIN nax_galleries g ON g.slug = i.gallery_slug
             WHERE i.tag_key IN ({placeholders})
             ORDER BY g.sort_order, i.tag_key"
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_from_iter(chunk.iter()), map_image_row)?;
        for row in rows {
            out.push(row?);
        }
    }
    Ok(out)
}

/// (gallery count, image count) currently cached.
pub fn counts(conn: &Connection) -> Result<(i64, i64), AppError> {
    conn.query_row(
        "SELECT (SELECT COUNT(*) FROM nax_galleries), (SELECT COUNT(*) FROM nax_images)",
        [],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )
    .map_err(Into::into)
}
