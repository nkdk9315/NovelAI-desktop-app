use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{
    CreatePromptPresetRequest, PresetCharacterSlotDto, PromptPresetDto, PromptPresetRow,
    UpdatePromptPresetRequest,
};
use crate::repositories::prompt_preset as repo;

type SlotTuple = (String, i32, String, Option<String>, String, String, String);

fn row_into_dto(conn: &Connection, row: PromptPresetRow) -> Result<PromptPresetDto, AppError> {
    let slot_rows = repo::list_slots(conn, &row.id)?;
    let slot_dtos: Vec<PresetCharacterSlotDto> = slot_rows.into_iter().map(Into::into).collect();
    Ok(row.into_dto(slot_dtos))
}

pub fn list_prompt_presets(
    conn: &Connection,
    search: Option<&str>,
) -> Result<Vec<PromptPresetDto>, AppError> {
    let rows = repo::list(conn, search)?;
    let mut result = Vec::with_capacity(rows.len());
    for row in rows {
        result.push(row_into_dto(conn, row)?);
    }
    Ok(result)
}

pub fn get_prompt_preset(conn: &Connection, id: &str) -> Result<PromptPresetDto, AppError> {
    let row = repo::find_by_id(conn, id)?;
    row_into_dto(conn, row)
}

fn build_slot_tuples(slots: &[crate::models::dto::PresetSlotInput]) -> Vec<SlotTuple> {
    slots
        .iter()
        .enumerate()
        .map(|(i, s)| {
            (
                uuid::Uuid::new_v4().to_string(),
                i as i32,
                s.slot_label.clone(),
                s.genre_id.clone(),
                s.positive_prompt.clone(),
                s.negative_prompt.clone().unwrap_or_default(),
                s.role.clone(),
            )
        })
        .collect()
}

pub fn create_prompt_preset(
    conn: &Connection,
    req: CreatePromptPresetRequest,
) -> Result<PromptPresetDto, AppError> {
    if req.slots.len() < 2 {
        return Err(AppError::Validation(
            "preset must have at least 2 character slots".to_string(),
        ));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();

    let row = PromptPresetRow {
        id: id.clone(),
        name: req.name,
        folder_id: req.folder_id,
        created_at: now.clone(),
        updated_at: now,
    };
    repo::insert(conn, &row)?;

    let slot_tuples = build_slot_tuples(&req.slots);
    repo::replace_slots(conn, &id, &slot_tuples)?;

    get_prompt_preset(conn, &id)
}

pub fn update_prompt_preset(
    conn: &Connection,
    req: UpdatePromptPresetRequest,
) -> Result<(), AppError> {
    let mut existing = repo::find_by_id(conn, &req.id)?;

    if let Some(name) = req.name {
        existing.name = name;
    }
    if let Some(folder_id) = req.folder_id {
        existing.folder_id = folder_id;
    }

    existing.updated_at = chrono::Utc::now().to_rfc3339();
    repo::update(conn, &existing)?;

    if let Some(slots) = req.slots {
        if slots.len() < 2 {
            return Err(AppError::Validation(
                "preset must have at least 2 character slots".to_string(),
            ));
        }
        let slot_tuples = build_slot_tuples(&slots);
        repo::replace_slots(conn, &req.id, &slot_tuples)?;
    }

    Ok(())
}

pub fn delete_prompt_preset(conn: &Connection, id: &str) -> Result<(), AppError> {
    repo::delete(conn, id)
}
