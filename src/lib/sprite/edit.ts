/** Pure edits of a sprite spec that keep its references consistent. */
import type { SpriteSpec } from "./spec";

export function move<T>(list: T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item);
  return next;
}

/** `key` made unique among `taken` by appending `_2`, `_3`, … */
export function uniqueKey(key: string, taken: string[]): string {
  if (!taken.includes(key)) return key;
  let n = 2;
  while (taken.includes(`${key}_${n}`)) n++;
  return `${key}_${n}`;
}

const omit = <V>(o: Record<string, V>, id: string): Record<string, V> => {
  const rest = { ...o };
  delete rest[id];
  return rest;
};

export function removePose(spec: SpriteSpec, id: string): SpriteSpec {
  return { ...spec, poses: spec.poses.filter((p) => p.id !== id), masks: omit(spec.masks, id) };
}

export function removeRegion(spec: SpriteSpec, id: string): SpriteSpec {
  return {
    ...spec,
    regions: spec.regions.filter((r) => r.id !== id),
    axes: spec.axes.map((a) => ({ ...a, regionIds: a.regionIds.filter((r) => r !== id) })),
    masks: Object.fromEntries(Object.entries(spec.masks).map(([pose, m]) => [pose, omit(m, id)])),
  };
}

export function removePart(spec: SpriteSpec, id: string): SpriteSpec {
  return {
    ...spec,
    outfit: {
      parts: spec.outfit.parts.filter((p) => p.id !== id).map((p) => ({ ...p, coveredBy: p.coveredBy.filter((c) => c !== id) })),
      stages: spec.outfit.stages.map((s) => ({ ...s, states: omit(s.states, id), overrides: omit(s.overrides, id) })),
    },
    axes: spec.axes.map((a) => ({ ...a, partIds: a.partIds.filter((p) => p !== id) })),
  };
}

export function removeStage(spec: SpriteSpec, id: string): SpriteSpec {
  if (spec.outfit.stages.length <= 1) return spec;
  return { ...spec, outfit: { ...spec.outfit, stages: spec.outfit.stages.filter((s) => s.id !== id) } };
}

export function removeAxis(spec: SpriteSpec, id: string): SpriteSpec {
  return {
    ...spec,
    axes: spec.axes.filter((a) => a.id !== id),
    poses: spec.poses.map((p) => ({ ...p, skipAxes: p.skipAxes.filter((a) => a !== id) })),
  };
}

export function removeLevel(spec: SpriteSpec, axisId: string, levelId: string): SpriteSpec {
  return {
    ...spec,
    axes: spec.axes.map((a) => (a.id === axisId && a.levels.length > 1
      ? { ...a, levels: a.levels.filter((l) => l.id !== levelId) }
      : a)),
  };
}

/** Ids whose `sprite:<id>` prompt targets become unused when an item is removed. */
export function ownedTargetIds(spec: SpriteSpec, kind: "pose" | "part" | "stage" | "axis" | "level", id: string): string[] {
  if (kind === "axis") return spec.axes.find((a) => a.id === id)?.levels.map((l) => l.id) ?? [];
  return [id];
}
