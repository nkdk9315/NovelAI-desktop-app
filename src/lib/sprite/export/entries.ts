/**
 * The sprites to export: every adopted, non-excluded cell with its file name
 * (from the name template) and its level keys, which engine adapters turn
 * into lookup tables.
 */
import { allCells, cellKey, levelIndex, levelsOf, type CellCoord } from "../cells";
import type { SpriteSpec } from "../spec";

export interface ExportEntry {
  cellKey: string;
  coord: CellCoord;
  /** File name without extension (unique) */
  name: string;
  poseKey: string;
  poseLabel: string;
  /** axis key → level key, for every axis (defaults included) */
  levels: Record<string, string>;
  /** `pose/level/level…` in axis order — a stable lookup id for scripts */
  id: string;
  imageId: string;
  /** The pose's base cell (every axis at its default level) */
  isBase: boolean;
  /** Name of the pose's base entry, when it is exported */
  baseName: string | null;
  baseImageId: string | null;
}

export interface CellImage {
  adoptedImageId: string | null;
  excluded: boolean;
}

const SAFE = /[^A-Za-z0-9_-]+/g;

/** Resolve `{char}` `{pose}` `{<axis key>}` `{index}`; unknown tokens stay empty. */
export function applyNameTemplate(
  template: string, values: Record<string, string>, index: number,
): string {
  const name = template.replace(/\{([^{}]+)\}/g, (_, token: string) =>
    token === "index" ? String(index + 1).padStart(3, "0") : values[token] ?? "");
  return name.replace(SAFE, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "") || `sprite_${index + 1}`;
}

export function buildEntries(spec: SpriteSpec, cells: (key: string) => CellImage | undefined): ExportEntry[] {
  const out: ExportEntry[] = [];
  const used = new Set<string>();
  const coords = allCells(spec);
  const baseKeys = new Map(spec.poses.map((p) => [p.id, cellKey({ poseId: p.id, levels: {} })]));
  coords.forEach((coord) => {
    const key = cellKey(coord);
    const cell = cells(key);
    if (!cell?.adoptedImageId || cell.excluded) return;
    const pose = spec.poses.find((p) => p.id === coord.poseId)!;
    const levels: Record<string, string> = {};
    for (const axis of spec.axes) {
      const level = levelsOf(spec, axis)[Math.max(0, levelIndex(spec, coord, axis))];
      levels[axis.key] = level?.key ?? "";
    }
    let name = applyNameTemplate(spec.export.nameTemplate, { char: spec.characterKey, pose: pose.key, ...levels }, out.length);
    if (used.has(name)) {
      let n = 2;
      while (used.has(`${name}_${n}`)) n++;
      name = `${name}_${n}`;
    }
    used.add(name);
    const baseKey = baseKeys.get(pose.id)!;
    out.push({
      cellKey: key,
      coord,
      name,
      poseKey: pose.key,
      poseLabel: pose.label,
      levels,
      id: [pose.key, ...spec.axes.map((a) => levels[a.key])].join("/"),
      imageId: cell.adoptedImageId,
      isBase: key === baseKey,
      baseName: null,
      baseImageId: cells(baseKey)?.adoptedImageId ?? null,
    });
  });
  const baseNames = new Map(out.filter((e) => e.isBase).map((e) => [e.coord.poseId, e.name]));
  return out.map((e) => ({ ...e, baseName: baseNames.get(e.coord.poseId) ?? null }));
}

/** Axis / pose tables shared by the manifests. */
export function describeSpec(spec: SpriteSpec) {
  return {
    character: spec.characterKey,
    width: spec.width,
    height: spec.height,
    poses: spec.poses.map((p) => ({ key: p.key, label: p.label })),
    axes: spec.axes.map((a) => ({ key: a.key, label: a.label, levels: levelsOf(spec, a).map((l) => ({ key: l.key, label: l.label })) })),
  };
}
