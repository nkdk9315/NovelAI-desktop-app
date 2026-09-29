/**
 * Prompt fragments of a sprite cell: pose + outfit at the damage stage +
 * the other axes' levels. They are appended to the main prompt (the
 * character's look) by `buildGenerateRequest`'s `mainSuffix`.
 *
 * Hidden parts (underwear): a part with `coveredBy` is left out until one of
 * the parts over it is `exposed` or `gone`; then it is written as
 * "… visible through tears", or plainly when every covering part is gone.
 * Verified on V5 (2026-09-29): colour and type stay the same across stages,
 * seeds and poses.
 */
import { joinPrompt } from "@/lib/outfits";
import { levelIndex, levelsOf, type CellCoord } from "./cells";
import type { DamageStage, PartState, SpriteSpec } from "./spec";

export interface PromptText {
  positive: string;
  negative: string;
}

/** Text of a spec item: its prompt target when present, else the stored initial text. */
export type TextOf = (itemId: string, fallback: PromptText) => PromptText;

export const plainText: TextOf = (_id, fallback) => fallback;

const EXPOSING: PartState[] = ["exposed", "gone"];

/** Prefix the first piece of a comma-separated prompt: `torn` + `jacket, long sleeves`. */
function prefixFirst(prefix: string, text: string): string {
  return `${prefix} ${text.trimStart()}`;
}

export function weighted(text: string, weight: number): string {
  const t = text.trim();
  if (!t || Math.abs(weight - 1) < 1e-6) return t;
  return `${Number(weight.toFixed(2))}::${t}::`;
}

export function stageOf(spec: SpriteSpec, coord: CellCoord): DamageStage | undefined {
  const axis = spec.axes.find((a) => a.kind === "outfit");
  const stages = spec.outfit.stages;
  if (!axis) return stages[0];
  const i = levelIndex(spec, coord, axis);
  return stages[Math.max(0, i)];
}

export function outfitPromptAt(spec: SpriteSpec, stage: DamageStage | undefined, textOf: TextOf = plainText): PromptText {
  const parts = spec.outfit.parts;
  const stateOf = (partId: string): PartState => stage?.states[partId] ?? "intact";
  const pos: string[] = [];
  const neg: string[] = [];
  if (stage) {
    const t = textOf(stage.id, { positive: stage.prompt, negative: "" });
    pos.push(t.positive);
    neg.push(t.negative);
  }
  for (const part of parts) {
    const state = stateOf(part.id);
    const override = stage?.overrides[part.id]?.trim();
    const coverers = part.coveredBy.filter((id) => parts.some((p) => p.id === id));
    if (coverers.length > 0 && !coverers.some((id) => EXPOSING.includes(stateOf(id)))) continue;
    if (state === "gone") {
      if (override) pos.push(override);
      continue;
    }
    const t = textOf(part.id, { positive: part.prompt, negative: part.negative });
    const baseText = t.positive.trim();
    if (!baseText && !override) continue;
    let text = override || (state === "intact" ? baseText : prefixFirst(state === "torn" ? "torn" : "heavily torn", baseText));
    const partlyCovered = coverers.length > 0 && !coverers.every((id) => stateOf(id) === "gone");
    if (partlyCovered) text = `${text} visible through tears`;
    pos.push(text);
    neg.push(t.negative);
  }
  return { positive: joinPrompt(...pos), negative: joinPrompt(...neg) };
}

/** Everything a cell adds to the main prompt / negative prompt. */
export function cellPrompt(spec: SpriteSpec, coord: CellCoord, textOf: TextOf = plainText): PromptText {
  const pose = spec.poses.find((p) => p.id === coord.poseId);
  const pos: string[] = [];
  const neg: string[] = [];
  if (pose) {
    const t = textOf(pose.id, { positive: pose.prompt, negative: pose.negative });
    pos.push(t.positive);
    neg.push(t.negative);
  }
  const outfit = outfitPromptAt(spec, stageOf(spec, coord), textOf);
  pos.push(outfit.positive);
  neg.push(outfit.negative);
  for (const axis of spec.axes) {
    if (axis.kind === "outfit") continue;
    const level = levelsOf(spec, axis)[Math.max(0, levelIndex(spec, coord, axis))];
    if (!level) continue;
    const t = textOf(level.id, { positive: level.prompt, negative: level.negative });
    pos.push(weighted(t.positive, level.weight));
    neg.push(t.negative);
  }
  return { positive: joinPrompt(...pos), negative: joinPrompt(...neg) };
}
