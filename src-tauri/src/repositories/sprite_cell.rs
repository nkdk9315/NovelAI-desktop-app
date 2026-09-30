//! Cells (adopted image / excluded / note) and candidates of a sprite set.

use rusqlite::{Connection, OptionalExtension, Row};

use crate::error::AppError;
use crate::models::sprite::{NewSpriteCandidate, SpriteCandidateRow, SpriteCellRow};

fn map_cell(row: &Row) -> rusqlite::Result<SpriteCellRow> {
    Ok(SpriteCellRow {
        set_id: row.get(0)?,
        cell_key: row.get(1)?,
        adopted_image_id: row.get(2)?,
        excluded: row.get::<_, i64>(3)? != 0,
        note: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

/// Candidate columns with their image's file / seed, as a macro for `concat!` (no runtime formatting).
macro_rules! candidate_select {
    () => {
        "SELECT c.id, c.set_id, c.cell_key, c.image_id, c.parent_image_id, c.method, \
         c.created_at, i.file_path, i.seed FROM sprite_candidates c JOIN generated_images i ON i.id = c.image_id"
    };
}

fn map_candidate(row: &Row) -> rusqlite::Result<SpriteCandidateRow> {
    Ok(SpriteCandidateRow {
        id: row.get(0)?,
        set_id: row.get(1)?,
        cell_key: row.get(2)?,
        image_id: row.get(3)?,
        parent_image_id: row.get(4)?,
        method: row.get(5)?,
        created_at: row.get(6)?,
        file_path: row.get(7)?,
        seed: row.get(8)?,
    })
}

pub fn list_cells(conn: &Connection, set_id: &str) -> Result<Vec<SpriteCellRow>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT set_id, cell_key, adopted_image_id, excluded, note, updated_at FROM sprite_cells WHERE set_id = ?1",
    )?;
    let rows = stmt.query_map([set_id], map_cell)?.collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn find_cell(conn: &Connection, set_id: &str, cell_key: &str) -> Result<Option<SpriteCellRow>, AppError> {
    Ok(conn
        .query_row(
            "SELECT set_id, cell_key, adopted_image_id, excluded, note, updated_at FROM sprite_cells \
             WHERE set_id = ?1 AND cell_key = ?2",
            [set_id, cell_key],
            map_cell,
        )
        .optional()?)
}

pub fn upsert_cell(conn: &Connection, row: &SpriteCellRow) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO sprite_cells (set_id, cell_key, adopted_image_id, excluded, note, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6) \
         ON CONFLICT(set_id, cell_key) DO UPDATE SET adopted_image_id = ?3, excluded = ?4, note = ?5, updated_at = ?6",
        rusqlite::params![
            row.set_id,
            row.cell_key,
            row.adopted_image_id,
            row.excluded as i64,
            row.note,
            row.updated_at
        ],
    )?;
    Ok(())
}

pub fn delete_cells(conn: &Connection, set_id: &str, cell_keys: &[String]) -> Result<(), AppError> {
    for key in cell_keys {
        conn.execute(
            "DELETE FROM sprite_cells WHERE set_id = ?1 AND cell_key = ?2",
            [set_id, key],
        )?;
        conn.execute(
            "DELETE FROM sprite_candidates WHERE set_id = ?1 AND cell_key = ?2",
            [set_id, key],
        )?;
    }
    Ok(())
}

pub fn list_candidates(conn: &Connection, set_id: &str) -> Result<Vec<SpriteCandidateRow>, AppError> {
    let mut stmt = conn.prepare(concat!(candidate_select!(), " WHERE c.set_id = ?1 ORDER BY c.created_at"))?;
    let rows = stmt
        .query_map([set_id], map_candidate)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn find_candidate(conn: &Connection, id: &str) -> Result<SpriteCandidateRow, AppError> {
    conn.query_row(concat!(candidate_select!(), " WHERE c.id = ?1"), [id], map_candidate)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("sprite candidate {id}")),
            _ => e.into(),
        })
}

pub fn insert_candidate(conn: &Connection, c: &NewSpriteCandidate) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO sprite_candidates (id, set_id, cell_key, image_id, parent_image_id, method, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            c.id,
            c.set_id,
            c.cell_key,
            c.image_id,
            c.parent_image_id,
            c.method,
            c.created_at
        ],
    )?;
    Ok(())
}

pub fn delete_candidate(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM sprite_candidates WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::sprite::SpriteSetRow;
    use crate::test_utils::{create_test_image, create_test_project, setup_test_db};

    fn setup() -> (Connection, String, String) {
        let conn = setup_test_db();
        let p = create_test_project(&conn);
        let set = SpriteSetRow {
            id: "set-1".into(),
            project_id: p.id.clone(),
            name: "S".into(),
            spec: "{}".into(),
            sort_order: 0,
            created_at: "t".into(),
            updated_at: "t".into(),
        };
        crate::repositories::sprite_set::insert(&conn, &set).unwrap();
        (conn, p.id, set.id)
    }

    fn cell(set_id: &str, key: &str, adopted: Option<String>) -> SpriteCellRow {
        SpriteCellRow {
            set_id: set_id.into(),
            cell_key: key.into(),
            adopted_image_id: adopted,
            excluded: false,
            note: String::new(),
            updated_at: "t".into(),
        }
    }

    #[test]
    fn upsert_and_find_cell() {
        let (conn, pid, sid) = setup();
        let img = create_test_image(&conn, &pid, 0);
        upsert_cell(&conn, &cell(&sid, "p1", Some(img.id.clone()))).unwrap();
        let mut c = cell(&sid, "p1", Some(img.id.clone()));
        c.excluded = true;
        c.note = "memo".into();
        upsert_cell(&conn, &c).unwrap();
        let got = find_cell(&conn, &sid, "p1").unwrap().unwrap();
        assert!(got.excluded);
        assert_eq!(got.note, "memo");
        assert_eq!(list_cells(&conn, &sid).unwrap().len(), 1);
        assert!(find_cell(&conn, &sid, "p2").unwrap().is_none());
    }

    #[test]
    fn candidates_join_image_and_follow_image_deletion() {
        let (conn, pid, sid) = setup();
        let img = create_test_image(&conn, &pid, 0);
        let parent = create_test_image(&conn, &pid, 0);
        insert_candidate(
            &conn,
            &NewSpriteCandidate {
                id: "c1",
                set_id: &sid,
                cell_key: "p1|a=1",
                image_id: &img.id,
                parent_image_id: Some(&parent.id),
                method: "inpaint",
                created_at: "t",
            },
        )
        .unwrap();
        upsert_cell(&conn, &cell(&sid, "p1|a=1", Some(img.id.clone()))).unwrap();
        let got = find_candidate(&conn, "c1").unwrap();
        assert_eq!(got.file_path, img.file_path);
        assert_eq!(got.parent_image_id.as_deref(), Some(parent.id.as_str()));

        // Deleting the parent keeps the candidate; deleting the image removes it and clears the adoption
        crate::repositories::image::delete(&conn, &parent.id).unwrap();
        assert!(find_candidate(&conn, "c1").unwrap().parent_image_id.is_none());
        crate::repositories::image::delete(&conn, &img.id).unwrap();
        assert!(list_candidates(&conn, &sid).unwrap().is_empty());
        assert!(find_cell(&conn, &sid, "p1|a=1")
            .unwrap()
            .unwrap()
            .adopted_image_id
            .is_none());
    }

    #[test]
    fn delete_cells_removes_cells_and_candidates() {
        let (conn, pid, sid) = setup();
        let img = create_test_image(&conn, &pid, 0);
        insert_candidate(
            &conn,
            &NewSpriteCandidate {
                id: "c1",
                set_id: &sid,
                cell_key: "k",
                image_id: &img.id,
                parent_image_id: None,
                method: "txt2img",
                created_at: "t",
            },
        )
        .unwrap();
        upsert_cell(&conn, &cell(&sid, "k", None)).unwrap();
        delete_cells(&conn, &sid, &["k".to_string()]).unwrap();
        assert!(list_cells(&conn, &sid).unwrap().is_empty());
        assert!(list_candidates(&conn, &sid).unwrap().is_empty());
    }
}
