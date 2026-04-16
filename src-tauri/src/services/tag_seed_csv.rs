// CSV parsing helpers for the tag seed pipeline.

pub(super) struct CsvRow<'a> {
    pub name: &'a str,
    pub category: u8,
    pub aliases: Vec<String>,
}

/// Minimal CSV parser for `danbooru_tags.csv`.
///
/// Row format: `name,category,post_count,"alias1,alias2"` (post_count ignored).
pub(super) fn parse_csv_row(line: &str) -> Option<CsvRow<'_>> {
    let mut fields: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for ch in line.chars() {
        if ch == '"' {
            in_quotes = !in_quotes;
        } else if ch == ',' && !in_quotes {
            fields.push(std::mem::take(&mut current));
        } else {
            current.push(ch);
        }
    }
    fields.push(current);

    if fields.len() < 3 {
        return None;
    }
    let category: u8 = fields[1].parse().ok()?;
    let first_comma = line.find(',')?;
    let name = &line[..first_comma];

    let aliases = if fields.len() > 3 && !fields[3].is_empty() {
        fields[3]
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    } else {
        Vec::new()
    };

    Some(CsvRow {
        name,
        category,
        aliases,
    })
}

pub(super) fn prettify_work_title(slug: &str) -> String {
    if slug == "unknown_work" {
        return "Unknown / Original".to_string();
    }
    slug.split('_')
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(first) => first.to_uppercase().chain(c).collect::<String>(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
