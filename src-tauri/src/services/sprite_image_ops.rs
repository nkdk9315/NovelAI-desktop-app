//! Pixel operations for the sprite export: decode, scale, difference layers,
//! trimming and texture-atlas packing (shelf packing, several pages).

use image::{imageops::FilterType, GrayImage, RgbaImage};

use crate::error::AppError;

/// Channel difference above which a pixel counts as changed in a difference layer.
pub const LAYER_THRESHOLD: u8 = 12;
const CELL: u32 = 8;

pub fn decode(bytes: &[u8]) -> Result<RgbaImage, AppError> {
    if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        let img = webp::Decoder::new(bytes)
            .decode()
            .ok_or_else(|| AppError::Validation("undecodable WebP image".to_string()))?;
        return Ok(img.to_image().to_rgba8());
    }
    Ok(image::load_from_memory(bytes)
        .map_err(|e| AppError::Validation(format!("undecodable image: {e}")))?
        .to_rgba8())
}

pub fn encode_png(img: &RgbaImage) -> Result<Vec<u8>, AppError> {
    let mut out = std::io::Cursor::new(Vec::new());
    img.write_to(&mut out, image::ImageFormat::Png)
        .map_err(|e| AppError::Io(format!("png encode failed: {e}")))?;
    Ok(out.into_inner())
}

pub fn scale(img: RgbaImage, factor: f64) -> Result<RgbaImage, AppError> {
    if !(0.05..=4.0).contains(&factor) {
        return Err(AppError::Validation(format!("invalid export scale: {factor}")));
    }
    if (factor - 1.0).abs() < 1e-6 {
        return Ok(img);
    }
    let w = ((img.width() as f64 * factor).round() as u32).max(1);
    let h = ((img.height() as f64 * factor).round() as u32).max(1);
    Ok(image::imageops::resize(&img, w, h, FilterType::Lanczos3))
}

/// Keep only the variant's pixels that differ from the base inside the mask
/// (8px cells, dilated by one cell); everything else becomes transparent.
pub fn difference_layer(variant: &RgbaImage, base: &RgbaImage, cells: &GrayImage) -> Result<RgbaImage, AppError> {
    if variant.dimensions() != base.dimensions() {
        return Err(AppError::Validation(
            "the variant and its base differ in size".to_string(),
        ));
    }
    let (w, h) = variant.dimensions();
    let (cols, rows) = cells.dimensions();
    let masked = |cx: i64, cy: i64| -> bool {
        (-1..=1).any(|dy| {
            (-1..=1).any(|dx| {
                let (x, y) = (cx + dx, cy + dy);
                x >= 0
                    && y >= 0
                    && (x as u32) < cols
                    && (y as u32) < rows
                    && cells.get_pixel(x as u32, y as u32)[0] >= 128
            })
        })
    };
    let mut out = RgbaImage::new(w, h);
    for (x, y, px) in out.enumerate_pixels_mut() {
        let (cx, cy) = ((x / CELL) as i64, (y / CELL) as i64);
        if !masked(cx, cy) {
            continue;
        }
        let v = variant.get_pixel(x, y);
        let b = base.get_pixel(x, y);
        if v.0
            .iter()
            .zip(b.0.iter())
            .any(|(a, c)| a.abs_diff(*c) > LAYER_THRESHOLD)
        {
            *px = *v;
        }
    }
    Ok(out)
}

/// Decode a 1/8-size mask PNG (one pixel per cell) to a gray image.
pub fn decode_cells(bytes: &[u8]) -> Result<GrayImage, AppError> {
    Ok(image::load_from_memory(bytes)
        .map_err(|e| AppError::Validation(format!("undecodable mask: {e}")))?
        .to_luma8())
}

/// Bounding box `(x, y, w, h)` of non-transparent pixels; a 1x1 box at the origin when empty.
pub fn opaque_bounds(img: &RgbaImage) -> (u32, u32, u32, u32) {
    let (mut x0, mut y0, mut x1, mut y1) = (u32::MAX, u32::MAX, 0, 0);
    for (x, y, p) in img.enumerate_pixels() {
        if p[3] > 0 {
            x0 = x0.min(x);
            y0 = y0.min(y);
            x1 = x1.max(x);
            y1 = y1.max(y);
        }
    }
    if x0 == u32::MAX {
        return (0, 0, 1, 1);
    }
    (x0, y0, x1 - x0 + 1, y1 - y0 + 1)
}

pub struct Placement {
    pub page: usize,
    pub x: u32,
    pub y: u32,
}

/// Shelf-pack rectangles (w, h) into pages of at most `max` x `max`, tallest first.
/// Returns one placement per input (same order) and each page's used size.
/// Placements (input order) and each page's used size.
pub type Packing = (Vec<Placement>, Vec<(u32, u32)>);

pub fn pack(sizes: &[(u32, u32)], max: u32, padding: u32) -> Result<Packing, AppError> {
    let mut order: Vec<usize> = (0..sizes.len()).collect();
    order.sort_by_key(|&i| std::cmp::Reverse(sizes[i].1));
    let mut placements: Vec<Option<Placement>> = (0..sizes.len()).map(|_| None).collect();
    let mut pages: Vec<(u32, u32)> = Vec::new();
    // Cursor of the current page: x, shelf top, shelf height
    let (mut x, mut top, mut shelf_h) = (0u32, 0u32, 0u32);
    for i in order {
        let (w, h) = sizes[i];
        if w > max || h > max {
            return Err(AppError::Validation(format!(
                "a frame ({w}x{h}) is larger than the atlas size {max}"
            )));
        }
        if pages.is_empty() {
            pages.push((0, 0));
        }
        if x + w > max {
            top += shelf_h + padding;
            x = 0;
            shelf_h = 0;
        }
        if top + h > max {
            pages.push((0, 0));
            x = 0;
            top = 0;
            shelf_h = 0;
        }
        let page = pages.len() - 1;
        placements[i] = Some(Placement { page, x, y: top });
        let used = &mut pages[page];
        used.0 = used.0.max(x + w);
        used.1 = used.1.max(top + h);
        x += w + padding;
        shelf_h = shelf_h.max(h);
    }
    Ok((placements.into_iter().map(|p| p.expect("placed")).collect(), pages))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{Luma, Rgba};

    #[test]
    fn difference_layer_keeps_changed_pixels_inside_the_mask_only() {
        let base = RgbaImage::from_pixel(32, 32, Rgba([10, 10, 10, 255]));
        let mut variant = base.clone();
        variant.put_pixel(1, 1, Rgba([200, 0, 0, 255])); // inside the masked cell
        variant.put_pixel(30, 30, Rgba([200, 0, 0, 255])); // far outside
        variant.put_pixel(2, 2, Rgba([15, 10, 10, 255])); // below the threshold
        let mut cells = GrayImage::new(4, 4);
        cells.put_pixel(0, 0, Luma([255]));
        let layer = difference_layer(&variant, &base, &cells).unwrap();
        assert_eq!(layer.get_pixel(1, 1)[0], 200);
        assert_eq!(layer.get_pixel(30, 30)[3], 0);
        assert_eq!(layer.get_pixel(2, 2)[3], 0);
        assert!(difference_layer(&RgbaImage::new(8, 8), &base, &cells).is_err());
    }

    #[test]
    fn difference_layer_dilates_the_mask_by_one_cell() {
        let base = RgbaImage::from_pixel(32, 32, Rgba([0, 0, 0, 255]));
        let mut variant = base.clone();
        variant.put_pixel(12, 12, Rgba([255, 255, 255, 255])); // neighbouring cell (1,1)
        variant.put_pixel(20, 20, Rgba([255, 255, 255, 255])); // two cells away
        let mut cells = GrayImage::new(4, 4);
        cells.put_pixel(0, 0, Luma([255]));
        let layer = difference_layer(&variant, &base, &cells).unwrap();
        assert_eq!(layer.get_pixel(12, 12)[3], 255);
        assert_eq!(layer.get_pixel(20, 20)[3], 0);
    }

    #[test]
    fn opaque_bounds_and_scale() {
        let mut img = RgbaImage::new(10, 10);
        assert_eq!(opaque_bounds(&img), (0, 0, 1, 1));
        img.put_pixel(2, 3, Rgba([0, 0, 0, 255]));
        img.put_pixel(5, 7, Rgba([0, 0, 0, 1]));
        assert_eq!(opaque_bounds(&img), (2, 3, 4, 5));
        assert_eq!(scale(img.clone(), 0.5).unwrap().dimensions(), (5, 5));
        assert!(scale(img, 0.0).is_err());
    }

    #[test]
    fn pack_fills_shelves_and_opens_new_pages() {
        let sizes = [(40, 40), (40, 30), (40, 40), (100, 10)];
        let (p, pages) = pack(&sizes, 100, 2).unwrap();
        // 40+2+40 fits one shelf; the third 40x40 moves to the next shelf
        assert_eq!((p[0].page, p[0].x, p[0].y), (0, 0, 0));
        assert_eq!((p[2].x, p[2].y), (42, 0));
        assert_eq!((p[1].x, p[1].y), (0, 42));
        assert_eq!((p[3].x, p[3].y), (0, 74));
        assert_eq!(pages.len(), 1);
        let (p, pages) = pack(&[(60, 60), (60, 60)], 100, 0).unwrap();
        assert_eq!((pages.len(), p[1].page), (2, 1));
        assert!(pack(&[(120, 10)], 100, 0).is_err());
    }
}
