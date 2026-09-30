/**
 * Progress of a sprite set, step by step, for the guide: what is done, what
 * is left, and which step to show first.
 */
import { allCells, cellKey } from "./cells";
import { hasMask } from "./plan";
import { plainText, type TextOf } from "./prompt";
import type { SpriteSpec } from "./spec";

export const GUIDE_STEPS = ["look", "outfit", "poses", "axes", "bases", "masks", "variants", "export"] as const;
export type GuideStepId = (typeof GUIDE_STEPS)[number];

export interface GuideCellState {
  adoptedImageId: string | null;
  excluded: boolean;
}

export interface GuideStepStatus {
  id: GuideStepId;
  done: boolean;
  /** Not needed for this set (e.g. the outfit when no damage axis is used) */
  optional: boolean;
  /** Progress for steps that count things */
  count?: { done: number; total: number };
  /** Item labels still missing something (poses without a prompt, …) */
  missing: string[];
}

export interface GuideInput {
  spec: SpriteSpec;
  cells: Record<string, GuideCellState>;
  /** Positive text of the main prompt (the character's look) */
  lookText: string;
  textOf?: TextOf;
}

export const baseKey = (poseId: string) => cellKey({ poseId, levels: {} });

/** Regions a pose needs masks for: those of the axes it uses. */
export function regionsUsedBy(spec: SpriteSpec, poseId: string): string[] {
  const skip = spec.poses.find((p) => p.id === poseId)?.skipAxes ?? [];
  return [...new Set(spec.axes.filter((a) => !skip.includes(a.id)).flatMap((a) => a.regionIds))];
}

export function missingMaskRegions(spec: SpriteSpec, poseId: string): string[] {
  return regionsUsedBy(spec, poseId).filter((r) => !hasMask(spec, poseId, r));
}

export function guideStatus({ spec, cells, lookText, textOf = plainText }: GuideInput): GuideStepStatus[] {
  const text = (id: string, fallback: string) => textOf(id, { positive: fallback, negative: "" }).positive.trim();
  const step = (id: GuideStepId, done: boolean, rest: Partial<GuideStepStatus> = {}): GuideStepStatus =>
    ({ id, done, optional: false, missing: [], ...rest });

  const outfitAxis = spec.axes.some((a) => a.kind === "outfit");
  const parts = spec.outfit.parts;
  const emptyParts = parts.filter((p) => !text(p.id, p.prompt)).map((p) => p.name);
  const emptyPoses = spec.poses.filter((p) => !text(p.id, p.prompt)).map((p) => p.label);
  const axisProblems = spec.axes.filter((a) => a.regionIds.length === 0
    || (a.kind === "outfit" ? spec.outfit.stages.length < 2 : a.levels.slice(1).some((l) => !text(l.id, l.prompt))))
    .map((a) => a.label);

  const basesDone = spec.poses.filter((p) => cells[baseKey(p.id)]?.adoptedImageId);
  const masksDone = spec.poses.filter((p) => missingMaskRegions(spec, p.id).length === 0);
  const keys = allCells(spec).map(cellKey);
  const variantsDone = keys.filter((k) => cells[k]?.adoptedImageId || cells[k]?.excluded).length;
  const needsMasks = spec.poses.some((p) => regionsUsedBy(spec, p.id).length > 0);

  return [
    step("look", lookText.trim().length > 0),
    step("outfit", parts.length > 0 && emptyParts.length === 0, {
      optional: !outfitAxis,
      missing: emptyParts,
      count: { done: parts.length - emptyParts.length, total: parts.length },
    }),
    step("poses", spec.poses.length > 0 && emptyPoses.length === 0, {
      missing: emptyPoses,
      count: { done: spec.poses.length - emptyPoses.length, total: spec.poses.length },
    }),
    step("axes", axisProblems.length === 0, { missing: axisProblems, optional: spec.axes.length === 0 }),
    step("bases", spec.poses.length > 0 && basesDone.length === spec.poses.length, {
      count: { done: basesDone.length, total: spec.poses.length },
      missing: spec.poses.filter((p) => !basesDone.includes(p)).map((p) => p.label),
    }),
    step("masks", masksDone.length === spec.poses.length, {
      optional: !needsMasks,
      count: { done: masksDone.length, total: spec.poses.length },
      missing: spec.poses.filter((p) => !masksDone.includes(p)).map((p) => p.label),
    }),
    step("variants", keys.length > 0 && variantsDone === keys.length, { count: { done: variantsDone, total: keys.length } }),
    step("export", false),
  ];
}

/** The step to open: the first one not done (optional ones count as done). */
export function firstOpenStep(steps: GuideStepStatus[]): GuideStepId {
  return steps.find((s) => !s.done && !s.optional)?.id ?? "export";
}

/** Words that, in the main prompt, would stay the same in every cell though a later step varies them. */
const MISPLACED: Record<"outfit" | "pose" | "expression", RegExp> = {
  outfit: /\b(shirt|blouse|skirt|dress|jacket|coat|uniform|armor|armour|bra|panties|underwear|pants|shorts|kimono|swimsuit|leotard|bodysuit|thighhighs|pantyhose|gloves|boots|shoes|hoodie|sweater|vest|cape|clothes|outfit)\b/i,
  pose: /\b(standing|sitting|kneeling|lying|squatting|full body|cowboy shot|upper body|fighting stance|arms up|pose)\b/i,
  expression: /\b(smile|smiling|crying|tears|angry|frown|blush|surprised|open mouth|scared|sad|expressionless)\b/i,
};

/** Tags of the main prompt that belong to the outfit / pose / axis steps, by kind. */
export function misplacedLookTags(text: string): { kind: keyof typeof MISPLACED; tags: string[] }[] {
  const tags = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  return (Object.keys(MISPLACED) as (keyof typeof MISPLACED)[])
    .map((kind) => ({ kind, tags: tags.filter((tag) => MISPLACED[kind].test(tag)) }))
    .filter((x) => x.tags.length > 0);
}
