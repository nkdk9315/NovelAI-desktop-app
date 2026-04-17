use tauri::State;

use crate::models::dto::{
    CreateSidebarPresetGroupInstanceRequest, ReorderSidebarPresetGroupInstancesRequest,
    SetSidebarPresetGroupActivePresetsRequest, SetSidebarPresetGroupPresetStrengthRequest,
    SidebarPresetGroupInstanceDto, UpdateSidebarPresetGroupDefaultStrengthRequest,
    UpdateSidebarPresetGroupPairRequest,
};
use crate::state::AppState;

#[tauri::command]
pub fn list_sidebar_preset_group_instances(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<SidebarPresetGroupInstanceDto>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::list_by_project(&conn, &project_id)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn create_sidebar_preset_group_instance(
    state: State<'_, AppState>,
    req: CreateSidebarPresetGroupInstanceRequest,
) -> Result<SidebarPresetGroupInstanceDto, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::create(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_sidebar_preset_group_pair(
    state: State<'_, AppState>,
    req: UpdateSidebarPresetGroupPairRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::update_pair(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn set_sidebar_preset_group_active_presets(
    state: State<'_, AppState>,
    req: SetSidebarPresetGroupActivePresetsRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::set_active_presets(&conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_sidebar_preset_group_instance(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::delete(&conn, &id).map_err(|e| e.into())
}

#[tauri::command]
pub fn reorder_sidebar_preset_group_instances(
    state: State<'_, AppState>,
    req: ReorderSidebarPresetGroupInstancesRequest,
) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::reorder(&mut conn, req).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_sidebar_preset_group_default_strength(
    state: State<'_, AppState>,
    req: UpdateSidebarPresetGroupDefaultStrengthRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::update_default_strength(&conn, req)
        .map_err(|e| e.into())
}

#[tauri::command]
pub fn set_sidebar_preset_group_preset_strength(
    state: State<'_, AppState>,
    req: SetSidebarPresetGroupPresetStrengthRequest,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    crate::services::sidebar_preset_group::set_preset_strength(&conn, req)
        .map_err(|e| e.into())
}
