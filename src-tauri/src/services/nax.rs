// nax.moe (NovelAI Tag Experiments) explorer.
//
// The catalog — which tags each gallery has, plus community votes — is
// synced into SQLite from the public API and the daily `tags.zip` export,
// then served locally so browsing/searching is instant and survives being
// offline. Images are never downloaded here: DTOs carry CDN URLs that the
// WebView loads while online.

use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    NaxFavoriteTagDto, NaxGalleryDto, NaxGalleryRow, NaxImageDto, NaxImageRow, NaxStatusDto,
};
use crate::repositories::nax as repo;
use crate::repositories::nax_favorite as fav_repo;
use crate::repositories::settings as settings_repo;
use crate::services::nax_catalog as catalog;

const API_BASE: &str = "https://nax.moe/api";
const TAGS_ZIP_URL: &str = "https://nax.moe/downloads/tags.zip";
const SYNCED_AT_KEY: &str = "nax_synced_at";
/// Time of the very first sync: images seen then are the baseline, not "new".
const FIRST_SYNCED_AT_KEY: &str = "nax_first_synced_at";
const NEW_FOR_DAYS: i64 = 7;
/// The export is regenerated daily, so syncing more often gains nothing.
const MAX_AGE_HOURS: i64 = 24;

/// One sync at a time; a second caller waits, then sees fresh data.
static SYNC_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

fn lock(db: &Mutex<Connection>) -> Result<MutexGuard<'_, Connection>, AppError> {
    db.lock().map_err(|e| AppError::Database(format!("db mutex poisoned: {e}")))
}

fn net_err(e: reqwest::Error) -> AppError {
    AppError::ApiClient(format!("nax.moe: {e}"))
}

pub fn status(conn: &Connection) -> Result<NaxStatusDto, AppError> {
    let (gallery_count, image_count) = repo::counts(conn)?;
    Ok(NaxStatusDto {
        synced_at: settings_repo::get_by_key(conn, SYNCED_AT_KEY)?,
        gallery_count,
        image_count,
    })
}

fn is_fresh(conn: &Connection) -> Result<bool, AppError> {
    let s = status(conn)?;
    let Some(at) = s.synced_at.and_then(|t| chrono::DateTime::parse_from_rfc3339(&t).ok()) else {
        return Ok(false);
    };
    let age = chrono::Utc::now().signed_duration_since(at);
    Ok(s.image_count > 0 && age < chrono::Duration::hours(MAX_AGE_HOURS))
}

async fn get_bytes(client: &reqwest::Client, url: &str) -> Result<Vec<u8>, AppError> {
    let resp = client.get(url).send().await.map_err(net_err)?;
    let resp = resp.error_for_status().map_err(net_err)?;
    Ok(resp.bytes().await.map_err(net_err)?.to_vec())
}

/// Refresh the local catalog when it is missing or older than a day
/// (always, with `force`). Never holds the DB lock across network I/O.
pub async fn sync(db: &Mutex<Connection>, force: bool) -> Result<NaxStatusDto, AppError> {
    let _guard = SYNC_LOCK.lock().await;
    if !force && is_fresh(&*lock(db)?)? {
        return status(&*lock(db)?);
    }

    let client = reqwest::Client::builder()
        .user_agent(concat!("NovelAI-desktop-app/", env!("CARGO_PKG_VERSION"), " (nax explorer)"))
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(net_err)?;
    let list_url = format!("{API_BASE}/gallery/list");
    let (list_json, zip_bytes) =
        tokio::try_join!(get_bytes(&client, &list_url), get_bytes(&client, TAGS_ZIP_URL))?;
    let (mut galleries, mut by_slug) = tokio::task::spawn_blocking(move || {
        Ok::<_, AppError>((
            catalog::parse_gallery_list(&list_json)?,
            catalog::parse_tags_zip(&zip_bytes)?,
        ))
    })
    .await
    .map_err(|e| AppError::Io(format!("nax.moe parse task: {e}")))??;

    let mut images: Vec<NaxImageRow> = Vec::new();
    for g in galleries.iter_mut() {
        let rows = match by_slug.remove(&g.slug) {
            Some(rows) => rows,
            // Gallery newer than the daily export: ask the API directly.
            // It has no votes and is slow for big galleries, but it is rare.
            None => {
                let url = format!("{API_BASE}/gallery/{}", catalog::encode_component(&g.slug));
                match get_bytes(&client, &url).await {
                    Ok(body) => catalog::parse_gallery_detail(&body, &g.slug)?,
                    Err(e) => {
                        eprintln!("[nax] skipping gallery {}: {e}", g.slug);
                        Vec::new()
                    }
                }
            }
        };
        // Show what is actually browsable, not the live count.
        g.image_count = rows.len() as i64;
        images.extend(rows);
    }

    let now = chrono::Utc::now().to_rfc3339();
    let mut conn = lock(db)?;
    repo::replace_catalog(&mut conn, &galleries, &images, &now)?;
    if settings_repo::get_by_key(&conn, FIRST_SYNCED_AT_KEY)?.is_none() {
        settings_repo::set(&conn, FIRST_SYNCED_AT_KEY, &now)?;
    }
    settings_repo::set(&conn, SYNCED_AT_KEY, &now)?;
    status(&conn)
}

pub fn list_galleries(conn: &Connection) -> Result<Vec<NaxGalleryDto>, AppError> {
    Ok(repo::list_galleries(conn)?
        .into_iter()
        .map(|g| NaxGalleryDto {
            category: catalog::category_for(&g.slug).to_string(),
            slug: g.slug,
            title: g.title,
            model_version: g.model_version,
            description: g.description,
            image_count: g.image_count,
        })
        .collect())
}

/// What turning image rows into DTOs needs: gallery URLs and the "new" rule.
struct DtoContext {
    galleries: HashMap<String, NaxGalleryRow>,
    /// First sync time; `None` until the first sync.
    baseline: Option<String>,
    /// RFC 3339 cutoff: images first seen before this are no longer new.
    new_since: String,
}

impl DtoContext {
    fn load(conn: &Connection) -> Result<Self, AppError> {
        Ok(Self {
            galleries: repo::list_galleries(conn)?.into_iter().map(|g| (g.slug.clone(), g)).collect(),
            baseline: settings_repo::get_by_key(conn, FIRST_SYNCED_AT_KEY)?,
            new_since: (chrono::Utc::now() - chrono::Duration::days(NEW_FOR_DAYS)).to_rfc3339(),
        })
    }

    // Timestamps all come from `to_rfc3339()` in UTC, so they compare as strings.
    fn is_new(&self, first_seen_at: &str) -> bool {
        self.baseline.as_deref().is_some_and(|b| first_seen_at > b) && first_seen_at >= self.new_since.as_str()
    }

    fn to_dtos(&self, rows: Vec<NaxImageRow>) -> Vec<NaxImageDto> {
        rows.into_iter()
            .filter_map(|r| {
                let g = self.galleries.get(&r.gallery_slug)?;
                Some(NaxImageDto {
                    image_url: catalog::image_url(&g.image_base_url, &r.filename),
                    model_version: g.model_version.clone(),
                    is_new: self.is_new(&r.first_seen_at),
                    gallery_slug: r.gallery_slug,
                    tag: r.tag,
                    up_votes: r.up_votes,
                    down_votes: r.down_votes,
                    score: r.score,
                    first_seen_at: r.first_seen_at,
                })
            })
            .collect()
    }
}

pub fn list_gallery_images(conn: &Connection, slug: &str) -> Result<Vec<NaxImageDto>, AppError> {
    let ctx = DtoContext::load(conn)?;
    if !ctx.galleries.contains_key(slug) {
        return Err(AppError::NotFound(format!("nax gallery {slug}")));
    }
    Ok(ctx.to_dtos(repo::list_gallery_images(conn, slug)?))
}

/// Every image of the given tags across all galleries. Tags match
/// case-insensitively with `_` and space interchangeable.
pub fn find_tags(conn: &Connection, tags: &[String]) -> Result<Vec<NaxImageDto>, AppError> {
    let mut keys: Vec<String> = tags.iter().map(|t| repo::tag_key(t)).filter(|k| !k.is_empty()).collect();
    keys.sort();
    keys.dedup();
    if keys.is_empty() {
        return Ok(Vec::new());
    }
    let ctx = DtoContext::load(conn)?;
    Ok(ctx.to_dtos(repo::find_by_tag_keys(conn, &keys)?))
}

pub fn list_favorite_tags(conn: &Connection) -> Result<Vec<NaxFavoriteTagDto>, AppError> {
    fav_repo::list(conn)
}

pub fn toggle_favorite_tag(conn: &Connection, tag: &str, category: &str) -> Result<bool, AppError> {
    if tag.trim().is_empty() {
        return Err(AppError::Validation("tag must not be empty".to_string()));
    }
    // Artist favorites belong to the app-wide `artist_favorites` list.
    if category == "artist" || category.trim().is_empty() {
        return Err(AppError::Validation(format!("invalid favorite category: {category}")));
    }
    fav_repo::toggle(conn, tag, category, &chrono::Utc::now().to_rfc3339())
}

#[cfg(test)]
#[path = "nax_tests.rs"]
mod tests;
