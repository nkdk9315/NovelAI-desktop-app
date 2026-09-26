use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Manager, Runtime, State, UriSchemeContext, UriSchemeResponder};

use crate::error::AppError;
use crate::models::dto::{
    NaxFavoriteTagDto, NaxGalleryDto, NaxImageDto, NaxStatusDto, NaxThumbCacheInfoDto,
};
use crate::services::nax as svc;
use crate::services::nax_catalog::percent_decode;
use crate::services::nax_thumb::{self, NaxThumbCache};
use crate::state::AppState;


fn lock_db<'a>(state: &'a State<'_, AppState>) -> Result<std::sync::MutexGuard<'a, rusqlite::Connection>, AppError> {
    state
        .db
        .lock()
        .map_err(|e| AppError::Database(format!("db mutex poisoned: {e}")))
}

#[tauri::command]
pub async fn nax_sync(state: State<'_, AppState>, force: Option<bool>) -> Result<NaxStatusDto, String> {
    svc::sync(&state.db, force.unwrap_or(false)).await.map_err(Into::into)
}

#[tauri::command]
pub fn nax_get_status(state: State<'_, AppState>) -> Result<NaxStatusDto, String> {
    let conn = lock_db(&state)?;
    svc::status(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn nax_list_galleries(state: State<'_, AppState>) -> Result<Vec<NaxGalleryDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_galleries(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn nax_list_gallery_images(
    state: State<'_, AppState>,
    slug: String,
) -> Result<Vec<NaxImageDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_gallery_images(&conn, &slug).map_err(Into::into)
}

#[tauri::command]
pub fn nax_find_tags(state: State<'_, AppState>, tags: Vec<String>) -> Result<Vec<NaxImageDto>, String> {
    let conn = lock_db(&state)?;
    svc::find_tags(&conn, &tags).map_err(Into::into)
}

#[tauri::command]
pub fn nax_list_favorite_tags(state: State<'_, AppState>) -> Result<Vec<NaxFavoriteTagDto>, String> {
    let conn = lock_db(&state)?;
    svc::list_favorite_tags(&conn).map_err(Into::into)
}

#[tauri::command]
pub fn nax_toggle_favorite_tag(
    state: State<'_, AppState>,
    tag: String,
    category: String,
) -> Result<bool, String> {
    let conn = lock_db(&state)?;
    svc::toggle_favorite_tag(&conn, &tag, &category).map_err(Into::into)
}

// ---- Thumbnail cache ----

/// `naxthumb://localhost/<encodeURIComponent(cdn image url)>` → cached thumbnail.
pub fn thumb_protocol<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = ctx.app_handle().clone();
    tauri::async_runtime::spawn(async move {
        let url = percent_decode(request.uri().path().trim_start_matches('/'));
        let result = app.state::<NaxThumbCache>().get(&url).await;
        let response = match result {
            Ok(bytes) => Response::builder()
                .header(header::CONTENT_TYPE, "image/webp")
                .header(header::CACHE_CONTROL, "max-age=31536000, immutable")
                .body(bytes),
            Err(e) => {
                let status = match e {
                    AppError::Validation(_) => StatusCode::BAD_REQUEST,
                    _ => StatusCode::BAD_GATEWAY,
                };
                Response::builder().status(status).body(Vec::new())
            }
        };
        responder.respond(response.expect("static response parts are valid"));
    });
}

#[tauri::command]
pub async fn nax_thumb_cache_info(cache: State<'_, NaxThumbCache>) -> Result<NaxThumbCacheInfoDto, String> {
    let s = cache.stats().await;
    Ok(NaxThumbCacheInfoDto { used_bytes: s.used_bytes, file_count: s.file_count, limit_mb: s.limit_mb })
}

#[tauri::command]
pub async fn nax_set_thumb_cache_limit(
    state: State<'_, AppState>,
    cache: State<'_, NaxThumbCache>,
    limit_mb: u64,
) -> Result<NaxThumbCacheInfoDto, String> {
    let limit_mb = {
        let conn = lock_db(&state)?;
        nax_thumb::save_limit_mb(&conn, limit_mb)?
    };
    cache.set_limit_mb(limit_mb).await;
    nax_thumb_cache_info(cache).await
}

#[tauri::command]
pub async fn nax_clear_thumb_cache(cache: State<'_, NaxThumbCache>) -> Result<NaxThumbCacheInfoDto, String> {
    cache.clear().await?;
    nax_thumb_cache_info(cache).await
}
