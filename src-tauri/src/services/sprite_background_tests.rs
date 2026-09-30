use super::*;
use image::Rgba;

const WHITE: Rgba<u8> = Rgba([252, 250, 252, 255]);
const INK: Rgba<u8> = Rgba([20, 20, 30, 255]);
const OPTS: BackgroundOptions = BackgroundOptions { fill_holes: true, remove_islands: true };

/// 120x120 white canvas, an outlined 40x60 "body" filled with near-white
/// (a white shirt), a flat enclosed gap, and a stray 3x3 dot far away.
fn figure() -> RgbaImage {
    let mut img = RgbaImage::from_pixel(120, 120, WHITE);
    for y in 30..90 {
        for x in 40..80 {
            let edge = x == 40 || x == 79 || y == 30 || y == 89;
            img.put_pixel(x, y, if edge { INK } else { Rgba([235, 238, 245, 255]) });
        }
    }
    // An enclosed ring: its inside is exactly the background colour
    for y in 32..60 {
        for x in 82..112 {
            let edge = x == 82 || x == 111 || y == 32 || y == 59;
            img.put_pixel(x, y, if edge { INK } else { WHITE });
        }
    }
    for x in 81..83 {
        img.put_pixel(x, 45, INK);
    }
    for y in 5..8 {
        for x in 5..8 {
            img.put_pixel(x, y, INK);
        }
    }
    img
}

#[test]
fn removes_the_border_background_and_keeps_white_clothes() {
    let (out, outcome) = remove_background(&figure(), OPTS);
    assert_eq!(outcome, BackgroundOutcome::Removed);
    assert_eq!(out.get_pixel(0, 0)[3], 0);
    assert_eq!(out.get_pixel(60, 60)[3], 255, "shaded white inside the outline stays");
    assert_eq!(out.get_pixel(40, 60)[3], 255, "the outline stays");
}

#[test]
fn fills_flat_enclosed_gaps_only_when_asked() {
    let (out, _) = remove_background(&figure(), OPTS);
    assert_eq!(out.get_pixel(96, 46)[3], 0);
    let (kept, _) = remove_background(&figure(), BackgroundOptions { fill_holes: false, ..OPTS });
    assert_eq!(kept.get_pixel(96, 46)[3], 255);
}

#[test]
fn drops_small_far_islands_only_when_asked() {
    let (out, _) = remove_background(&figure(), OPTS);
    assert_eq!(out.get_pixel(6, 6)[3], 0);
    let (kept, _) = remove_background(&figure(), BackgroundOptions { remove_islands: false, ..OPTS });
    assert!(kept.get_pixel(6, 6)[3] > 0);
}

#[test]
fn leaves_transparent_and_busy_images_alone() {
    let mut t = figure();
    for y in 0..20 {
        for x in 0..120 {
            t.put_pixel(x, y, Rgba([0, 0, 0, 0]));
        }
    }
    assert_eq!(remove_background(&t, OPTS).1, BackgroundOutcome::AlreadyTransparent);

    let busy = RgbaImage::from_fn(64, 64, |x, y| Rgba([(x * 4) as u8, (y * 4) as u8, 90, 255]));
    let (out, outcome) = remove_background(&busy, OPTS);
    assert_eq!(outcome, BackgroundOutcome::NotPlain);
    assert_eq!(out, busy);
}

#[test]
fn soft_edges_are_unmixed_from_the_background() {
    let mut img = RgbaImage::from_pixel(40, 40, WHITE);
    for y in 10..30 {
        for x in 10..30 {
            img.put_pixel(x, y, Rgba([200, 30, 30, 255]));
        }
    }
    // Anti-aliased red over white
    for y in 10..30 {
        img.put_pixel(9, y, Rgba([226, 140, 141, 255]));
    }
    let (out, _) = remove_background(&img, OPTS);
    let p = out.get_pixel(9, 20);
    assert!(p[3] > 0 && p[3] < 255);
    assert!(p[0] > 150 && p[1] < 80, "colour is red, not pink: {p:?}");
}
