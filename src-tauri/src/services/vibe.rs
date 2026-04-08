use std::path::Path;

use novelai_api::client::NovelAIClient;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::dto::{AddVibeRequest, EncodeVibeRequest, VibeDto, VibeRow};

pub fn list_vibes(conn: &Connection) -> Result<Vec<VibeDto>, AppError> {
    let rows = crate::repositories::vibe::list_all(conn)?;
    Ok(rows.into_iter().map(VibeDto::from).collect())
}

pub fn add_vibe(
    conn: &Connection,
    app_data_dir: &Path,
    req: AddVibeRequest,
) -> Result<VibeDto, AppError> {
    let source = Path::new(&req.file_path);
    if !source.exists() {
        return Err(AppError::Validation(format!(
            "Vibe file not found: {}",
            req.file_path
        )));
    }

    // Load and parse the vibe file to extract model info
    let vibe_data = novelai_api::utils::vibe::load_vibe_file(&req.file_path)
        .map_err(|e| AppError::Validation(format!("Invalid vibe file: {e}")))?;

    // Extract model from the encodings keys
    let model = vibe_data
        .get("encodings")
        .and_then(|v| v.as_object())
        .and_then(|obj| obj.keys().next().cloned())
        .unwrap_or_else(|| "unknown".to_string());

    // Copy file to vibes directory
    let vibes_dir = app_data_dir.join("vibes");
    std::fs::create_dir_all(&vibes_dir).map_err(|e| {
        AppError::Io(format!("Failed to create vibes directory: {e}"))
    })?;

    let id = uuid::Uuid::new_v4().to_string();
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("naiv4vibe");
    let dest = vibes_dir.join(format!("{id}.{extension}"));

    std::fs::copy(source, &dest).map_err(|e| {
        AppError::Io(format!("Failed to copy vibe file: {e}"))
    })?;

    let row = VibeRow {
        id,
        name: req.name,
        file_path: dest.to_string_lossy().to_string(),
        model,
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    crate::repositories::vibe::insert(conn, &row)?;
    Ok(VibeDto::from(row))
}

pub fn delete_vibe(conn: &Connection, id: &str) -> Result<(), AppError> {
    let vibe = crate::repositories::vibe::find_by_id(conn, id)?;
    crate::repositories::vibe::delete(conn, id)?;

    // Remove the file (ignore errors if already gone)
    let path = Path::new(&vibe.file_path);
    if path.exists() {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

pub async fn encode_vibe(
    _db: &std::sync::Mutex<Connection>,
    _api_client: &tokio::sync::Mutex<Option<NovelAIClient>>,
    _app_data_dir: &Path,
    _req: EncodeVibeRequest,
) -> Result<VibeDto, AppError> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::setup_test_db;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_vibe_file(dir: &Path) -> String {
        let vibe_path = dir.join("test.naiv4vibe");
        let vibe_json = serde_json::json!({
            "encodings": {
                "v4-5full": {
                    "enc1": {
                        "encoding": "base64data...",
                        "params": {
                            "information_extracted": 0.7
                        }
                    }
                }
            }
        });
        let mut f = std::fs::File::create(&vibe_path).unwrap();
        f.write_all(vibe_json.to_string().as_bytes()).unwrap();
        vibe_path.to_string_lossy().to_string()
    }

    #[test]
    fn test_add_vibe() {
        let conn = setup_test_db();
        let tmp = TempDir::new().unwrap();
        let app_data_dir = TempDir::new().unwrap();

        let vibe_path = create_test_vibe_file(tmp.path());

        let req = AddVibeRequest {
            file_path: vibe_path,
            name: "My Vibe".to_string(),
        };
        let dto = add_vibe(&conn, app_data_dir.path(), req).unwrap();

        assert_eq!(dto.name, "My Vibe");
        assert_eq!(dto.model, "v4-5full");
        assert!(Path::new(&dto.file_path).exists());

        // Verify DB insertion
        let all = list_vibes(&conn).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, dto.id);
    }

    #[test]
    fn test_add_vibe_file_not_found() {
        let conn = setup_test_db();
        let app_data_dir = TempDir::new().unwrap();

        let req = AddVibeRequest {
            file_path: "/nonexistent/file.naiv4vibe".to_string(),
            name: "Missing".to_string(),
        };
        let err = add_vibe(&conn, app_data_dir.path(), req).unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn test_delete_vibe() {
        let conn = setup_test_db();
        let tmp = TempDir::new().unwrap();
        let app_data_dir = TempDir::new().unwrap();

        let vibe_path = create_test_vibe_file(tmp.path());
        let req = AddVibeRequest {
            file_path: vibe_path,
            name: "To Delete".to_string(),
        };
        let dto = add_vibe(&conn, app_data_dir.path(), req).unwrap();
        assert!(Path::new(&dto.file_path).exists());

        delete_vibe(&conn, &dto.id).unwrap();

        // DB should be empty
        let all = list_vibes(&conn).unwrap();
        assert!(all.is_empty());

        // File should be removed
        assert!(!Path::new(&dto.file_path).exists());
    }

    #[test]
    fn test_delete_vibe_not_found() {
        let conn = setup_test_db();
        let err = delete_vibe(&conn, "nonexistent").unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
