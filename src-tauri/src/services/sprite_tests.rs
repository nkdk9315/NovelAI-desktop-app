use super::*;
use crate::test_utils::{create_test_image, create_test_project, setup_test_db};

fn spec() -> serde_json::Value {
    serde_json::json!({ "version": 1, "poses": [] })
}

fn new_set(conn: &Connection, project_id: &str, name: &str) -> SpriteSetDto {
    create_set(conn, CreateSpriteSetRequest { project_id: project_id.into(), name: name.into(), spec: spec() }).unwrap()
}

fn add(conn: &Connection, set_id: &str, key: &str, image_id: &str) -> SpriteCandidateDto {
    add_candidate(
        conn,
        AddSpriteCandidateRequest {
            set_id: set_id.into(),
            cell_key: key.into(),
            image_id: image_id.into(),
            parent_image_id: None,
            method: "txt2img".into(),
        },
    )
    .unwrap()
}

#[test]
fn create_validates_and_orders_sets() {
    let conn = setup_test_db();
    let p = create_test_project(&conn);
    let a = new_set(&conn, &p.id, "  Alice ");
    let b = new_set(&conn, &p.id, "Bob");
    assert_eq!(a.name, "Alice");
    assert_eq!((a.sort_order, b.sort_order), (0, 1));
    assert_eq!(a.spec["version"], 1);

    let bad = |name: &str, spec: serde_json::Value| {
        create_set(&conn, CreateSpriteSetRequest { project_id: p.id.clone(), name: name.into(), spec })
    };
    assert!(matches!(bad(" ", spec()), Err(AppError::Validation(_))));
    assert!(matches!(bad("x", serde_json::json!([1])), Err(AppError::Validation(_))));
    assert!(matches!(
        create_set(&conn, CreateSpriteSetRequest { project_id: "nope".into(), name: "x".into(), spec: spec() }),
        Err(AppError::NotFound(_))
    ));
}

#[test]
fn update_keeps_omitted_fields() {
    let conn = setup_test_db();
    let p = create_test_project(&conn);
    let a = new_set(&conn, &p.id, "Alice");
    let renamed = update_set(&conn, UpdateSpriteSetRequest { id: a.id.clone(), name: Some("A2".into()), spec: None }).unwrap();
    assert_eq!(renamed.name, "A2");
    assert_eq!(renamed.spec["version"], 1);
    let respec = update_set(
        &conn,
        UpdateSpriteSetRequest { id: a.id.clone(), name: None, spec: Some(serde_json::json!({ "version": 2 })) },
    )
    .unwrap();
    assert_eq!((respec.name.as_str(), respec.spec["version"].as_i64()), ("A2", Some(2)));
    assert_eq!(list_sets(&conn, &p.id).unwrap().len(), 1);
}

#[test]
fn candidates_adoption_and_removal() {
    let conn = setup_test_db();
    let p = create_test_project(&conn);
    let set = new_set(&conn, &p.id, "A");
    let img1 = create_test_image(&conn, &p.id, 0);
    let img2 = create_test_image(&conn, &p.id, 0);
    let c1 = add(&conn, &set.id, "p1", &img1.id);
    add(&conn, &set.id, "p1", &img2.id);

    adopt_candidate(&conn, &set.id, "p1", Some(&img1.id)).unwrap();
    let cells = list_cells(&conn, &set.id).unwrap();
    assert_eq!(cells.len(), 1);
    assert_eq!(cells[0].candidates.len(), 2);
    assert_eq!(cells[0].adopted_image_id.as_deref(), Some(img1.id.as_str()));
    assert_eq!(crate::repositories::image::find_by_id(&conn, &img1.id).unwrap().is_saved, 1);

    // Only a candidate of the same cell can be adopted
    assert!(matches!(adopt_candidate(&conn, &set.id, "p2", Some(&img1.id)), Err(AppError::Validation(_))));

    // Removing the adopted candidate clears the adoption but keeps the image unless asked
    remove_candidate(&conn, &c1.id, false).unwrap();
    let cells = list_cells(&conn, &set.id).unwrap();
    assert!(cells[0].adopted_image_id.is_none());
    assert_eq!(cells[0].candidates.len(), 1);
    assert!(crate::repositories::image::find_by_id(&conn, &img1.id).is_ok());
}

#[test]
fn candidate_image_must_belong_to_the_same_project() {
    let conn = setup_test_db();
    let p = create_test_project(&conn);
    let other = create_test_project(&conn);
    let set = new_set(&conn, &p.id, "A");
    let foreign = create_test_image(&conn, &other.id, 0);
    let req = AddSpriteCandidateRequest {
        set_id: set.id.clone(),
        cell_key: "p1".into(),
        image_id: foreign.id,
        parent_image_id: None,
        method: "txt2img".into(),
    };
    assert!(matches!(add_candidate(&conn, req), Err(AppError::Validation(_))));
    let img = create_test_image(&conn, &p.id, 0);
    let bad_method = AddSpriteCandidateRequest {
        set_id: set.id,
        cell_key: "p1".into(),
        image_id: img.id,
        parent_image_id: None,
        method: "magic".into(),
    };
    assert!(matches!(add_candidate(&conn, bad_method), Err(AppError::Validation(_))));
}

#[test]
fn cell_state_and_delete_cells() {
    let conn = setup_test_db();
    let p = create_test_project(&conn);
    let set = new_set(&conn, &p.id, "A");
    let req = |excluded: Option<bool>, note: Option<&str>| SetSpriteCellStateRequest {
        set_id: set.id.clone(),
        cell_key: "p1|a=1".into(),
        excluded,
        note: note.map(str::to_string),
    };
    set_cell_state(&conn, req(Some(true), None)).unwrap();
    set_cell_state(&conn, req(None, Some("memo"))).unwrap();
    let cells = list_cells(&conn, &set.id).unwrap();
    assert!(cells[0].excluded);
    assert_eq!(cells[0].note, "memo");
    delete_cells(&conn, &set.id, &["p1|a=1".to_string()]).unwrap();
    assert!(list_cells(&conn, &set.id).unwrap().is_empty());
}

#[test]
fn save_image_and_import_store_files_in_the_project() {
    let dir = tempfile::tempdir().unwrap();
    let conn = setup_test_db();
    let mut p = create_test_project(&conn);
    p.directory_path = dir.path().to_string_lossy().to_string();
    conn.execute("UPDATE projects SET directory_path = ?1 WHERE id = ?2", [&p.directory_path, &p.id]).unwrap();
    let set = new_set(&conn, &p.id, "A");
    let db = std::sync::Mutex::new(conn);

    let mut png = std::io::Cursor::new(Vec::new());
    image::RgbaImage::new(16, 8).write_to(&mut png, image::ImageFormat::Png).unwrap();
    let png = png.into_inner();
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &png);

    let saved = save_image(
        &db,
        SaveSpriteImageRequest {
            set_id: set.id.clone(),
            cell_key: "p1|f=1".into(),
            image_base64: b64,
            parent_image_id: None,
            method: "composite".into(),
            source_image_ids: vec!["a".into()],
        },
    )
    .unwrap();
    assert_eq!(saved.method, "composite");
    assert!(dir.path().join(&saved.file_path).exists());

    let file = dir.path().join("pick.png");
    std::fs::write(&file, &png).unwrap();
    let imported = import_candidate(
        &db,
        ImportSpriteCandidateRequest { set_id: set.id.clone(), cell_key: "p1".into(), path: file.to_string_lossy().into() },
    )
    .unwrap();
    assert_eq!(imported.method, "import");
    let conn = db.lock().unwrap();
    let img = crate::repositories::image::find_by_id(&conn, &imported.image_id).unwrap();
    assert_eq!((img.width, img.height, img.model.as_str()), (16, 8, "sprite:import"));
}
