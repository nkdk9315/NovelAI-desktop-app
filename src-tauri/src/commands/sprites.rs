//! Sprite variant sets (差分制作, F13). See docs/contracts/sprite-variants.md.

use tauri::State;

use crate::models::sprite::{
    AddSpriteCandidateRequest, CreateSpriteSetRequest, ImportSpriteCandidateRequest, SaveSpriteImageRequest,
    SetSpriteCellStateRequest, SpriteCandidateDto, SpriteCellDto, SpriteExportPlan, SpriteExportResultDto,
    SpriteSetDto, UpdateSpriteSetRequest,
};
use crate::services::sprite;
use crate::state::AppState;

macro_rules! with_conn {
    ($state:expr, $conn:ident => $body:expr) => {{
        let $conn = $state.db.lock().map_err(|e| e.to_string())?;
        $body.map_err(|e| e.into())
    }};
}

#[tauri::command]
pub fn list_sprite_sets(state: State<'_, AppState>, project_id: String) -> Result<Vec<SpriteSetDto>, String> {
    with_conn!(state, conn => sprite::list_sets(&conn, &project_id))
}

#[tauri::command]
pub fn create_sprite_set(state: State<'_, AppState>, req: CreateSpriteSetRequest) -> Result<SpriteSetDto, String> {
    with_conn!(state, conn => sprite::create_set(&conn, req))
}

#[tauri::command]
pub fn update_sprite_set(state: State<'_, AppState>, req: UpdateSpriteSetRequest) -> Result<SpriteSetDto, String> {
    with_conn!(state, conn => sprite::update_set(&conn, req))
}

#[tauri::command]
pub fn delete_sprite_set(state: State<'_, AppState>, id: String) -> Result<(), String> {
    with_conn!(state, conn => sprite::delete_set(&conn, &id))
}

#[tauri::command]
pub fn duplicate_sprite_set(state: State<'_, AppState>, id: String, name: String) -> Result<SpriteSetDto, String> {
    with_conn!(state, conn => sprite::duplicate_set(&conn, &id, &name))
}

#[tauri::command]
pub fn list_sprite_cells(state: State<'_, AppState>, set_id: String) -> Result<Vec<SpriteCellDto>, String> {
    with_conn!(state, conn => sprite::list_cells(&conn, &set_id))
}

#[tauri::command]
pub fn add_sprite_candidate(
    state: State<'_, AppState>,
    req: AddSpriteCandidateRequest,
) -> Result<SpriteCandidateDto, String> {
    with_conn!(state, conn => sprite::add_candidate(&conn, req))
}

#[tauri::command]
pub fn import_sprite_candidate(
    state: State<'_, AppState>,
    req: ImportSpriteCandidateRequest,
) -> Result<SpriteCandidateDto, String> {
    sprite::import_candidate(&state.db, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn save_sprite_image(
    state: State<'_, AppState>,
    req: SaveSpriteImageRequest,
) -> Result<SpriteCandidateDto, String> {
    sprite::save_image(&state.db, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn adopt_sprite_candidate(
    state: State<'_, AppState>,
    set_id: String,
    cell_key: String,
    image_id: Option<String>,
) -> Result<(), String> {
    with_conn!(state, conn => sprite::adopt_candidate(&conn, &set_id, &cell_key, image_id.as_deref()))
}

#[tauri::command]
pub fn remove_sprite_candidate(state: State<'_, AppState>, id: String, delete_image: bool) -> Result<(), String> {
    with_conn!(state, conn => sprite::remove_candidate(&conn, &id, delete_image))
}

#[tauri::command]
pub fn set_sprite_cell_state(state: State<'_, AppState>, req: SetSpriteCellStateRequest) -> Result<(), String> {
    with_conn!(state, conn => sprite::set_cell_state(&conn, req))
}

#[tauri::command]
pub fn delete_sprite_cells(state: State<'_, AppState>, set_id: String, cell_keys: Vec<String>) -> Result<(), String> {
    with_conn!(state, conn => sprite::delete_cells(&conn, &set_id, &cell_keys))
}

/// Async so the pixel work (decode / diff / pack) does not block the main thread.
#[tauri::command]
pub async fn export_sprite_set(
    state: State<'_, AppState>,
    plan: SpriteExportPlan,
) -> Result<SpriteExportResultDto, String> {
    tokio::task::block_in_place(|| crate::services::sprite_export::export(&state.db, plan)).map_err(|e| e.into())
}
