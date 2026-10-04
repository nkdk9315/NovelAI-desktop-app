use super::*;
use crate::test_utils::setup_test_db;

fn db() -> Connection {
    let conn = setup_test_db();
    conn.execute_batch(
        "INSERT INTO tags (id, name, csv_category) VALUES
            (1, 'long_hair', 0), (2, 'school_uniform', 0), (3, 'umbrella', 0),
            (4, 'some_artist', 1), (5, 'commentary', 5);
         INSERT INTO tag_aliases (tag_id, alias) VALUES (2, 'seifuku');",
    )
    .unwrap();
    conn
}

#[test]
fn test_parses_plain_object() {
    let raw = r#"{"name":"雨の日","items":[{"name":"雨宿り","tags":"umbrella, School Uniform","text":"ignored"}]}"#;
    let res = parse_response(&db(), raw, AiPromptStyle::Tags).unwrap();
    assert_eq!(res.name, "雨の日");
    assert_eq!(res.items.len(), 1);
    assert_eq!(res.items[0].name, "雨宿り");
    assert_eq!(res.items[0].tags, vec!["umbrella", "school_uniform"]);
    assert_eq!(res.items[0].text, "");
    assert!(res.items[0].unknown_tags.is_empty());
}

#[test]
fn test_ignores_fences_prose_and_think() {
    let raw = "<think>{\"not\": \"this\"}</think>\nSure! Here you go:\n```json\n{\"items\":[{\"name\":\"a\",\"tags\":[\"umbrella\"]}]}\n```\nEnjoy.";
    let res = parse_response(&db(), raw, AiPromptStyle::Tags).unwrap();
    assert_eq!(res.items[0].tags, vec!["umbrella"]);
}

#[test]
fn test_repairs_truncated_answer() {
    let raw = r#"{"name":"g","items":[{"name":"a","tags":"umbrella"},{"name":"b","tags":"long_hair"},{"name":"c","tags":"umbr"#;
    let res = parse_response(&db(), raw, AiPromptStyle::Tags).unwrap();
    assert_eq!(res.items.len(), 2);
    assert_eq!(res.items[1].name, "b");
}

#[test]
fn test_accepts_top_level_array() {
    let raw = r#"[{"name":"a","text":"A girl waits in the rain."}]"#;
    let res = parse_response(&db(), raw, AiPromptStyle::Natural).unwrap();
    assert_eq!(res.name, "");
    assert_eq!(res.items[0].text, "A girl waits in the rain.");
}

#[test]
fn test_removes_style_tags_and_flags_unknown() {
    let raw = r#"{"items":[{"tags":"masterpiece, Best Quality, some_artist, commentary, seifuku, glowing umbrella, umbrella, Umbrella"}]}"#;
    let res = parse_response(&db(), raw, AiPromptStyle::Tags).unwrap();
    let item = &res.items[0];
    assert_eq!(item.name, "1");
    assert_eq!(item.tags, vec!["school_uniform", "glowing umbrella", "umbrella"]);
    assert_eq!(item.unknown_tags, vec!["glowing umbrella"]);
    assert_eq!(item.removed_tags, vec!["masterpiece", "Best Quality", "some_artist", "commentary"]);
}

#[test]
fn test_style_selects_fields() {
    let raw = r#"{"items":[{"name":"a","tags":"umbrella","text":"Two girls share one."}]}"#;
    let natural = parse_response(&db(), raw, AiPromptStyle::Natural).unwrap();
    assert!(natural.items[0].tags.is_empty());
    assert_eq!(natural.items[0].text, "Two girls share one.");
    let hybrid = parse_response(&db(), raw, AiPromptStyle::Hybrid).unwrap();
    assert_eq!(hybrid.items[0].tags, vec!["umbrella"]);
    assert_eq!(hybrid.items[0].text, "Two girls share one.");
}

#[test]
fn test_refusal_is_validation_error_with_snippet() {
    let err = parse_response(&db(), "I can't help with that.", AiPromptStyle::Tags).unwrap_err();
    match err {
        AppError::Validation(msg) => assert!(msg.contains("I can't help with that.")),
        other => panic!("unexpected error: {other:?}"),
    }
    // JSON without any usable item is also rejected.
    let empty = parse_response(&db(), r#"{"items":[{"name":"a"}]}"#, AiPromptStyle::Tags);
    assert!(matches!(empty, Err(AppError::Validation(_))));
}
