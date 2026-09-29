//! Sprite variant sets (差分制作, F13): sets, cells and candidates.
//! See docs/contracts/sprite-variants.md.

use std::collections::BTreeMap;

use rusqlite::Connection;

use crate::error::AppError;
use crate::models::sprite::{
    AddSpriteCandidateRequest, CreateSpriteSetRequest, ImportSpriteCandidateRequest, NewSpriteCandidate,
    SaveSpriteImageRequest, SetSpriteCellStateRequest, SpriteCandidateDto, SpriteCellDto,
    SpriteCellRow, SpriteSetDto, SpriteSetRow, UpdateSpriteSetRequest,
};
use crate::services::image_output::{self, OutputMeta};

type Db = std::sync::Mutex<Connection>;

const METHODS: &[&str] = &["txt2img", "inpaint", "composite", "import", "edit"];
const MAX_SPEC_BYTES: usize = 8 * 1024 * 1024;
const MAX_NAME_CHARS: usize = 100;
const MAX_KEY_CHARS: usize = 2000;

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn lock(db: &Db) -> Result<std::sync::MutexGuard<'_, Connection>, AppError> {
    db.lock().map_err(|e| AppError::Database(e.to_string()))
}

fn validate_name(name: &str) -> Result<String, AppError> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > MAX_NAME_CHARS {
        return Err(AppError::Validation(format!("sprite set name must be 1-{MAX_NAME_CHARS} characters")));
    }
    Ok(name.to_string())
}

fn spec_text(spec: &serde_json::Value) -> Result<String, AppError> {
    if !spec.is_object() {
        return Err(AppError::Validation("sprite spec must be an object".to_string()));
    }
    let text = spec.to_string();
    if text.len() > MAX_SPEC_BYTES {
        return Err(AppError::Validation("sprite spec is too large".to_string()));
    }
    Ok(text)
}

fn validate_key(key: &str) -> Result<(), AppError> {
    if key.is_empty() || key.chars().count() > MAX_KEY_CHARS {
        return Err(AppError::Validation("invalid cell key".to_string()));
    }
    Ok(())
}

fn validate_method(method: &str) -> Result<(), AppError> {
    if !METHODS.contains(&method) {
        return Err(AppError::Validation(format!("invalid candidate method: {method}")));
    }
    Ok(())
}

// ---- Sets ----

pub fn list_sets(conn: &Connection, project_id: &str) -> Result<Vec<SpriteSetDto>, AppError> {
    Ok(crate::repositories::sprite_set::list_by_project(conn, project_id)?
        .into_iter()
        .map(Into::into)
        .collect())
}

pub fn create_set(conn: &Connection, req: CreateSpriteSetRequest) -> Result<SpriteSetDto, AppError> {
    crate::repositories::project::find_by_id(conn, &req.project_id)?;
    let ts = now();
    let row = SpriteSetRow {
        id: uuid::Uuid::new_v4().to_string(),
        name: validate_name(&req.name)?,
        spec: spec_text(&req.spec)?,
        sort_order: crate::repositories::sprite_set::next_sort_order(conn, &req.project_id)?,
        project_id: req.project_id,
        created_at: ts.clone(),
        updated_at: ts,
    };
    crate::repositories::sprite_set::insert(conn, &row)?;
    Ok(row.into())
}

pub fn update_set(conn: &Connection, req: UpdateSpriteSetRequest) -> Result<SpriteSetDto, AppError> {
    let current = crate::repositories::sprite_set::find_by_id(conn, &req.id)?;
    let name = match req.name {
        Some(n) => validate_name(&n)?,
        None => current.name,
    };
    let spec = match req.spec {
        Some(s) => spec_text(&s)?,
        None => current.spec,
    };
    crate::repositories::sprite_set::update(conn, &req.id, &name, &spec, &now())?;
    Ok(crate::repositories::sprite_set::find_by_id(conn, &req.id)?.into())
}

/// Delete a set with its cells / candidates. The images stay in the project history.
pub fn delete_set(conn: &Connection, id: &str) -> Result<(), AppError> {
    crate::repositories::sprite_set::delete(conn, id)
}

/// Copy a set's definition (not its images) under a new name.
pub fn duplicate_set(conn: &Connection, id: &str, name: &str) -> Result<SpriteSetDto, AppError> {
    let src = crate::repositories::sprite_set::find_by_id(conn, id)?;
    let spec: serde_json::Value = serde_json::from_str(&src.spec)
        .map_err(|e| AppError::Validation(format!("broken sprite spec: {e}")))?;
    create_set(conn, CreateSpriteSetRequest { project_id: src.project_id, name: name.to_string(), spec })
}

// ---- Cells ----

pub fn list_cells(conn: &Connection, set_id: &str) -> Result<Vec<SpriteCellDto>, AppError> {
    crate::repositories::sprite_set::find_by_id(conn, set_id)?;
    let mut cells: BTreeMap<String, SpriteCellDto> = BTreeMap::new();
    let blank = |key: &str| SpriteCellDto {
        cell_key: key.to_string(),
        adopted_image_id: None,
        excluded: false,
        note: String::new(),
        candidates: Vec::new(),
    };
    for row in crate::repositories::sprite_cell::list_cells(conn, set_id)? {
        let c = cells.entry(row.cell_key.clone()).or_insert_with(|| blank(&row.cell_key));
        c.adopted_image_id = row.adopted_image_id;
        c.excluded = row.excluded;
        c.note = row.note;
    }
    for cand in crate::repositories::sprite_cell::list_candidates(conn, set_id)? {
        cells
            .entry(cand.cell_key.clone())
            .or_insert_with(|| blank(&cand.cell_key))
            .candidates
            .push(cand.into());
    }
    Ok(cells.into_values().collect())
}

fn cell_or_default(conn: &Connection, set_id: &str, cell_key: &str) -> Result<SpriteCellRow, AppError> {
    Ok(crate::repositories::sprite_cell::find_cell(conn, set_id, cell_key)?.unwrap_or(SpriteCellRow {
        set_id: set_id.to_string(),
        cell_key: cell_key.to_string(),
        adopted_image_id: None,
        excluded: false,
        note: String::new(),
        updated_at: String::new(),
    }))
}

pub fn set_cell_state(conn: &Connection, req: SetSpriteCellStateRequest) -> Result<(), AppError> {
    validate_key(&req.cell_key)?;
    crate::repositories::sprite_set::find_by_id(conn, &req.set_id)?;
    let mut row = cell_or_default(conn, &req.set_id, &req.cell_key)?;
    if let Some(e) = req.excluded {
        row.excluded = e;
    }
    if let Some(n) = req.note {
        row.note = n;
    }
    row.updated_at = now();
    crate::repositories::sprite_cell::upsert_cell(conn, &row)
}

/// Adopt one of the cell's candidates (None clears the adoption). The adopted image is marked saved.
pub fn adopt_candidate(conn: &Connection, set_id: &str, cell_key: &str, image_id: Option<&str>) -> Result<(), AppError> {
    validate_key(cell_key)?;
    crate::repositories::sprite_set::find_by_id(conn, set_id)?;
    if let Some(img) = image_id {
        let is_candidate = crate::repositories::sprite_cell::list_candidates(conn, set_id)?
            .iter()
            .any(|c| c.cell_key == cell_key && c.image_id == img);
        if !is_candidate {
            return Err(AppError::Validation("the image is not a candidate of this cell".to_string()));
        }
        crate::repositories::image::update_is_saved(conn, img)?;
    }
    let mut row = cell_or_default(conn, set_id, cell_key)?;
    row.adopted_image_id = image_id.map(str::to_string);
    row.updated_at = now();
    crate::repositories::sprite_cell::upsert_cell(conn, &row)
}

pub fn delete_cells(conn: &Connection, set_id: &str, cell_keys: &[String]) -> Result<(), AppError> {
    crate::repositories::sprite_set::find_by_id(conn, set_id)?;
    crate::repositories::sprite_cell::delete_cells(conn, set_id, cell_keys)
}

// ---- Candidates ----

pub fn add_candidate(conn: &Connection, req: AddSpriteCandidateRequest) -> Result<SpriteCandidateDto, AppError> {
    validate_key(&req.cell_key)?;
    validate_method(&req.method)?;
    let set = crate::repositories::sprite_set::find_by_id(conn, &req.set_id)?;
    let image = crate::repositories::image::find_by_id(conn, &req.image_id)?;
    if image.project_id != set.project_id {
        return Err(AppError::Validation("the image belongs to another project".to_string()));
    }
    let id = uuid::Uuid::new_v4().to_string();
    crate::repositories::sprite_cell::insert_candidate(
        conn,
        &NewSpriteCandidate {
            id: &id,
            set_id: &req.set_id,
            cell_key: &req.cell_key,
            image_id: &req.image_id,
            parent_image_id: req.parent_image_id.as_deref(),
            method: &req.method,
            created_at: &now(),
        },
    )?;
    Ok(crate::repositories::sprite_cell::find_candidate(conn, &id)?.into())
}

/// Remove a candidate. With `delete_image` the image (file and history row) goes too.
pub fn remove_candidate(conn: &Connection, id: &str, delete_image: bool) -> Result<(), AppError> {
    let cand = crate::repositories::sprite_cell::find_candidate(conn, id)?;
    crate::repositories::sprite_cell::delete_candidate(conn, id)?;
    if let Some(mut cell) = crate::repositories::sprite_cell::find_cell(conn, &cand.set_id, &cand.cell_key)? {
        if cell.adopted_image_id.as_deref() == Some(cand.image_id.as_str()) {
            cell.adopted_image_id = None;
            cell.updated_at = now();
            crate::repositories::sprite_cell::upsert_cell(conn, &cell)?;
        }
    }
    if delete_image {
        crate::services::image::delete_image(conn, &cand.image_id)?;
    }
    Ok(())
}

fn sprite_snapshot(action: &str, set_id: &str, cell_key: &str, extra: serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "action": { "type": action },
        "sprite": { "setId": set_id, "cellKey": cell_key },
        "extra": extra,
    })
}

/// Store bytes as a history image and add it as a candidate.
fn store_candidate(
    db: &Db,
    set_id: &str,
    cell_key: &str,
    bytes: Vec<u8>,
    method: &str,
    parent_image_id: Option<&str>,
    extra: serde_json::Value,
) -> Result<SpriteCandidateDto, AppError> {
    validate_key(cell_key)?;
    validate_method(method)?;
    let project_id = crate::repositories::sprite_set::find_by_id(&*lock(db)?, set_id)?.project_id;
    let project_dir = image_output::project_dir(db, &project_id)?;
    let (w, h, _) = novelai_api::utils::image::get_image_dimensions(
        &novelai_api::schemas::ImageInput::Bytes(bytes.clone()),
    )
    .map_err(|e| AppError::Validation(e.to_string()))?;
    let (_, ext) = image_output::detect_format(&bytes);
    let ext = if ext == "bin" { "png" } else { ext };
    let meta = OutputMeta {
        seed: 0,
        width: w,
        height: h,
        model: format!("sprite:{method}"),
        prompt_snapshot: sprite_snapshot(method, set_id, cell_key, extra),
    };
    let stored = image_output::persist_output_image(db, &project_id, &project_dir, &bytes, ext, meta)?;
    add_candidate(
        &*lock(db)?,
        AddSpriteCandidateRequest {
            set_id: set_id.to_string(),
            cell_key: cell_key.to_string(),
            image_id: stored.id,
            parent_image_id: parent_image_id.map(str::to_string),
            method: method.to_string(),
        },
    )
}

/// Copy a user-picked image file into the project as a candidate.
pub fn import_candidate(db: &Db, req: ImportSpriteCandidateRequest) -> Result<SpriteCandidateDto, AppError> {
    let bytes = image_output::read_image_file(&req.path)?;
    let file_name = std::path::Path::new(&req.path).file_name().and_then(|f| f.to_str()).unwrap_or("");
    store_candidate(db, &req.set_id, &req.cell_key, bytes, "import", None, serde_json::json!({ "fileName": file_name }))
}

/// Save an image made in the app (composite / hand edit) as a candidate.
pub fn save_image(db: &Db, req: SaveSpriteImageRequest) -> Result<SpriteCandidateDto, AppError> {
    let bytes = image_output::decode_base64(&req.image_base64)?;
    let extra = serde_json::json!({ "sourceImageIds": req.source_image_ids });
    store_candidate(db, &req.set_id, &req.cell_key, bytes, &req.method, req.parent_image_id.as_deref(), extra)
}

#[cfg(test)]
#[path = "sprite_tests.rs"]
mod tests;
