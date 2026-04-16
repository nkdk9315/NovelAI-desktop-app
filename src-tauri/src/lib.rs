mod commands;
mod db;
mod error;
mod models;
mod repositories;
mod services;
mod state;
#[cfg(test)]
mod test_utils;

use state::AppState;
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
            let mut conn = db::init_db(db_path_str).expect("Failed to initialize database");

            // Seed the tag database on first run (migration 013).
            // Idempotent: skips if the `tags` table already has rows.
            let resources_dir = app
                .path()
                .resource_dir()
                .expect("Failed to resolve resource dir")
                .join("resources");
            match services::tag_seed::seed_if_empty(&mut conn, &resources_dir) {
                Ok(Some(stats)) => eprintln!(
                    "tag_seed: inserted {} tags, {} groups, {} members",
                    stats.tags, stats.groups, stats.members
                ),
                Ok(None) => {}
                Err(e) => {
                    return Err(format!("tag_seed failed: {e:?}").into());
                }
            }

            // Restore API client from saved key
            let mut api_client_val: Option<NovelAIClient> = None;
            if let Ok(Some(key)) = repositories::settings::get_by_key(&conn, "api_key") {
                if let Ok(mut client) = NovelAIClient::new(Some(&key), None) {
                    client.set_track_balance(false);
                    api_client_val = Some(client);
                }
            }

            // Load system prompt tags from bundled CSV
            let system_tags = {
                let csv_path = app
                    .path()
                    .resource_dir()
                    .expect("Failed to resolve resource dir")
                    .join("resources")
                    .join("danbooru_tags.csv");
                if csv_path.exists() {
                    let file = std::fs::File::open(&csv_path)
                        .expect("Failed to open danbooru_tags.csv");
                    let reader = std::io::BufReader::new(file);
                    services::system_prompt::load_system_prompt_db(reader)
                } else {
                    eprintln!("Warning: danbooru_tags.csv not found at {:?}", csv_path);
                    state::SystemPromptDB {
                        tags: Vec::new(),
                        by_category: std::collections::HashMap::new(),
                    }
                }
            };

            // Seed system prompt groups on first launch
            services::system_prompt::seed_system_prompt_groups(&conn)
                .expect("Failed to seed system prompt groups");

            let app_state = AppState {
                db: Mutex::new(conn),
                api_client: tokio::sync::Mutex::new(api_client_val),
                system_tags,
                app_data_dir: data_dir,
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
            commands::projects::update_project,
            commands::projects::update_project_thumbnail,
            commands::projects::get_default_project_dir,
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
            commands::prompt_groups::update_prompt_group_thumbnail,
            commands::prompt_groups::delete_prompt_group,
            commands::prompt_groups::list_prompt_group_default_genres,
            commands::prompt_groups::set_prompt_group_default_genres,
            commands::genres::list_genres,
            commands::genres::create_genre,
            commands::genres::update_genre,
            commands::genres::delete_genre,
            commands::vibes::list_vibes,
            commands::vibes::add_vibe,
            commands::vibes::delete_vibe,
            commands::vibes::encode_vibe,
            commands::vibes::update_vibe_name,
            commands::vibes::update_vibe_thumbnail,
            commands::vibes::clear_vibe_thumbnail,
            commands::vibes::toggle_vibe_favorite,
            commands::vibes::export_vibe,
            commands::vibes::add_vibe_to_project,
            commands::vibes::remove_vibe_from_project,
            commands::vibes::set_vibe_visibility,
            commands::vibes::list_project_vibes,
            commands::vibes::list_project_vibes_all,
            commands::style_presets::list_style_presets,
            commands::style_presets::create_style_preset,
            commands::style_presets::update_style_preset,
            commands::style_presets::delete_style_preset,
            commands::style_presets::toggle_preset_favorite,
            commands::style_presets::update_preset_thumbnail,
            commands::style_presets::clear_preset_thumbnail,
            commands::system_prompts::get_system_prompt_categories,
            commands::system_prompts::search_system_prompts,
            commands::system_prompts::get_random_artist_tags,
            commands::system_prompts::list_system_group_tags,
            commands::system_group_settings::get_system_group_genre_defaults,
            commands::system_group_settings::set_system_group_genre_defaults,
            commands::system_group_settings::list_default_system_groups_for_genre,
            commands::tags::search_tags,
            commands::tags::search_tags_with_groups,
            commands::tags::list_tag_group_roots,
            commands::tags::list_tag_group_children,
            commands::tags::list_tag_group_tags,
            commands::tags::list_unclassified_character_tags,
            commands::tags::create_user_tag_group,
            commands::tags::rename_tag_group,
            commands::tags::delete_tag_group,
            commands::tags::move_tag_group,
            commands::tags::add_tags_to_group,
            commands::tags::remove_tags_from_group,
            commands::tags::list_favorite_tag_group_roots,
            commands::tags::list_favorite_tag_group_children,
            commands::tags::toggle_tag_group_favorite,
            commands::tags::count_tag_members_per_group,
            commands::tags::count_favorite_descendants_per_group,
            commands::tags::get_tag_group,
            commands::tags::list_orphan_tags_by_category,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
