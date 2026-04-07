use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{CreatePromptGroupRequest, PromptGroupDto, UpdatePromptGroupRequest};

pub fn list_prompt_groups(
    _conn: &Connection,
    _genre_id: Option<&str>,
    _usage_type: Option<&str>,
    _search: Option<&str>,
) -> Result<Vec<PromptGroupDto>, AppError> {
    todo!()
}

pub fn get_prompt_group(_conn: &Connection, _id: &str) -> Result<PromptGroupDto, AppError> {
    todo!()
}

pub fn create_prompt_group(
    _conn: &Connection,
    _req: CreatePromptGroupRequest,
) -> Result<PromptGroupDto, AppError> {
    todo!()
}

pub fn update_prompt_group(
    _conn: &Connection,
    _req: UpdatePromptGroupRequest,
) -> Result<(), AppError> {
    todo!()
}

pub fn delete_prompt_group(_conn: &Connection, _id: &str) -> Result<(), AppError> {
    todo!()
}
