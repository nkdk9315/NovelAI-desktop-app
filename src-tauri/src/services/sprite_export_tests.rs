use super::*;
use crate::models::sprite::{CreateSpriteSetRequest, SpriteAtlasEntry, SpriteExportImage, SpriteExportText};
use crate::test_utils::{create_test_project, setup_test_db};
use image::Rgba;

struct Fixture {
    db: Db,
    set_id: String,
    project_dir: tempfile::TempDir,
    out: tempfile::TempDir,
}

fn fixture() -> Fixture {
    let project_dir = tempfile::tempdir().unwrap();
    let conn = setup_test_db();
    let p = create_test_project(&conn);
    conn.execute(
        "UPDATE projects SET directory_path = ?1 WHERE id = ?2",
        [project_dir.path().to_string_lossy().as_ref(), p.id.as_str()],
    )
    .unwrap();
    let set = crate::services::sprite::create_set(
        &conn,
        CreateSpriteSetRequest {
            project_id: p.id.clone(),
            name: "A".into(),
            spec: serde_json::json!({}),
        },
    )
    .unwrap();
    Fixture {
        db: std::sync::Mutex::new(conn),
        set_id: set.id,
        project_dir,
        out: tempfile::tempdir().unwrap(),
    }
}

/// Store an image file + history row and return its id.
fn add_image(f: &Fixture, img: &RgbaImage) -> String {
    let conn = f.db.lock().unwrap();
    let project_id = crate::repositories::sprite_set::find_by_id(&conn, &f.set_id)
        .unwrap()
        .project_id;
    let id = uuid::Uuid::new_v4().to_string();
    let rel = format!("images/{id}.png");
    std::fs::create_dir_all(f.project_dir.path().join("images")).unwrap();
    std::fs::write(f.project_dir.path().join(&rel), ops::encode_png(img).unwrap()).unwrap();
    let row = crate::models::dto::GeneratedImageRow {
        id: id.clone(),
        project_id,
        file_path: rel,
        seed: 1,
        prompt_snapshot: "{}".into(),
        width: img.width() as i32,
        height: img.height() as i32,
        model: "m".into(),
        is_saved: 1,
        created_at: "t".into(),
    };
    crate::repositories::image::insert(&conn, &row).unwrap();
    id
}

fn plan(f: &Fixture) -> SpriteExportPlan {
    SpriteExportPlan {
        set_id: f.set_id.clone(),
        out_dir: f.out.path().to_string_lossy().into(),
        images: vec![],
        texts: vec![],
        atlas: None,
    }
}

fn read(f: &Fixture, rel: &str) -> RgbaImage {
    image::open(f.out.path().join(rel)).unwrap().to_rgba8()
}

#[test]
fn safe_join_rejects_escapes() {
    let root = Path::new("/tmp/x");
    assert!(safe_join(root, "a/b.png").is_ok());
    for bad in ["", "../a.png", "a/../b", "/abs.png", "a//b", "a\\b", "./a"] {
        assert!(safe_join(root, bad).is_err(), "{bad} should be rejected");
    }
}

#[test]
fn writes_scaled_images_layers_and_texts() {
    let f = fixture();
    let base = RgbaImage::from_pixel(16, 16, Rgba([0, 0, 0, 255]));
    let mut variant = base.clone();
    variant.put_pixel(3, 3, Rgba([255, 0, 0, 255]));
    let (base_id, var_id) = (add_image(&f, &base), add_image(&f, &variant));
    let mut cells = image::GrayImage::new(2, 2);
    cells.put_pixel(0, 0, image::Luma([255]));
    let mut mask = std::io::Cursor::new(Vec::new());
    cells.write_to(&mut mask, image::ImageFormat::Png).unwrap();
    let mask_b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, mask.into_inner());

    let mut p = plan(&f);
    p.images = vec![
        SpriteExportImage {
            image_id: base_id.clone(),
            rel_path: "sprites/base.png".into(),
            scale: 0.5,
            layer: None,
        },
        SpriteExportImage {
            image_id: var_id,
            rel_path: "sprites/diff.png".into(),
            scale: 1.0,
            layer: Some(SpriteExportLayer {
                base_image_id: base_id,
                mask_base64: mask_b64,
            }),
        },
    ];
    p.texts = vec![SpriteExportText {
        rel_path: "manifest.json".into(),
        content: "{}".into(),
    }];
    let res = export(&f.db, p).unwrap();
    assert_eq!(res.files, ["sprites/base.png", "sprites/diff.png", "manifest.json"]);
    assert_eq!(read(&f, "sprites/base.png").dimensions(), (8, 8));
    let diff = read(&f, "sprites/diff.png");
    assert_eq!(diff.get_pixel(3, 3)[0], 255);
    assert_eq!(diff.get_pixel(1, 1)[3], 0);
    assert_eq!(
        std::fs::read_to_string(f.out.path().join("manifest.json")).unwrap(),
        "{}"
    );
}

#[test]
fn atlas_trims_frames_and_writes_json_hash() {
    let f = fixture();
    let mut a = RgbaImage::new(20, 20);
    for y in 5..10 {
        for x in 4..8 {
            a.put_pixel(x, y, Rgba([1, 2, 3, 255]));
        }
    }
    let id = add_image(&f, &a);
    let mut p = plan(&f);
    p.atlas = Some(SpriteAtlasRequest {
        name: "hero".into(),
        rel_dir: "atlas".into(),
        max_size: 64,
        padding: 1,
        scale: 1.0,
        entries: vec![
            SpriteAtlasEntry {
                image_id: id.clone(),
                frame: "idle".into(),
                layer: None,
            },
            SpriteAtlasEntry {
                image_id: id,
                frame: "idle2".into(),
                layer: None,
            },
        ],
    });
    let res = export(&f.db, p).unwrap();
    assert_eq!(res.files, ["atlas/hero-0.png", "atlas/hero-0.json"]);
    let json: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(f.out.path().join("atlas/hero-0.json")).unwrap()).unwrap();
    let idle = &json["frames"]["idle"];
    assert_eq!(idle["frame"]["w"], 4);
    assert_eq!(idle["frame"]["h"], 5);
    assert_eq!(idle["trimmed"], true);
    assert_eq!(idle["spriteSourceSize"]["x"], 4);
    assert_eq!(idle["sourceSize"]["w"], 20);
    assert_eq!(json["meta"]["image"], "hero-0.png");
}

#[test]
fn rejects_bad_folders_paths_and_foreign_images() {
    let f = fixture();
    let mut p = plan(&f);
    p.out_dir = "relative/dir".into();
    assert!(matches!(export(&f.db, p), Err(AppError::Validation(_))));

    let mut p = plan(&f);
    p.texts = vec![SpriteExportText {
        rel_path: "../escape.txt".into(),
        content: "x".into(),
    }];
    assert!(matches!(export(&f.db, p), Err(AppError::Validation(_))));

    let other = {
        let conn = f.db.lock().unwrap();
        let p2 = create_test_project(&conn);
        crate::test_utils::create_test_image(&conn, &p2.id, 1).id
    };
    let mut p = plan(&f);
    p.images = vec![SpriteExportImage {
        image_id: other,
        rel_path: "a.png".into(),
        scale: 1.0,
        layer: None,
    }];
    assert!(matches!(export(&f.db, p), Err(AppError::Validation(_))));
}
