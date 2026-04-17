use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    CreateSidebarPresetGroupInstanceRequest, ReorderSidebarPresetGroupInstancesRequest,
    SetSidebarPresetGroupActivePresetsRequest, SetSidebarPresetGroupPresetStrengthRequest,
    SidebarPresetGroupInstanceDto, SidebarPresetGroupInstanceRow,
    UpdateSidebarPresetGroupDefaultStrengthRequest, UpdateSidebarPresetGroupPairRequest,
};
use crate::repositories::sidebar_preset_group as repo;

fn row_into_dto(
    conn: &Connection,
    row: SidebarPresetGroupInstanceRow,
) -> Result<SidebarPresetGroupInstanceDto, AppError> {
    let active = repo::list_active_presets(conn, &row.id)?;
    Ok(row.into_dto(active))
}

fn validate_strength(value: f64, name: &str) -> Result<(), AppError> {
    if !(value.is_finite() && (1.0..=10.0).contains(&value)) {
        return Err(AppError::Validation(format!(
            "{name} must be in [1.0, 10.0] (got {value})"
        )));
    }
    Ok(())
}

pub fn list_by_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<SidebarPresetGroupInstanceDto>, AppError> {
    let rows = repo::list_by_project(conn, project_id)?;
    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        result.push(row_into_dto(conn, row)?);
    }
    Ok(result)
}

pub fn create(
    conn: &Connection,
    req: CreateSidebarPresetGroupInstanceRequest,
) -> Result<SidebarPresetGroupInstanceDto, AppError> {
    if req.source_character_id == req.target_character_id {
        return Err(AppError::Validation(
            "source and target characters must differ".to_string(),
        ));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let position = repo::next_position(conn, &req.project_id)?;
    let row = SidebarPresetGroupInstanceRow {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: req.project_id,
        folder_id: req.folder_id,
        source_character_id: req.source_character_id,
        target_character_id: req.target_character_id,
        position,
        default_positive_strength: 1.0,
        default_negative_strength: 1.0,
        created_at: now.clone(),
        updated_at: now,
    };
    repo::insert(conn, &row)?;
    row_into_dto(conn, row)
}

pub fn update_pair(
    conn: &Connection,
    req: UpdateSidebarPresetGroupPairRequest,
) -> Result<(), AppError> {
    if req.source_character_id == req.target_character_id {
        return Err(AppError::Validation(
            "source and target characters must differ".to_string(),
        ));
    }
    let now = chrono::Utc::now().to_rfc3339();
    repo::update_pair(
        conn,
        &req.id,
        &req.source_character_id,
        &req.target_character_id,
        &now,
    )
}

pub fn set_active_presets(
    conn: &Connection,
    req: SetSidebarPresetGroupActivePresetsRequest,
) -> Result<(), AppError> {
    repo::find_by_id(conn, &req.id)?;
    repo::diff_active_presets(conn, &req.id, &req.preset_ids)
}

pub fn update_default_strength(
    conn: &Connection,
    req: UpdateSidebarPresetGroupDefaultStrengthRequest,
) -> Result<(), AppError> {
    validate_strength(req.default_positive_strength, "default_positive_strength")?;
    validate_strength(req.default_negative_strength, "default_negative_strength")?;
    let now = chrono::Utc::now().to_rfc3339();
    repo::update_default_strength(
        conn,
        &req.id,
        req.default_positive_strength,
        req.default_negative_strength,
        &now,
    )
}

pub fn set_preset_strength(
    conn: &Connection,
    req: SetSidebarPresetGroupPresetStrengthRequest,
) -> Result<(), AppError> {
    if let Some(v) = req.positive_strength {
        validate_strength(v, "positive_strength")?;
    }
    if let Some(v) = req.negative_strength {
        validate_strength(v, "negative_strength")?;
    }
    repo::update_preset_strength(
        conn,
        &req.instance_id,
        &req.preset_id,
        req.positive_strength,
        req.negative_strength,
    )
}

pub fn delete(conn: &Connection, id: &str) -> Result<(), AppError> {
    repo::delete(conn, id)
}

pub fn reorder(
    conn: &mut Connection,
    req: ReorderSidebarPresetGroupInstancesRequest,
) -> Result<(), AppError> {
    for id in &req.ordered_ids {
        let row = repo::find_by_id(conn, id)?;
        if row.project_id != req.project_id {
            return Err(AppError::Validation(format!(
                "instance {id} does not belong to project {}",
                req.project_id
            )));
        }
    }

    let tx = conn.transaction()?;
    for (idx, id) in req.ordered_ids.iter().enumerate() {
        repo::set_position(&tx, id, idx as i32)?;
    }
    tx.commit()?;
    Ok(())
}
