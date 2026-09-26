use super::*;

const MIGRATION_027: &str = include_str!("../../migrations/027_nax_explorer.sql");
const MIGRATION_028: &str = include_str!("../../migrations/028_nax_first_seen.sql");

const T0: &str = "2026-09-01T00:00:00+00:00";

fn gallery(slug: &str, version: &str, order: i64) -> NaxGalleryRow {
    NaxGalleryRow {
        slug: slug.into(),
        title: slug.into(),
        model_version: version.into(),
        description: None,
        image_base_url: format!("https://cdn/{slug}/"),
        image_count: 0,
        sort_order: order,
    }
}

fn image(slug: &str, tag: &str, score: i64) -> NaxImageRow {
    NaxImageRow {
        gallery_slug: slug.into(),
        tag: tag.into(),
        filename: format!("{}.webp", tag.replace(' ', "%20")),
        up_votes: score,
        down_votes: 0,
        score,
        first_seen_at: String::new(),
    }
}

fn empty_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute_batch("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        .unwrap();
    conn.execute_batch(MIGRATION_027).unwrap();
    conn.execute_batch(MIGRATION_028).unwrap();
    conn
}

fn setup() -> Connection {
    let mut conn = empty_db();
    repo::replace_catalog(
        &mut conn,
        &[gallery("artist-v5", "v5", 0), gallery("artist-v4.5", "v4.5", 1), gallery("hair-v5", "v5", 2)],
        &[
            image("artist-v5", "ei (eiei e1)", 3),
            image("artist-v5", "akchu", 9),
            image("artist-v5", "chu", 1),
            image("artist-v4.5", "ei (eiei e1)", 7),
            image("hair-v5", "hime cut", 2),
        ],
        T0,
    )
    .unwrap();
    conn
}

#[test]
fn lists_galleries_with_category() {
    let conn = setup();
    let gs = list_galleries(&conn).unwrap();
    assert_eq!(gs.iter().map(|g| g.slug.as_str()).collect::<Vec<_>>(), ["artist-v5", "artist-v4.5", "hair-v5"]);
    assert_eq!(gs[0].category, "artist");
    assert_eq!(gs[2].category, "hair");
}

#[test]
fn gallery_images_sorted_by_score_with_urls() {
    let conn = setup();
    let imgs = list_gallery_images(&conn, "artist-v5").unwrap();
    assert_eq!(imgs.iter().map(|i| i.tag.as_str()).collect::<Vec<_>>(), ["akchu", "ei (eiei e1)", "chu"]);
    assert_eq!(imgs[1].image_url, "https://cdn/artist-v5/ei%2520(eiei%2520e1).webp");
    assert_eq!(imgs[1].model_version, "v5");
    assert!(matches!(list_gallery_images(&conn, "nope"), Err(AppError::NotFound(_))));
}

#[test]
fn find_tags_normalizes_underscores_and_case() {
    let conn = setup();
    let found = find_tags(&conn, &["EI_(eiei_e1)".into(), "missing".into()]).unwrap();
    assert_eq!(found.len(), 2);
    assert_eq!(found[0].gallery_slug, "artist-v5");
    assert_eq!(found[1].gallery_slug, "artist-v4.5");
    assert!(find_tags(&conn, &["  ".into()]).unwrap().is_empty());
}

#[test]
fn replace_catalog_swaps_everything() {
    let mut conn = setup();
    repo::replace_catalog(&mut conn, &[], &[], T0).unwrap();
    assert_eq!(repo::counts(&conn).unwrap(), (0, 0));
}

#[test]
fn resync_keeps_first_seen_and_flags_new_images() {
    let mut conn = setup();
    settings_repo::set(&conn, FIRST_SYNCED_AT_KEY, T0).unwrap();
    let later = chrono::Utc::now().to_rfc3339();
    let mut next = image("hair-v5", "afro", 1);
    next.first_seen_at = "ignored".into();
    // "hime cut" re-listed with new votes; "afro" is new; the artists vanish.
    repo::replace_catalog(
        &mut conn,
        &[gallery("hair-v5", "v5", 0)],
        &[image("hair-v5", "hime cut", 5), next],
        &later,
    )
    .unwrap();
    let imgs = list_gallery_images(&conn, "hair-v5").unwrap();
    assert_eq!(imgs.len(), 2);
    let hime = imgs.iter().find(|i| i.tag == "hime cut").unwrap();
    let afro = imgs.iter().find(|i| i.tag == "afro").unwrap();
    assert_eq!((hime.first_seen_at.as_str(), hime.score, hime.is_new), (T0, 5, false));
    assert_eq!(afro.first_seen_at, later);
    assert!(afro.is_new);
    assert_eq!(repo::counts(&conn).unwrap().1, 2);
}

#[test]
fn nothing_is_new_before_a_baseline_or_after_a_week() {
    let mut conn = empty_db();
    let recent = chrono::Utc::now().to_rfc3339();
    repo::replace_catalog(&mut conn, &[gallery("g", "v5", 0)], &[image("g", "a", 0)], &recent).unwrap();
    assert!(!list_gallery_images(&conn, "g").unwrap()[0].is_new);
    // A baseline long ago, but the image was first seen 8 days ago: no longer new.
    settings_repo::set(&conn, FIRST_SYNCED_AT_KEY, T0).unwrap();
    let old = (chrono::Utc::now() - chrono::Duration::days(8)).to_rfc3339();
    conn.execute("UPDATE nax_images SET first_seen_at = ?1", [&old]).unwrap();
    assert!(!list_gallery_images(&conn, "g").unwrap()[0].is_new);
}

#[test]
fn freshness_needs_recent_sync_and_data() {
    let conn = setup();
    assert!(!is_fresh(&conn).unwrap());
    settings_repo::set(&conn, SYNCED_AT_KEY, &chrono::Utc::now().to_rfc3339()).unwrap();
    assert!(is_fresh(&conn).unwrap());
    let old = chrono::Utc::now() - chrono::Duration::hours(MAX_AGE_HOURS + 1);
    settings_repo::set(&conn, SYNCED_AT_KEY, &old.to_rfc3339()).unwrap();
    assert!(!is_fresh(&conn).unwrap());
    assert_eq!(status(&conn).unwrap().image_count, 5);
}

#[test]
fn favorite_tags_toggle_by_key() {
    let conn = setup();
    assert!(toggle_favorite_tag(&conn, "hime cut", "hair").unwrap());
    assert_eq!(list_favorite_tags(&conn).unwrap()[0].tag, "hime cut");
    // Same tag in another spelling toggles it off.
    assert!(!toggle_favorite_tag(&conn, "Hime_Cut", "hair").unwrap());
    assert!(list_favorite_tags(&conn).unwrap().is_empty());
    assert!(matches!(toggle_favorite_tag(&conn, "x", "artist"), Err(AppError::Validation(_))));
    assert!(matches!(toggle_favorite_tag(&conn, " ", "hair"), Err(AppError::Validation(_))));
}

/// Syncs the real catalog from nax.moe. Needs network; run with
/// `cargo test live_sync -- --ignored`.
#[tokio::test]
#[ignore]
async fn live_sync_from_nax_moe() {
    let db = Mutex::new(setup());
    let s = sync(&db, true).await.unwrap();
    assert!(s.gallery_count >= 10, "{s:?}");
    assert!(s.image_count > 50_000, "{s:?}");
    let conn = db.lock().unwrap();
    let hits = find_tags(&conn, &["akchu".into()]).unwrap();
    assert!(!hits.is_empty());
    println!("{s:?}\n{}", hits[0].image_url);
}
