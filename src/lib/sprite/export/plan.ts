/** Turn a sprite set into the export plan the backend writes to disk. */
import { maskCellsToBase64 } from "@/lib/canvas-image";
import type { SpriteExportLayer, SpriteExportPlan } from "@/types/sprite";
import { activeAxes } from "../cells";
import { gridOf, regionCells } from "../mask";
import type { SpriteExportTarget, SpriteSpec } from "../spec";
import { genericAdapter, godotAdapter, unityAdapter, unrealAdapter, webAtlasAdapter } from "./adapters-engine";
import { rpgmakerAdapter, wolfAdapter } from "./adapters-game";
import { kirikiriAdapter, renpyAdapter, tyranoAdapter } from "./adapters-novel";
import type { ExportEntry } from "./entries";
import { TARGETS, type Adapter } from "./types";

const ADAPTERS: Record<SpriteExportTarget, Adapter> = {
  generic: genericAdapter,
  "rpgmaker-mz": rpgmakerAdapter(true),
  "rpgmaker-mv": rpgmakerAdapter(false),
  wolf: wolfAdapter,
  tyrano: tyranoAdapter,
  kirikiri: kirikiriAdapter,
  renpy: renpyAdapter,
  unity: unityAdapter,
  godot: godotAdapter,
  unreal: unrealAdapter,
  "web-atlas": webAtlasAdapter,
};

export function targetSupportsLayers(target: SpriteExportTarget): boolean {
  return TARGETS.find((t) => t.id === target)?.layers ?? false;
}

/** Keep only the variant's changes inside the regions of the axes that differ from the base. */
async function layerOf(spec: SpriteSpec, e: ExportEntry): Promise<SpriteExportLayer | undefined> {
  if (e.isBase || !e.baseImageId) return undefined;
  const regions = [...new Set(activeAxes(spec, e.coord).flatMap((a) => a.regionIds))];
  let cells = await regionCells(spec, e.coord.poseId, regions);
  if (cells.count === 0) {
    // No region drawn (e.g. imported images): compare the whole image
    const { cols, rows } = gridOf(spec);
    cells = { cols, rows, cells: new Uint8Array(cols * rows).fill(1), count: cols * rows };
  }
  return { baseImageId: e.baseImageId, maskBase64: maskCellsToBase64(cells) };
}

export async function buildExportPlan(
  spec: SpriteSpec, setId: string, outDir: string, entries: ExportEntry[],
): Promise<SpriteExportPlan> {
  const { target, scale } = spec.export;
  const layers = spec.export.layers && targetSupportsLayers(target);
  const out = ADAPTERS[target]({ spec, entries, layers, scale });
  const byName = new Map(entries.map((e) => [e.name, e]));
  const layerFor = async (e: ExportEntry) => (layers ? layerOf(spec, e) : undefined);

  const images = await Promise.all(out.images.map(async ({ name, relPath }) => {
    const e = byName.get(name)!;
    return { imageId: e.imageId, relPath, scale, layer: await layerFor(e) };
  }));
  const atlas = out.atlas
    ? {
      name: out.atlas.name,
      relDir: out.atlas.relDir,
      maxSize: spec.export.atlasMaxSize,
      padding: 2,
      scale,
      entries: await Promise.all(entries.map(async (e) => ({ imageId: e.imageId, frame: e.name, layer: await layerFor(e) }))),
    }
    : undefined;
  return { setId, outDir, images, texts: out.texts, atlas };
}

/** Text files only (for previews / tests). */
export function previewTexts(spec: SpriteSpec, entries: ExportEntry[]) {
  const layers = spec.export.layers && targetSupportsLayers(spec.export.target);
  return ADAPTERS[spec.export.target]({ spec, entries, layers, scale: spec.export.scale });
}
