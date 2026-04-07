mod commands;
mod db;
mod error;
mod models;
mod repositories;
mod services;
mod state;
#[cfg(test)]
mod test_utils;

use state::{AppState, SystemPromptDB};
use std::collections::HashMap;
use std::sync::Mutex;

use novelai_api::client::NovelAIClient;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("novelai-desktop.db");

            let db_path_str = db_path
                .to_str()
                .ok_or("Database path contains non-UTF-8 characters")?;
            let conn = db::init_db(db_path_str).expect("Failed to initialize database");

            // Restore API client from saved key
            let mut api_client_val: Option<NovelAIClient> = None;
            if let Ok(Some(key)) = repositories::settings::get_by_key(&conn, "api_key") {
                if let Ok(mut client) = NovelAIClient::new(Some(&key), None) {
                    client.set_track_balance(false);
                    api_client_val = Some(client);
                }
            }

            let app_state = AppState {
                db: Mutex::new(conn),
                api_client: tokio::sync::Mutex::new(api_client_val),
                system_tags: SystemPromptDB {
                    tags: Vec::new(),
                    by_category: HashMap::new(),
                },
            };
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::settings::initialize_client,
            commands::settings::get_anlas_balance,
            commands::projects::list_projects,
            commands::projects::create_project,
            commands::projects::open_project,
            commands::projects::delete_project,
            commands::images::generate_image,
            commands::images::estimate_cost,
            commands::images::save_image,
            commands::images::save_all_images,
            commands::images::delete_image,
            commands::images::get_project_images,
            commands::images::cleanup_unsaved_images,
            commands::prompt_groups::list_prompt_groups,
            commands::prompt_groups::get_prompt_group,
            commands::prompt_groups::create_prompt_group,
            commands::prompt_groups::update_prompt_group,
            commands::prompt_groups::delete_prompt_group,
            commands::genres::list_genres,
            commands::genres::create_genre,
            commands::genres::delete_genre,
            commands::vibes::list_vibes,
            commands::vibes::add_vibe,
            commands::vibes::delete_vibe,
            commands::vibes::encode_vibe,
            commands::style_presets::list_style_presets,
            commands::style_presets::create_style_preset,
            commands::style_presets::update_style_preset,
            commands::style_presets::delete_style_preset,
            commands::system_prompts::get_system_prompt_categories,
            commands::system_prompts::search_system_prompts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
