use std::collections::HashMap;
use std::sync::Mutex;

use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

pub struct SystemTag {
    pub name: String,
    pub category: u8,
    pub post_count: u64,
    pub aliases: Vec<String>,
}

pub struct SystemPromptDB {
    pub tags: Vec<SystemTag>,
    pub by_category: HashMap<u8, Vec<usize>>,
}

pub struct AppState {
    pub db: Mutex<Connection>,
    pub api_client: Mutex<Option<NovelAIClient>>,
    pub system_tags: SystemPromptDB,
}
