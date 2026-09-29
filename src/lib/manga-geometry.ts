/**
 * Panel shapes for manga layouts: convex polygons in 0–1 page coordinates.
 * The layout editor splits panels with straight lines the user draws (any
 * angle); these helpers keep everything pure so they can be tested.
 */

export interface Point { x: number; y: number }
export type Shape = Point[];
export interface Box { x0: number; y0: number; x1: number; y1: number }

const EPS = 1e-6;

export function rectShape(x0: number, y0: number, x1: number, y1: number): Shape {
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}

export function area(s: Shape): number {
  let a = 0;
  for (let i = 0; i < s.length; i++) {
    const p = s[i];
    const q = s[(i + 1) % s.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export function centroid(s: Shape): Point {
  const n = s.length || 1;
  return { x: s.reduce((t, p) => t + p.x, 0) / n, y: s.reduce((t, p) => t + p.y, 0) / n };
}

export function bbox(s: Shape): Box {
  return {
    x0: Math.min(...s.map((p) => p.x)), y0: Math.min(...s.map((p) => p.y)),
    x1: Math.max(...s.map((p) => p.x)), y1: Math.max(...s.map((p) => p.y)),
  };
}

/** Signed side of `p` relative to the line a→b (0 = on the line). */
function side(a: Point, b: Point, p: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function lerp(p: Point, q: Point, t: number): Point {
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** Clip a convex shape to the half-plane on one side of the (infinite) line a→b. */
function clip(s: Shape, a: Point, b: Point, sign: 1 | -1): Shape {
  const out: Shape = [];
  for (let i = 0; i < s.length; i++) {
    const p = s[i];
    const q = s[(i + 1) % s.length];
    const sp = side(a, b, p) * sign;
    const sq = side(a, b, q) * sign;
    if (sp >= -EPS) out.push(p);
    if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) out.push(lerp(p, q, sp / (sp - sq)));
  }
  return out;
}

/** Whether the drawn segment a–b passes through the shape's interior. */
export function segmentCrosses(s: Shape, a: Point, b: Point): boolean {
  // Sample along the segment: any point inside the shape means it passes through
  for (let i = 1; i < 40; i++) {
    if (contains(s, lerp(a, b, i / 40))) return true;
  }
  return false;
}

export function contains(s: Shape, p: Point): boolean {
  let sign = 0;
  for (let i = 0; i < s.length; i++) {
    const v = side(s[i], s[(i + 1) % s.length], p);
    if (Math.abs(v) < EPS) continue;
    if (sign === 0) sign = Math.sign(v);
    else if (Math.sign(v) !== sign) return false;
  }
  return true;
}

/**
 * Split a shape along the line through a and b. Returns null when the line
 * misses it or a piece would be a sliver (< `minArea`).
 */
export function splitShape(s: Shape, a: Point, b: Point, minArea = 0.004): [Shape, Shape] | null {
  if (Math.hypot(b.x - a.x, b.y - a.y) < EPS) return null;
  const left = clip(s, a, b, 1);
  const right = clip(s, a, b, -1);
  if (left.length < 3 || right.length < 3 || area(left) < minArea || area(right) < minArea) return null;
  return [left, right];
}

/** Split every shape the drawn segment crosses. Returns null when nothing was split. */
export function splitShapes(shapes: readonly Shape[], a: Point, b: Point): Shape[] | null {
  let changed = false;
  const out = shapes.flatMap((s) => {
    if (!segmentCrosses(s, a, b)) return [s];
    const parts = splitShape(s, a, b);
    if (!parts) return [s];
    changed = true;
    return parts;
  });
  return changed ? out : null;
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points: Point[]): Shape {
  const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  const build = (list: Point[]) => {
    const h: Point[] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= EPS) h.pop();
      h.push(p);
    }
    return h;
  };
  const lower = build(pts);
  const upper = build([...pts].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Join two panels back into one; only when together they fill a convex region (e.g. undoing a split). */
export function mergeShapes(a: Shape, b: Shape): Shape | null {
  const hull = convexHull([...a, ...b]);
  const total = area(a) + area(b);
  return Math.abs(area(hull) - total) <= total * 0.01 ? hull : null;
}

/** Whether every edge is horizontal or vertical (text description alone reproduces it). */
export function isAxisAligned(s: Shape): boolean {
  return s.every((p, i) => {
    const q = s[(i + 1) % s.length];
    return Math.abs(p.x - q.x) < 1e-3 || Math.abs(p.y - q.y) < 1e-3;
  });
}

/** Shrink a convex shape by `d` (page units) for the gutter between panels. */
export function insetShape(s: Shape, d: number): Shape {
  const n = s.length;
  const orient = Math.sign(s.reduce((t, p, i) => t + (p.x * s[(i + 1) % n].y - s[(i + 1) % n].x * p.y), 0)) || 1;
  const lines = s.map((p, i) => {
    const q = s[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    // Inward normal for this orientation
    const nx = (-(q.y - p.y) / len) * orient;
    const ny = ((q.x - p.x) / len) * orient;
    return { p: { x: p.x + nx * d, y: p.y + ny * d }, dir: { x: q.x - p.x, y: q.y - p.y } };
  });
  return lines.map((l1, i) => {
    const l0 = lines[(i - 1 + n) % n];
    const det = l0.dir.x * l1.dir.y - l0.dir.y * l1.dir.x;
    if (Math.abs(det) < EPS) return l1.p;
    const t = ((l1.p.x - l0.p.x) * l1.dir.y - (l1.p.y - l0.p.y) * l1.dir.x) / det;
    return { x: l0.p.x + l0.dir.x * t, y: l0.p.y + l0.dir.y * t };
  });
}

/**
 * Japanese reading order: cut the page by a straight gap that crosses no
 * panel — horizontal cuts first (top before bottom), then vertical ones
 * (right before left) — and recurse. Pages without such gaps (slanted
 * borders) fall back to rows by center height, right to left.
 */
export function readingOrder(shapes: readonly Shape[]): number[] {
  const boxes = shapes.map(bbox);
  const tol = 0.02;
  const order = (ids: number[]): number[] => {
    if (ids.length <= 1) return ids;
    for (const c of [...new Set(ids.map((i) => boxes[i].y1))].sort((a, b) => a - b)) {
      const top = ids.filter((i) => boxes[i].y1 <= c + tol);
      const bottom = ids.filter((i) => boxes[i].y0 >= c - tol);
      if (top.length && bottom.length && top.length + bottom.length === ids.length) return [...order(top), ...order(bottom)];
    }
    for (const c of [...new Set(ids.map((i) => boxes[i].x0))].sort((a, b) => b - a)) {
      const right = ids.filter((i) => boxes[i].x0 >= c - tol);
      const left = ids.filter((i) => boxes[i].x1 <= c + tol);
      if (right.length && left.length && right.length + left.length === ids.length) return [...order(right), ...order(left)];
    }
    const cs = ids.map((i) => ({ i, c: centroid(shapes[i]) }));
    return cs.sort((p, q) => (Math.abs(p.c.y - q.c.y) > 0.12 ? p.c.y - q.c.y : q.c.x - p.c.x)).map((v) => v.i);
  };
  return order(shapes.map((_, i) => i));
}

/** "top right, small, tall"-style label from where a panel sits and its size on a W×H page. */
export function shapeLabel(s: Shape, w: number, h: number): string {
  const b = bbox(s);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const v = cy < 0.34 ? "top" : cy > 0.66 ? "bottom" : "middle";
  const hz = b.x1 - b.x0 > 0.8 ? "" : cx < 0.34 ? "left" : cx > 0.66 ? "right" : "";
  const a = area(s);
  const size = a > 0.35 ? "large" : a < 0.12 ? "small" : "";
  const pw = (b.x1 - b.x0) * w;
  const ph = (b.y1 - b.y0) * h;
  const form = pw / ph > 1.6 ? "wide" : ph / pw > 1.6 ? "tall" : "";
  return [[v, hz].filter(Boolean).join(" "), size, form].filter(Boolean).join(", ");
}

/** Whether any two panels sit side by side (then the page is read right to left). */
export function hasSideBySide(shapes: readonly Shape[]): boolean {
  const boxes = shapes.map(bbox);
  return boxes.some((a, i) => boxes.some((b, j) => i !== j
    && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5 * Math.min(a.y1 - a.y0, b.y1 - b.y0)
    && (a.x1 <= b.x0 + 0.02 || b.x1 <= a.x0 + 0.02)));
}

/** Snap a drawn line to horizontal / vertical when it is within `deg` degrees of it. */
export function snapLine(a: Point, b: Point, deg = 4): Point {
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const off = (target: number) => Math.abs(((angle - target + 540) % 360) - 180);
  if (off(0) < deg || off(180) < deg) return { x: b.x, y: a.y };
  if (off(90) < deg || off(-90) < deg) return { x: a.x, y: b.y };
  return b;
}
