//! Write a sprite set to disk from an export plan built by the frontend
//! (engine adapters live in `src/lib/sprite/export/`).

use std::collections::HashMap;
use std::path::{Component, Path, PathBuf};

use image::RgbaImage;
use rusqlite::Connection;

use crate::error::AppError;
use crate::models::sprite::{SpriteAtlasRequest, SpriteExportLayer, SpriteExportPlan, SpriteExportResultDto};
use crate::services::sprite_image_ops as ops;

type Db = std::sync::Mutex<Connection>;

const MAX_FILES: usize = 5000;
const MAX_TEXT_BYTES: usize = 16 * 1024 * 1024;

/// Resolve a relative output path under `root`, rejecting `..`, absolute paths and empty parts.
pub fn safe_join(root: &Path, rel: &str) -> Result<PathBuf, AppError> {
    let rel_path = Path::new(rel);
    let ok = !rel.is_empty()
        && !rel.contains('\\')
        && !rel.split('/').any(|s| s.is_empty() || s == "." || s == "..")
        && rel_path.components().all(|c| matches!(c, Component::Normal(_)));
    if !ok {
        return Err(AppError::Validation(format!("invalid export path: {rel}")));
    }
    Ok(root.join(rel_path))
}

fn write(root: &Path, rel: &str, bytes: &[u8], files: &mut Vec<String>) -> Result<(), AppError> {
    let path = safe_join(root, rel)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, bytes)?;
    files.push(rel.to_string());
    Ok(())
}

/// Loads history images of one project, caching decoded pixels.
struct Loader<'a> {
    db: &'a Db,
    project_id: String,
    cache: HashMap<String, RgbaImage>,
}

impl Loader<'_> {
    fn image(&mut self, image_id: &str) -> Result<RgbaImage, AppError> {
        if let Some(img) = self.cache.get(image_id) {
            return Ok(img.clone());
        }
        {
            let conn = self.db.lock().map_err(|e| AppError::Database(e.to_string()))?;
            let row = crate::repositories::image::find_by_id(&conn, image_id)?;
            if row.project_id != self.project_id {
                return Err(AppError::Validation("image belongs to another project".to_string()));
            }
        }
        let img = ops::decode(&crate::services::image_output::read_history_image(self.db, image_id)?)?;
        self.cache.insert(image_id.to_string(), img.clone());
        Ok(img)
    }

    /// The image, optionally reduced to its difference from a base, then scaled.
    fn render(&mut self, image_id: &str, layer: Option<&SpriteExportLayer>, factor: f64) -> Result<RgbaImage, AppError> {
        let img = self.image(image_id)?;
        let img = match layer {
            Some(l) => {
                let base = self.image(&l.base_image_id)?;
                let cells = ops::decode_cells(&crate::services::image_output::decode_base64(&l.mask_base64)?)?;
                ops::difference_layer(&img, &base, &cells)?
            }
            None => img,
        };
        ops::scale(img, factor)
    }
}

pub fn export(db: &Db, plan: SpriteExportPlan) -> Result<SpriteExportResultDto, AppError> {
    let root = PathBuf::from(&plan.out_dir);
    if !root.is_absolute() || !root.is_dir() {
        return Err(AppError::Validation(format!("export folder not found: {}", plan.out_dir)));
    }
    let atlas_count = plan.atlas.as_ref().map_or(0, |a| a.entries.len());
    if plan.images.len() + plan.texts.len() + atlas_count > MAX_FILES {
        return Err(AppError::Validation("too many files to export".to_string()));
    }
    let project_id = {
        let conn = db.lock().map_err(|e| AppError::Database(e.to_string()))?;
        crate::repositories::sprite_set::find_by_id(&conn, &plan.set_id)?.project_id
    };
    let mut loader = Loader { db, project_id, cache: HashMap::new() };
    let mut files = Vec::new();

    for item in &plan.images {
        let img = loader.render(&item.image_id, item.layer.as_ref(), item.scale)?;
        write(&root, &item.rel_path, &ops::encode_png(&img)?, &mut files)?;
    }
    if let Some(atlas) = &plan.atlas {
        write_atlas(&mut loader, &root, atlas, &mut files)?;
    }
    for text in &plan.texts {
        if text.content.len() > MAX_TEXT_BYTES {
            return Err(AppError::Validation(format!("export file too large: {}", text.rel_path)));
        }
        write(&root, &text.rel_path, text.content.as_bytes(), &mut files)?;
    }
    Ok(SpriteExportResultDto { out_dir: plan.out_dir, files })
}

/// Trimmed frames packed into `<rel_dir>/<name>-<n>.png` with a TexturePacker "JSON Hash" file per page.
fn write_atlas(loader: &mut Loader, root: &Path, atlas: &SpriteAtlasRequest, files: &mut Vec<String>) -> Result<(), AppError> {
    if !(64..=16384).contains(&atlas.max_size) {
        return Err(AppError::Validation("atlas size must be 64-16384".to_string()));
    }
    let mut frames = Vec::new();
    for e in &atlas.entries {
        let img = loader.render(&e.image_id, e.layer.as_ref(), atlas.scale)?;
        let (x, y, w, h) = ops::opaque_bounds(&img);
        let trimmed = image::imageops::crop_imm(&img, x, y, w, h).to_image();
        frames.push((e.frame.clone(), trimmed, (x, y), img.dimensions()));
    }
    let sizes: Vec<(u32, u32)> = frames.iter().map(|f| f.1.dimensions()).collect();
    let (placements, pages) = ops::pack(&sizes, atlas.max_size, atlas.padding)?;
    for (page, &(pw, ph)) in pages.iter().enumerate() {
        let file = format!("{}-{page}.png", atlas.name);
        let mut canvas = RgbaImage::new(pw.max(1), ph.max(1));
        let mut json_frames = serde_json::Map::new();
        for (f, p) in frames.iter().zip(&placements).filter(|(_, p)| p.page == page) {
            let (name, img, (ox, oy), (sw, sh)) = f;
            image::imageops::replace(&mut canvas, img, p.x as i64, p.y as i64);
            let (w, h) = img.dimensions();
            json_frames.insert(name.clone(), serde_json::json!({
                "frame": { "x": p.x, "y": p.y, "w": w, "h": h },
                "rotated": false,
                "trimmed": (w, h) != (*sw, *sh),
                "spriteSourceSize": { "x": ox, "y": oy, "w": w, "h": h },
                "sourceSize": { "w": sw, "h": sh },
            }));
        }
        let json = serde_json::json!({
            "frames": json_frames,
            "meta": {
                "app": "NovelAI Desktop",
                "version": "1.0",
                "image": file,
                "format": "RGBA8888",
                "size": { "w": canvas.width(), "h": canvas.height() },
                "scale": "1",
            },
        });
        let dir = atlas.rel_dir.trim_end_matches('/');
        let join = |f: &str| if dir.is_empty() { f.to_string() } else { format!("{dir}/{f}") };
        write(root, &join(&file), &ops::encode_png(&canvas)?, files)?;
        let json_text = serde_json::to_string_pretty(&json).map_err(|e| AppError::Io(e.to_string()))?;
        write(root, &join(&format!("{}-{page}.json", atlas.name)), json_text.as_bytes(), files)?;
    }
    Ok(())
}

#[cfg(test)]
#[path = "sprite_export_tests.rs"]
mod tests;
