import { describe, it, expect } from "vitest";
import {
  area, hasSideBySide, insetShape, isAxisAligned, mergeShapes, readingOrder, rectShape, shapeLabel, snapLine,
  splitShape, splitShapes, type Shape,
} from "@/lib/manga-geometry";

const page = rectShape(0, 0, 1, 1);
const r = rectShape;

describe("splitting", () => {
  it("splits a panel along a horizontal line into two rectangles", () => {
    const parts = splitShape(page, { x: -0.1, y: 0.4 }, { x: 1.1, y: 0.4 })!;
    expect(parts).not.toBeNull();
    expect(parts.map(area).sort()).toEqual([0.4, 0.6].map((v) => expect.closeTo(v, 5)));
    expect(parts.every(isAxisAligned)).toBe(true);
  });

  it("splits along a diagonal and keeps the total area", () => {
    const [a, b] = splitShape(page, { x: 0, y: 0.6 }, { x: 1, y: 0.4 })!;
    expect(area(a) + area(b)).toBeCloseTo(1);
    expect(isAxisAligned(a) || isAxisAligned(b)).toBe(false);
  });

  it("refuses slivers and lines that miss", () => {
    expect(splitShape(page, { x: 0, y: 0.001 }, { x: 1, y: 0.001 })).toBeNull();
    expect(splitShape(r(0, 0, 0.5, 1), { x: 0.7, y: 0 }, { x: 0.7, y: 1 })).toBeNull();
  });

  it("splits only the panels the drawn segment passes through", () => {
    const shapes = [r(0, 0, 1, 0.5), r(0, 0.5, 1, 1)];
    const out = splitShapes(shapes, { x: 0.5, y: 0.05 }, { x: 0.5, y: 0.45 })!;
    expect(out).toHaveLength(3);
    expect(out[2]).toBe(shapes[1]);
    expect(splitShapes(shapes, { x: 2, y: 2 }, { x: 3, y: 3 })).toBeNull();
  });

  it("merges two halves of a split back into one panel only when they form a convex region", () => {
    const [a, b] = splitShape(page, { x: 0, y: 0.6 }, { x: 1, y: 0.4 })!;
    expect(area(mergeShapes(a, b)!)).toBeCloseTo(1);
    expect(mergeShapes(r(0, 0, 0.5, 0.5), r(0.5, 0.5, 1, 1))).toBeNull();
  });
});

describe("reading order", () => {
  it("reads rows top to bottom, right to left", () => {
    const grid = [r(0, 0, 0.5, 0.5), r(0.5, 0, 1, 0.5), r(0, 0.5, 0.5, 1), r(0.5, 0.5, 1, 1)];
    expect(readingOrder(grid)).toEqual([1, 0, 3, 2]);
  });

  it("reads the right column first when a tall panel sits on the left", () => {
    const shapes = [r(0, 0, 0.45, 1), r(0.45, 0, 1, 0.5), r(0.45, 0.5, 1, 1)];
    expect(readingOrder(shapes)).toEqual([1, 2, 0]);
  });

  it("falls back to rows for slanted borders", () => {
    const pieces = splitShape(page, { x: 0, y: 0.6 }, { x: 1, y: 0.4 })!;
    const topIndex = pieces.findIndex((s) => Math.min(...s.map((p) => p.y)) === 0);
    expect(readingOrder(pieces)[0]).toBe(topIndex);
  });
});

describe("labels and helpers", () => {
  it("describes position, size and form", () => {
    expect(shapeLabel(r(0, 0, 1, 0.3), 832, 1216)).toBe("top, wide");
    expect(shapeLabel(r(0.6, 0.65, 1, 1), 832, 1216)).toBe("bottom right");
    expect(shapeLabel(r(0.7, 0.7, 1, 1), 832, 1216)).toBe("bottom right, small");
    expect(shapeLabel(r(0, 0, 1, 0.6), 832, 1216)).toBe("top, large");
  });

  it("detects side-by-side panels", () => {
    expect(hasSideBySide([r(0, 0, 1, 0.5), r(0, 0.5, 1, 1)])).toBe(false);
    expect(hasSideBySide([r(0, 0, 0.5, 1), r(0.5, 0, 1, 1)])).toBe(true);
  });

  it("insets a panel for the gutter", () => {
    const s: Shape = insetShape(r(0, 0, 1, 1), 0.1);
    expect(area(s)).toBeCloseTo(0.64);
  });

  it("snaps nearly straight lines", () => {
    expect(snapLine({ x: 0, y: 0.5 }, { x: 1, y: 0.52 })).toEqual({ x: 1, y: 0.5 });
    expect(snapLine({ x: 0, y: 0 }, { x: 1, y: 0.5 })).toEqual({ x: 1, y: 0.5 });
  });
});
