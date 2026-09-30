/**
 * Cells of a sprite set: a pose plus one level per axis. The key lists only
 * the axes that are not at their first (default) level, sorted by axis id,
 * so adding an axis later keeps existing keys: `p1|axA=lv2|axB=lv1`.
 */
import type { AxisLevel, SpriteAxis, SpriteSpec } from "./spec";
import { partHiddenAxes } from "./prompt";

/** axisId → levelId, only for non-default levels */
export type LevelMap = Record<string, string>;

export interface CellCoord {
  poseId: string;
  levels: LevelMap;
}

/** Levels of an axis; an outfit axis uses the damage stages. */
export function levelsOf(spec: SpriteSpec, axis: SpriteAxis): AxisLevel[] {
  if (axis.kind !== "outfit") return axis.levels;
  return spec.outfit.stages.map((s) => ({ id: s.id, key: s.key, label: s.label, prompt: "", negative: "", weight: 1 }));
}

export function cellKey(coord: CellCoord): string {
  const parts = Object.entries(coord.levels)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([axis, level]) => `|${axis}=${level}`);
  return coord.poseId + parts.join("");
}

export function parseCellKey(key: string): CellCoord {
  const [poseId, ...rest] = key.split("|");
  const levels: LevelMap = {};
  for (const part of rest) {
    const i = part.indexOf("=");
    if (i > 0) levels[part.slice(0, i)] = part.slice(i + 1);
  }
  return { poseId, levels };
}

/** Build a coordinate from level indices, dropping default (index 0) levels. */
export function coordOf(spec: SpriteSpec, poseId: string, indices: Record<string, number>): CellCoord {
  const levels: LevelMap = {};
  for (const axis of spec.axes) {
    const i = indices[axis.id] ?? 0;
    const list = levelsOf(spec, axis);
    if (i > 0 && i < list.length) levels[axis.id] = list[i].id;
  }
  return { poseId, levels };
}

/** Level index of an axis in a coordinate (0 = default; -1 = unknown level). */
export function levelIndex(spec: SpriteSpec, coord: CellCoord, axis: SpriteAxis): number {
  const id = coord.levels[axis.id];
  if (!id) return 0;
  return levelsOf(spec, axis).findIndex((l) => l.id === id);
}

export function withLevel(spec: SpriteSpec, coord: CellCoord, axis: SpriteAxis, index: number): CellCoord {
  const levels = { ...coord.levels };
  const list = levelsOf(spec, axis);
  if (index <= 0 || index >= list.length) delete levels[axis.id];
  else levels[axis.id] = list[index].id;
  return { poseId: coord.poseId, levels };
}

/** Axes of the spec that are not at their default level, in spec (derivation) order. */
export function activeAxes(spec: SpriteSpec, coord: CellCoord): SpriteAxis[] {
  return spec.axes.filter((a) => levelIndex(spec, coord, a) > 0);
}

/** A key whose pose, axis or level no longer exists in the spec. */
export function isOrphanKey(spec: SpriteSpec, key: string): boolean {
  const coord = parseCellKey(key);
  if (!spec.poses.some((p) => p.id === coord.poseId)) return true;
  return Object.keys(coord.levels).some((axisId) => {
    const axis = spec.axes.find((a) => a.id === axisId);
    return !axis || levelIndex(spec, coord, axis) <= 0;
  });
}

/** A cell that varies an axis its pose doesn't use. */
export function isPoseSkipped(spec: SpriteSpec, coord: CellCoord): boolean {
  const skip = spec.poses.find((p) => p.id === coord.poseId)?.skipAxes ?? [];
  return skip.some((axisId) => coord.levels[axisId] != null);
}

/** A cell that isn't made: an axis its pose doesn't use, or a part variant while the part is hidden. */
export function isSkipped(spec: SpriteSpec, coord: CellCoord): boolean {
  return isPoseSkipped(spec, coord) || partHiddenAxes(spec, coord).length > 0;
}

/**
 * Every cell of the spec (poses × the levels of the axes each pose uses), in
 * pose / axis order. Part variants while the part is hidden are left out
 * unless `withHiddenParts` (the export gives them their visible look's image).
 */
export function allCells(spec: SpriteSpec, withHiddenParts = false): CellCoord[] {
  return spec.poses.flatMap((pose) => {
    let combos: Record<string, number>[] = [{}];
    for (const axis of spec.axes) {
      const n = pose.skipAxes.includes(axis.id) ? 1 : Math.max(1, levelsOf(spec, axis).length);
      combos = combos.flatMap((c) => Array.from({ length: n }, (_, i) => ({ ...c, [axis.id]: i })));
    }
    return combos.map((c) => coordOf(spec, pose.id, c)).filter((c) => withHiddenParts || partHiddenAxes(spec, c).length === 0);
  });
}

export function cellCount(spec: SpriteSpec): number {
  return allCells(spec).length;
}

/** Human-readable label: `通常 / 破損2 / 恐怖1` */
export function cellLabel(spec: SpriteSpec, coord: CellCoord): string {
  const pose = spec.poses.find((p) => p.id === coord.poseId)?.label ?? "?";
  const levels = activeAxes(spec, coord).map((a) => levelsOf(spec, a)[levelIndex(spec, coord, a)]?.label ?? "?");
  return [pose, ...levels].join(" / ");
}
