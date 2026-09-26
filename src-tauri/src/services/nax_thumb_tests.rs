use super::*;

fn sample_webp(width: u32, height: u32) -> Vec<u8> {
    let img = image::DynamicImage::ImageRgb8(image::RgbImage::from_fn(width, height, |x, y| {
        image::Rgb([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8])
    }));
    webp::Encoder::from_image(&img).unwrap().encode(90.0).to_vec()
}

#[test]
fn thumbnail_is_shrunk_to_width_keeping_ratio() {
    let thumb = make_thumbnail(&sample_webp(832, 1216)).unwrap();
    let decoded = webp::Decoder::new(&thumb).decode().unwrap();
    assert_eq!((decoded.width(), decoded.height()), (THUMB_WIDTH, 526));
}

#[test]
fn small_images_are_not_enlarged() {
    let thumb = make_thumbnail(&sample_webp(100, 150)).unwrap();
    let decoded = webp::Decoder::new(&thumb).decode().unwrap();
    assert_eq!((decoded.width(), decoded.height()), (100, 150));
}

#[test]
fn garbage_is_rejected() {
    assert!(matches!(make_thumbnail(b"not an image"), Err(AppError::Validation(_))));
}

#[test]
fn only_cdn_image_urls_are_allowed() {
    assert!(validate_source_url("https://cdn.zele.st/data/NAX/Images/g/akazawa%2520red.webp").is_ok());
    for bad in [
        "https://evil.example/data/NAX/Images/g/a.webp",
        "http://cdn.zele.st/data/NAX/Images/g/a.webp",
        "https://cdn.zele.st/data/NAX/Images/",
        "https://cdn.zele.st/data/NAX/Images/../../secret",
        "https://cdn.zele.st/data/NAX/Images/g/a.webp?x=1",
        "file:///etc/passwd",
    ] {
        assert!(validate_source_url(bad).is_err(), "{bad}");
    }
}

#[test]
fn cache_paths_are_sharded_and_stable() {
    let cache = NaxThumbCache::new(PathBuf::from("/c"), 100).unwrap();
    let a = cache.path_for("https://cdn.zele.st/data/NAX/Images/g/a.webp");
    assert_eq!(a, cache.path_for("https://cdn.zele.st/data/NAX/Images/g/a.webp"));
    assert_ne!(a, cache.path_for("https://cdn.zele.st/data/NAX/Images/g/b.webp"));
    assert_eq!(a.parent().unwrap().parent().unwrap(), Path::new("/c"));
    assert_eq!(a.extension().unwrap(), "webp");
}

#[test]
fn limit_is_clamped() {
    assert_eq!(clamp_limit_mb(1), MIN_LIMIT_MB);
    assert_eq!(clamp_limit_mb(u64::MAX), MAX_LIMIT_MB);
    assert_eq!(clamp_limit_mb(500), 500);
}

fn write_file(dir: &Path, shard: &str, name: &str, size: usize, age_secs: u64) {
    let d = dir.join(shard);
    std::fs::create_dir_all(&d).unwrap();
    let p = d.join(name);
    std::fs::write(&p, vec![0u8; size]).unwrap();
    let f = std::fs::File::options().append(true).open(&p).unwrap();
    f.set_modified(SystemTime::now() - Duration::from_secs(age_secs)).unwrap();
}

#[test]
fn eviction_removes_least_recently_used_first() {
    let tmp = tempfile::tempdir().unwrap();
    let dir = tmp.path();
    write_file(dir, "aa", "old.webp", 100, 300);
    write_file(dir, "bb", "mid.webp", 100, 200);
    write_file(dir, "aa", "new.webp", 100, 100);
    write_file(dir, "aa", "junk.tmp", 999, 999); // not a thumbnail: ignored

    assert_eq!(evict_to(dir, 1000), 300);
    assert_eq!(evict_to(dir, 150), 100);
    assert!(dir.join("aa/new.webp").exists());
    assert!(!dir.join("aa/old.webp").exists());
    assert!(!dir.join("bb/mid.webp").exists());
}

#[tokio::test]
async fn stats_clear_and_limit() {
    let tmp = tempfile::tempdir().unwrap();
    let cache = NaxThumbCache::new(tmp.path().join("thumbs"), 100).unwrap();
    assert_eq!(cache.stats().await.used_bytes, 0);
    write_file(&cache.dir, "aa", "x.webp", 10, 0);
    let s = cache.stats().await;
    assert_eq!((s.used_bytes, s.file_count, s.limit_mb), (10, 1, 100));
    cache.set_limit_mb(1).await;
    assert_eq!(cache.stats().await.limit_mb, MIN_LIMIT_MB);
    cache.clear().await.unwrap();
    assert_eq!(cache.stats().await.file_count, 0);
    assert!(matches!(cache.get("https://elsewhere/x.webp").await, Err(AppError::Validation(_))));
}

/// Fetches and shrinks a real CDN image. Needs network; run with
/// `cargo test live_thumb -- --ignored`.
#[tokio::test]
#[ignore]
async fn live_thumb_from_cdn() {
    let tmp = tempfile::tempdir().unwrap();
    let cache = NaxThumbCache::new(tmp.path().to_path_buf(), 100).unwrap();
    let url = "https://cdn.zele.st/data/NAX/Images/danbooru-artist-tags-v5/akchu.webp";
    let first = cache.get(url).await.unwrap();
    assert!(first.len() < 40_000, "thumbnail is {} bytes", first.len());
    assert_eq!(cache.get(url).await.unwrap(), first);
    assert_eq!(cache.stats().await.file_count, 1);
    println!("thumbnail: {} bytes", first.len());
}

#[test]
fn limit_setting_round_trips_clamped() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    conn.execute_batch("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)").unwrap();
    assert_eq!(saved_limit_mb(&conn), DEFAULT_LIMIT_MB);
    assert_eq!(save_limit_mb(&conn, 1).unwrap(), MIN_LIMIT_MB);
    assert_eq!(saved_limit_mb(&conn), MIN_LIMIT_MB);
    assert_eq!(save_limit_mb(&conn, 2000).unwrap(), 2000);
    assert_eq!(saved_limit_mb(&conn), 2000);
}
