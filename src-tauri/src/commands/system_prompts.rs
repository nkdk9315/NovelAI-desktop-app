use tauri::State;

use crate::models::dto::{CategoryDto, ListSystemGroupTagsResponse, SystemTagDto};
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
pub fn list_system_group_tags(
    state: State<'_, AppState>,
    category: u8,
    query: Option<String>,
    offset: Option<usize>,
    limit: Option<usize>,
) -> Result<ListSystemGroupTagsResponse, String> {
    let (tags, total_count) = crate::services::system_prompt::list_system_group_tags(
        &state.system_tags,
        category,
        query.as_deref(),
        offset.unwrap_or(0),
        limit.unwrap_or(50),
    );
    Ok(ListSystemGroupTagsResponse { tags, total_count })
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
