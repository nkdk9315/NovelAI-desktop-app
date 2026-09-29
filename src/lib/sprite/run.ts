/**
 * Runs the sprite generation queue: text-to-image for bases, inpaint from
 * the parent's adopted image, or compositing — then stores each result as a
 * candidate (the first one of a cell without an adoption is adopted, so
 * batches can chain parent → child).
 */
import * as ipc from "@/lib/ipc";
import * as spriteIpc from "@/lib/ipc-sprite";
import { buildGenerateRequest } from "@/lib/generation-request";
import { maskCellsToBase64, toDataUrl } from "@/lib/canvas-image";
import { useSettingsStore } from "@/stores/settings-store";
import { cellStateOf, useSpriteStore } from "@/stores/sprite-store";
import { useSpriteQueueStore, type SpriteQueueItem } from "@/stores/sprite-queue-store";
import { cellKey } from "./cells";
import { compositeImages } from "./composite";
import { regionCells, subtractCells } from "./mask";
import { planCell, type CellPlan } from "./plan";
import { cellPrompt } from "./prompt";
import type { SpriteSpec } from "./spec";
import { rolledTextOf } from "./text";
import type { CharacterReferenceRequest, GenerateActionRequest } from "@/types";
import { supportsCharacterReference } from "@/lib/constants";
import { useGenerationParamsStore } from "@/stores/generation-params-store";

class CellError extends Error {}

async function imageSrc(imageId: string): Promise<string> {
  return toDataUrl(await ipc.getImageData(imageId));
}

function adoptedOf(key: string | null): string {
  const id = key ? cellStateOf(key)?.adoptedImageId : null;
  if (!id) throw new CellError("sprite.blocker.parentNotAdopted");
  return id;
}

/** Adopt `imageId` when the cell has no adopted image yet, then refresh the cells. */
async function adoptIfFirst(setId: string, key: string, imageId: string) {
  if (!cellStateOf(key)?.adoptedImageId) await spriteIpc.adoptSpriteCandidate(setId, key, imageId);
  await useSpriteStore.getState().reloadCells();
}

async function runComposite(spec: SpriteSpec, setId: string, plan: CellPlan) {
  const parentId = adoptedOf(plan.parentKey);
  const sourceId = adoptedOf(plan.sourceKey);
  const pasted = await regionCells(spec, plan.coord.poseId, plan.regionIds);
  const blocked = await regionCells(spec, plan.coord.poseId, plan.subtractRegionIds);
  const mask = subtractCells(pasted, blocked);
  const png = await compositeImages(await imageSrc(parentId), await imageSrc(sourceId), mask);
  const cand = await spriteIpc.saveSpriteImage({
    setId, cellKey: plan.key, imageBase64: png, parentImageId: parentId, method: "composite", sourceImageIds: [parentId, sourceId],
  });
  await adoptIfFirst(setId, plan.key, cand.imageId);
}

/** The first pose's adopted base, as character reference for another pose's base (V4.5, opt-in). */
export async function poseReferenceFor(spec: SpriteSpec, plan: CellPlan): Promise<CharacterReferenceRequest | undefined> {
  const first = spec.poses[0];
  if (!spec.poseReference || plan.method !== "txt2img" || !first || plan.coord.poseId === first.id) return undefined;
  if (!supportsCharacterReference(useGenerationParamsStore.getState().model)) return undefined;
  const id = cellStateOf(baseKeyOf(first.id))?.adoptedImageId;
  if (!id) return undefined;
  return { imageBase64: (await ipc.getImageData(id)).base64, strength: 1, fidelity: 1, mode: "character" };
}

async function runGenerate(spec: SpriteSpec, setId: string, projectId: string, plan: CellPlan, item: SpriteQueueItem) {
  let action: GenerateActionRequest = { type: "generate" };
  const characterReference = item.customMaskBase64 ? undefined : await poseReferenceFor(spec, plan);
  let parentId: string | null = null;
  const method = item.customMaskBase64 ? "inpaint" : plan.method;
  if (method === "inpaint") {
    parentId = item.sourceImageId ?? adoptedOf(plan.parentKey);
    const maskBase64 = item.customMaskBase64
      ?? maskCellsToBase64(await regionCells(spec, plan.coord.poseId, plan.regionIds));
    action = {
      type: "infill",
      sourceImageBase64: (await ipc.getImageData(parentId)).base64,
      maskBase64,
      maskStrength: spec.inpaintStrength,
      colorCorrect: true,
    };
  }
  const existing = useSpriteStore.getState().cells[plan.key]?.candidates.length ?? 0;
  for (let i = 0; i < item.count; i++) {
    if (useSpriteQueueStore.getState().stopRequested) return;
    const prompt = cellPrompt(spec, plan.coord, rolledTextOf);
    const built = buildGenerateRequest(projectId, {
      action,
      width: spec.width,
      height: spec.height,
      mainSuffix: prompt.positive,
      negativeSuffix: prompt.negative,
      seed: spec.seed != null ? (spec.seed + existing + i) % 4_294_967_296 : undefined,
      snapshotExtra: { sprite: { setId, cellKey: plan.key } },
      characterReference,
      characterIds: spec.poses.find((p) => p.id === plan.coord.poseId)?.characterIds ?? undefined,
    });
    if (!built.ok) throw new CellError(built.errorKey);
    const res = await ipc.generateImage(built.req);
    await spriteIpc.addSpriteCandidate({ setId, cellKey: plan.key, imageId: res.id, parentImageId: parentId, method });
    await adoptIfFirst(setId, plan.key, res.id);
    void useSettingsStore.getState().refreshAnlas();
  }
}

async function runItem(item: SpriteQueueItem) {
  const { spec, activeSetId, projectId } = useSpriteStore.getState();
  if (!spec || !activeSetId || !projectId) throw new CellError("sprite.noActiveSet");
  const plan = planCell(spec, item.key, cellStateOf, { preferInpaint: item.preferInpaint || !!item.customMaskBase64 });
  const blockers = plan.blockers.filter((b) => {
    if (b === "excluded") return !item.force;
    if (item.customMaskBase64 && (b === "maskMissing" || b === "noRegion" || b === "parentNotAdopted" || b === "sourceNotAdopted")) {
      return false;
    }
    return true;
  });
  if (blockers.length > 0) throw new CellError(`sprite.blocker.${blockers[0]}`);
  if (plan.method === "composite" && !item.customMaskBase64) await runComposite(spec, activeSetId, plan);
  else await runGenerate(spec, activeSetId, projectId, plan, item);
}

/** Process the queue until it is empty or stopped. Safe to call while running (no-op). */
export async function runSpriteQueue(): Promise<void> {
  const queue = useSpriteQueueStore.getState();
  if (queue.running) return;
  try {
    for (;;) {
      const q = useSpriteQueueStore.getState();
      if (q.stopRequested) break;
      const item = q.take();
      if (!item) break;
      q.setRunning(true, item.key);
      try {
        await runItem(item);
      } catch (e) {
        q.fail({ key: item.key, reason: e instanceof CellError ? e.message : String(e) });
      }
      useSpriteQueueStore.getState().markDone();
    }
  } finally {
    useSpriteQueueStore.getState().setRunning(false);
  }
}

export function enqueueCells(items: SpriteQueueItem[]): void {
  useSpriteQueueStore.getState().enqueue(items);
  void runSpriteQueue();
}

/** Key of a pose's base cell. */
export const baseKeyOf = (poseId: string) => cellKey({ poseId, levels: {} });
