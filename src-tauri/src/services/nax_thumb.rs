// Disk cache of small nax.moe thumbnails.
//
// The CDN serves 832×1216 WebP files of ~100 KB each; browsing a gallery
// re-downloads them every time. Instead the UI loads images through the
// `naxthumb://` protocol: the first request fetches the original, shrinks it
// to a 360 px wide lossy WebP (~15-20 KB) and stores it; later requests —
// also offline — are served from disk. The cache is capped in size and
// evicts least-recently-used files (mtime is bumped on every hit).

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime};

use sha2::{Digest, Sha256};
use tokio::sync::{Mutex, Semaphore};

use crate::error::AppError;
use crate::repositories::settings as settings_repo;

/// Only images from the nax.moe CDN may be proxied (no open fetch proxy).
const SOURCE_PREFIX: &str = "https://cdn.zele.st/data/NAX/Images/";
const MAX_URL_LEN: usize = 1024;
pub const THUMB_WIDTH: u32 = 360;
const THUMB_QUALITY: f32 = 72.0;
pub const DEFAULT_LIMIT_MB: u64 = 500;
pub const MIN_LIMIT_MB: u64 = 50;
pub const MAX_LIMIT_MB: u64 = 20_000;
/// Parallel CDN downloads; a scrolled grid asks for dozens at once.
const FETCH_SLOTS: usize = 6;
/// Evicting down to 90% of the cap avoids evicting again on the next write.
const EVICT_TO_PERCENT: u64 = 90;
const THUMB_EXT: &str = "webp";

pub struct NaxThumbCache {
    dir: PathBuf,
    limit_bytes: AtomicU64,
    /// Bytes on disk; `None` until the directory is first scanned.
    used_bytes: Mutex<Option<u64>>,
    fetch_slots: Semaphore,
    client: reqwest::Client,
}

pub struct CacheStats {
    pub used_bytes: u64,
    pub file_count: u64,
    pub limit_mb: u64,
}

fn io_err(context: &str, e: impl std::fmt::Display) -> AppError {
    eprintln!("[nax thumb] {context}: {e}");
    AppError::Io(format!("thumbnail cache: {context}"))
}

fn net_err(e: reqwest::Error) -> AppError {
    AppError::ApiClient(format!("nax.moe image: {e}"))
}

pub fn validate_source_url(url: &str) -> Result<(), AppError> {
    let ok = url.len() <= MAX_URL_LEN
        && url.starts_with(SOURCE_PREFIX)
        && url.len() > SOURCE_PREFIX.len()
        && !url.contains("..")
        && !url.contains(['?', '#', '\\']);
    if ok { Ok(()) } else { Err(AppError::Validation("not a nax.moe image URL".to_string())) }
}

/// Shrink an image to `THUMB_WIDTH` (never enlarge) and encode as lossy WebP.
pub fn make_thumbnail(source: &[u8]) -> Result<Vec<u8>, AppError> {
    let decoded = webp::Decoder::new(source)
        .decode()
        .ok_or_else(|| AppError::Validation("image is not a decodable WebP".to_string()))?
        .to_image();
    let img = if decoded.width() > THUMB_WIDTH {
        let height = (decoded.height() as u64 * THUMB_WIDTH as u64 / decoded.width() as u64).max(1) as u32;
        decoded.resize_exact(THUMB_WIDTH, height, image::imageops::FilterType::CatmullRom)
    } else {
        decoded
    };
    // libwebp only takes 8-bit RGB(A).
    let img = if img.color().has_alpha() {
        image::DynamicImage::ImageRgba8(img.to_rgba8())
    } else {
        image::DynamicImage::ImageRgb8(img.to_rgb8())
    };
    let encoder = webp::Encoder::from_image(&img).map_err(|e| AppError::Validation(e.to_string()))?;
    Ok(encoder.encode(THUMB_QUALITY).to_vec())
}

/// Every cached thumbnail with its size and last-use time.
fn scan(dir: &Path) -> Vec<(PathBuf, u64, SystemTime)> {
    let mut out = Vec::new();
    let Ok(shards) = std::fs::read_dir(dir) else { return out };
    for shard in shards.flatten() {
        let Ok(files) = std::fs::read_dir(shard.path()) else { continue };
        for f in files.flatten() {
            let path = f.path();
            if path.extension().and_then(|e| e.to_str()) != Some(THUMB_EXT) {
                continue;
            }
            if let Ok(meta) = f.metadata() {
                out.push((path, meta.len(), meta.modified().unwrap_or(SystemTime::UNIX_EPOCH)));
            }
        }
    }
    out
}

/// Delete least-recently-used files until at most `target` bytes remain.
/// Returns the bytes left.
pub fn evict_to(dir: &Path, target: u64) -> u64 {
    let mut files = scan(dir);
    let mut total: u64 = files.iter().map(|f| f.1).sum();
    if total <= target {
        return total;
    }
    files.sort_by_key(|f| f.2);
    for (path, size, _) in files {
        if total <= target {
            break;
        }
        if std::fs::remove_file(&path).is_ok() {
            total -= size;
        }
    }
    total
}

impl NaxThumbCache {
    pub fn new(dir: PathBuf, limit_mb: u64) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .user_agent(concat!("NovelAI-desktop-app/", env!("CARGO_PKG_VERSION"), " (nax explorer)"))
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(net_err)?;
        Ok(Self {
            dir,
            limit_bytes: AtomicU64::new(clamp_limit_mb(limit_mb) * 1024 * 1024),
            used_bytes: Mutex::new(None),
            fetch_slots: Semaphore::new(FETCH_SLOTS),
            client,
        })
    }

    fn path_for(&self, url: &str) -> PathBuf {
        let hash = Sha256::digest(url.as_bytes());
        let hex: String = hash.iter().take(16).map(|b| format!("{b:02x}")).collect();
        self.dir.join(&hex[..2]).join(format!("{}.{THUMB_EXT}", &hex[2..]))
    }

    /// Thumbnail bytes for a CDN image URL, from disk or freshly made.
    pub async fn get(&self, url: &str) -> Result<Vec<u8>, AppError> {
        validate_source_url(url)?;
        let path = self.path_for(url);
        if let Some(bytes) = read_hit(&path).await {
            return Ok(bytes);
        }
        let _slot = self.fetch_slots.acquire().await.map_err(|e| io_err("fetch slots", e))?;
        // A concurrent request for the same image may have finished meanwhile.
        if let Some(bytes) = read_hit(&path).await {
            return Ok(bytes);
        }
        let source = self.client.get(url).send().await.map_err(net_err)?
            .error_for_status().map_err(net_err)?
            .bytes().await.map_err(net_err)?;
        let thumb = tokio::task::spawn_blocking(move || make_thumbnail(&source))
            .await
            .map_err(|e| io_err("thumbnail task", e))??;
        self.store(&path, &thumb).await?;
        Ok(thumb)
    }

    async fn store(&self, path: &Path, bytes: &[u8]) -> Result<(), AppError> {
        let parent = path.parent().expect("thumbnail path has a shard dir");
        tokio::fs::create_dir_all(parent).await.map_err(|e| io_err("create dir", e))?;
        // Write-then-rename so a crash never leaves a truncated thumbnail.
        let tmp = path.with_extension("tmp");
        tokio::fs::write(&tmp, bytes).await.map_err(|e| io_err("write", e))?;
        tokio::fs::rename(&tmp, path).await.map_err(|e| io_err("rename", e))?;

        let mut used = self.used_bytes.lock().await;
        let total = match *used {
            Some(u) => u + bytes.len() as u64,
            None => self.rescan().await.0,
        };
        let limit = self.limit_bytes.load(Ordering::Relaxed);
        *used = Some(if total > limit { self.evict(limit * EVICT_TO_PERCENT / 100).await } else { total });
        Ok(())
    }

    /// (bytes, files) actually on disk.
    async fn rescan(&self) -> (u64, u64) {
        let dir = self.dir.clone();
        tokio::task::spawn_blocking(move || {
            let files = scan(&dir);
            (files.iter().map(|f| f.1).sum(), files.len() as u64)
        })
        .await
        .unwrap_or((0, 0))
    }

    async fn evict(&self, target: u64) -> u64 {
        let dir = self.dir.clone();
        tokio::task::spawn_blocking(move || evict_to(&dir, target)).await.unwrap_or(0)
    }

    pub async fn stats(&self) -> CacheStats {
        let mut used = self.used_bytes.lock().await;
        let (bytes, files) = self.rescan().await;
        *used = Some(bytes);
        CacheStats {
            used_bytes: bytes,
            file_count: files,
            limit_mb: self.limit_bytes.load(Ordering::Relaxed) / 1024 / 1024,
        }
    }

    pub async fn set_limit_mb(&self, limit_mb: u64) {
        let limit = clamp_limit_mb(limit_mb) * 1024 * 1024;
        self.limit_bytes.store(limit, Ordering::Relaxed);
        let mut used = self.used_bytes.lock().await;
        *used = Some(self.evict(limit).await);
    }

    pub async fn clear(&self) -> Result<(), AppError> {
        let mut used = self.used_bytes.lock().await;
        match tokio::fs::remove_dir_all(&self.dir).await {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(io_err("clear", e)),
        }
        *used = Some(0);
        Ok(())
    }
}

const LIMIT_SETTING_KEY: &str = "nax_thumb_cache_limit_mb";

pub fn clamp_limit_mb(limit_mb: u64) -> u64 {
    limit_mb.clamp(MIN_LIMIT_MB, MAX_LIMIT_MB)
}

/// Saved cache cap, for creating the cache at startup.
pub fn saved_limit_mb(conn: &rusqlite::Connection) -> u64 {
    settings_repo::get_by_key(conn, LIMIT_SETTING_KEY)
        .ok()
        .flatten()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_LIMIT_MB)
}

/// Clamp and save a new cache cap; returns the value stored.
pub fn save_limit_mb(conn: &rusqlite::Connection, limit_mb: u64) -> Result<u64, AppError> {
    let limit_mb = clamp_limit_mb(limit_mb);
    settings_repo::set(conn, LIMIT_SETTING_KEY, &limit_mb.to_string())?;
    Ok(limit_mb)
}

/// Read a cached file and mark it as recently used. `None` on a miss.
async fn read_hit(path: &Path) -> Option<Vec<u8>> {
    let bytes = tokio::fs::read(path).await.ok()?;
    let path = path.to_path_buf();
    // Best effort: a failed touch only makes eviction slightly less accurate.
    tokio::task::spawn_blocking(move || {
        if let Ok(f) = std::fs::File::options().append(true).open(&path) {
            let _ = f.set_modified(SystemTime::now());
        }
    });
    Some(bytes)
}

#[cfg(test)]
#[path = "nax_thumb_tests.rs"]
mod tests;
