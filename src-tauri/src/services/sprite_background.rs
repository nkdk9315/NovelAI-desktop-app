//! Free, local background removal for sprites generated on a plain background
//! (V4.5 cannot make transparent images; V5 ones already are and pass through).
//!
//! 1. The background colour is the median of the border pixels; the image is
//!    left alone unless most of the border is close to it.
//! 2. Background = pixels close to that colour, flood-filled from the border
//!    (line art stops the fill, so white clothes inside the outline stay).
//! 3. Optionally, large flat enclosed gaps (between an arm and the body) too.
//! 4. A 2px band along the edge gets partial alpha (its distance to the
//!    background relative to the foreground beside it), with the colour
//!    un-mixed from the background (no white or pink fringe).
//! 5. Optionally, small pieces far from the character (stray text, signatures,
//!    motion lines, breath puffs drawn in the air) are dropped.
//!
//! Tuned on V4.5 / V5 output (2026-09-30): white blouses and silver hair keep
//! their shape; gaps between hair strands become transparent.

use std::collections::VecDeque;

use image::RgbaImage;

/// Max channel distance to the background colour for the flood fill.
const NEAR: u8 = 24;
/// Enclosed gaps must be flatter than the fill (white clothes have shading).
const HOLE: u8 = 10;
/// Enclosed gaps smaller than this share of the image are kept (highlights).
const HOLE_MIN_SHARE: f64 = 0.0005;
/// Floor of the foreground distance used for edge alpha (pale colours near the background).
const EDGE_MIN: f32 = 40.0;
/// Width of the soft edge band, in pixels.
const BAND: usize = 2;
/// Border share that must match the background colour.
const PLAIN_SHARE: f64 = 0.6;
/// Images with more see-through pixels than this are already transparent.
const TRANSPARENT_SHARE: f64 = 0.01;
/// Islands smaller than this share of the character …
const ISLAND_SHARE: f64 = 0.015;
/// … and farther than this from it (pixels) are removed.
const ISLAND_GAP: u32 = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundOptions {
    #[serde(default = "yes")]
    pub fill_holes: bool,
    #[serde(default = "yes")]
    pub remove_islands: bool,
}

fn yes() -> bool {
    true
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum BackgroundOutcome {
    Removed,
    /// Already had transparency (V5 transparent generation): unchanged
    AlreadyTransparent,
    /// The border isn't one plain colour: unchanged
    NotPlain,
}

fn dist(p: &image::Rgba<u8>, bg: [u8; 3]) -> u8 {
    (0..3).map(|i| p[i].abs_diff(bg[i])).max().unwrap_or(0)
}

fn border_indices(w: usize, h: usize) -> Vec<usize> {
    let mut v: Vec<usize> = (0..w).flat_map(|x| [x, (h - 1) * w + x]).collect();
    v.extend((1..h.saturating_sub(1)).flat_map(|y| [y * w, y * w + w - 1]));
    v
}

/// 4- or 8-connected components of `mask`; returns labels (0 = none) and sizes (index = label - 1).
fn components(mask: &[bool], w: usize, h: usize, eight: bool) -> (Vec<u32>, Vec<usize>) {
    let mut label = vec![0u32; mask.len()];
    let mut sizes = Vec::new();
    let mut queue = VecDeque::new();
    for start in 0..mask.len() {
        if !mask[start] || label[start] != 0 {
            continue;
        }
        let id = sizes.len() as u32 + 1;
        label[start] = id;
        queue.push_back(start);
        let mut size = 0;
        while let Some(i) = queue.pop_front() {
            size += 1;
            let (x, y) = ((i % w) as i64, (i / w) as i64);
            for (dx, dy) in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]
                .iter()
                .take(if eight { 8 } else { 4 })
            {
                let (nx, ny) = (x + dx, y + dy);
                if nx < 0 || ny < 0 || nx >= w as i64 || ny >= h as i64 {
                    continue;
                }
                let n = ny as usize * w + nx as usize;
                if mask[n] && label[n] == 0 {
                    label[n] = id;
                    queue.push_back(n);
                }
            }
        }
        sizes.push(size);
    }
    (label, sizes)
}

/// Chessboard distance from every pixel to the nearest `true` pixel (two-pass chamfer).
fn distance_to(mask: &[bool], w: usize, h: usize) -> Vec<u32> {
    let far = u32::MAX / 2;
    let mut d: Vec<u32> = mask.iter().map(|&m| if m { 0 } else { far }).collect();
    for y in 0..h {
        for x in 0..w {
            let i = y * w + x;
            let mut v = d[i];
            if x > 0 { v = v.min(d[i - 1] + 1); }
            if y > 0 {
                v = v.min(d[i - w] + 1);
                if x > 0 { v = v.min(d[i - w - 1] + 1); }
                if x + 1 < w { v = v.min(d[i - w + 1] + 1); }
            }
            d[i] = v;
        }
    }
    for y in (0..h).rev() {
        for x in (0..w).rev() {
            let i = y * w + x;
            let mut v = d[i];
            if x + 1 < w { v = v.min(d[i + 1] + 1); }
            if y + 1 < h {
                v = v.min(d[i + w] + 1);
                if x + 1 < w { v = v.min(d[i + w + 1] + 1); }
                if x > 0 { v = v.min(d[i + w - 1] + 1); }
            }
            d[i] = v;
        }
    }
    d
}

pub fn remove_background(img: &RgbaImage, opts: BackgroundOptions) -> (RgbaImage, BackgroundOutcome) {
    let (w, h) = (img.width() as usize, img.height() as usize);
    let total = w * h;
    if total == 0 {
        return (img.clone(), BackgroundOutcome::NotPlain);
    }
    let see_through = img.pixels().filter(|p| p[3] < 250).count();
    if see_through as f64 > total as f64 * TRANSPARENT_SHARE {
        return (img.clone(), BackgroundOutcome::AlreadyTransparent);
    }
    let px = |i: usize| img.get_pixel((i % w) as u32, (i / w) as u32);

    let border = border_indices(w, h);
    let mut bg = [0u8; 3];
    for (c, slot) in bg.iter_mut().enumerate() {
        let mut v: Vec<u8> = border.iter().map(|&i| px(i)[c]).collect();
        v.sort_unstable();
        *slot = v[v.len() / 2];
    }
    let d: Vec<u8> = (0..total).map(|i| dist(px(i), bg)).collect();
    let matching = border.iter().filter(|&&i| d[i] <= NEAR).count();
    if (matching as f64) < border.len() as f64 * PLAIN_SHARE {
        return (img.clone(), BackgroundOutcome::NotPlain);
    }

    // Background reached from the border
    let near: Vec<bool> = d.iter().map(|&v| v <= NEAR).collect();
    let mut is_bg = vec![false; total];
    let mut queue: VecDeque<usize> = border.iter().copied().filter(|&i| near[i]).collect();
    for &i in &queue {
        is_bg[i] = true;
    }
    while let Some(i) = queue.pop_front() {
        let (x, y) = (i % w, i / w);
        let mut visit = |n: usize| {
            if near[n] && !is_bg[n] {
                is_bg[n] = true;
                queue.push_back(n);
            }
        };
        if x > 0 { visit(i - 1); }
        if x + 1 < w { visit(i + 1); }
        if y > 0 { visit(i - w); }
        if y + 1 < h { visit(i + w); }
    }

    if opts.fill_holes {
        let flat: Vec<bool> = (0..total).map(|i| d[i] <= HOLE && !is_bg[i]).collect();
        let (label, sizes) = components(&flat, w, h, false);
        let min = (total as f64 * HOLE_MIN_SHARE) as usize;
        for i in 0..total {
            if label[i] > 0 && sizes[label[i] as usize - 1] >= min {
                is_bg[i] = true;
            }
        }
    }

    // Alpha: 0 on the background, soft within the band, opaque inside. An edge
    // pixel's alpha is its distance to the background relative to the
    // foreground next to it (the farthest colour within 2px), so a 50% blend
    // of red over white gets alpha 0.5, not a pink opaque fringe.
    let to_bg = distance_to(&is_bg, w, h);
    let foreground = |i: usize| -> f32 {
        let (x, y) = ((i % w) as i64, (i / w) as i64);
        let mut best = 0u8;
        for ny in (y - 2).max(0)..=(y + 2).min(h as i64 - 1) {
            for nx in (x - 2).max(0)..=(x + 2).min(w as i64 - 1) {
                let n = ny as usize * w + nx as usize;
                if !is_bg[n] {
                    best = best.max(d[n]);
                }
            }
        }
        f32::from(best).max(EDGE_MIN)
    };
    let mut alpha: Vec<f32> = (0..total)
        .map(|i| {
            if is_bg[i] {
                0.0
            } else if (to_bg[i] as usize) <= BAND {
                (f32::from(d[i]) / foreground(i)).min(1.0)
            } else {
                1.0
            }
        })
        .collect();

    if opts.remove_islands {
        let visible: Vec<bool> = alpha.iter().map(|&a| a > 0.0).collect();
        let (label, _) = components(&visible, w, h, true);
        let mut solid = vec![0usize; label.iter().copied().max().unwrap_or(0) as usize];
        for i in 0..total {
            if label[i] > 0 && alpha[i] >= 0.5 {
                solid[label[i] as usize - 1] += 1;
            }
        }
        if let Some((main_idx, &main_size)) = solid.iter().enumerate().max_by_key(|(_, s)| **s) {
            let main_label = main_idx as u32 + 1;
            let main: Vec<bool> = label.iter().map(|&l| l == main_label).collect();
            let to_main = distance_to(&main, w, h);
            let mut gap = vec![u32::MAX; solid.len()];
            for i in 0..total {
                if label[i] > 0 {
                    let g = &mut gap[label[i] as usize - 1];
                    *g = (*g).min(to_main[i]);
                }
            }
            let small = (main_size as f64 * ISLAND_SHARE) as usize;
            for i in 0..total {
                let l = label[i] as usize;
                if l > 0 && l as u32 != main_label && solid[l - 1] < small && gap[l - 1] > ISLAND_GAP {
                    alpha[i] = 0.0;
                }
            }
        }
    }

    let mut out = RgbaImage::new(w as u32, h as u32);
    for (i, o) in out.pixels_mut().enumerate() {
        let a = alpha[i];
        let p = px(i);
        *o = if a <= 0.0 {
            // Background colour under zero alpha: scaling doesn't pull in dark fringes
            image::Rgba([bg[0], bg[1], bg[2], 0])
        } else if a >= 1.0 {
            *p
        } else {
            // Un-mix the background: p = a * c + (1 - a) * bg
            let un = |c: usize| (bg[c] as f32 + (p[c] as f32 - bg[c] as f32) / a).round().clamp(0.0, 255.0) as u8;
            image::Rgba([un(0), un(1), un(2), (a * 255.0).round() as u8])
        };
    }
    (out, BackgroundOutcome::Removed)
}

#[cfg(test)]
#[path = "sprite_background_tests.rs"]
mod tests;
