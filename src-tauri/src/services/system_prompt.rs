use crate::models::dto::{CategoryDto, SystemTagDto};
use crate::state::SystemPromptDB;

pub fn get_categories(_db: &SystemPromptDB) -> Vec<CategoryDto> {
    todo!()
}

pub fn search_system_prompts(
    _db: &SystemPromptDB,
    _query: &str,
    _category: Option<u8>,
    _limit: usize,
) -> Vec<SystemTagDto> {
    todo!()
}
