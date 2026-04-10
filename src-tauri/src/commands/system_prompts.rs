use tauri::State;

use crate::models::dto::{CategoryDto, SystemTagDto};
use crate::state::AppState;

#[tauri::command]
pub fn get_system_prompt_categories(
    state: State<'_, AppState>,
) -> Result<Vec<CategoryDto>, String> {
    Ok(crate::services::system_prompt::get_categories(&state.system_tags))
}

#[tauri::command]
pub fn search_system_prompts(
    state: State<'_, AppState>,
    query: String,
    category: Option<u8>,
    limit: Option<usize>,
) -> Result<Vec<SystemTagDto>, String> {
    Ok(crate::services::system_prompt::search_system_prompts(
        &state.system_tags,
        &query,
        category,
        limit.unwrap_or(50),
    ))
}

#[tauri::command]
pub fn get_random_artist_tags(
    state: State<'_, AppState>,
    count: usize,
) -> Result<Vec<SystemTagDto>, String> {
    Ok(crate::services::system_prompt::get_random_tags(
        &state.system_tags,
        1, // category 1 = artists
        count,
    ))
}
