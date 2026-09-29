/**
 * Starting points for a sprite set, plus helpers to copy a spec (templates,
 * duplicated sets): prompt text is baked from the `sprite:<id>` targets into
 * the spec and every id is renewed, so the copy doesn't share targets.
 */
import { levelsOf } from "./cells";
import type { TextOf } from "./prompt";
import {
  newAxis, newId, newLevel, newPart, newPose, newSpec, newStage, randomSeed, type SpriteSpec,
} from "./spec";

export type BuiltinTemplateId = "rpg-battle" | "novel" | "expressions" | "blank";
export const BUILTIN_TEMPLATES: BuiltinTemplateId[] = ["rpg-battle", "novel", "expressions", "blank"];

function expressionAxis(faceId: string) {
  const axis = newAxis("表情", "face", "prompt", [
    newLevel("通常", "normal"),
    newLevel("笑顔", "smile", "smile"),
    newLevel("怒り", "angry", "angry, frown"),
    newLevel("悲しみ", "sad", "sad, teary eyes"),
    newLevel("驚き", "surprised", "surprised, open mouth"),
    newLevel("照れ", "blush", "blush, embarrassed"),
  ]);
  axis.regionIds = [faceId];
  axis.composite = true;
  return axis;
}

function rpgBattle(): SpriteSpec {
  const spec = newSpec("hero");
  const [body, face] = spec.regions;
  spec.poses = [
    newPose("待機", "idle", "full body, standing, fighting stance, looking at viewer"),
    newPose("攻撃", "attack", "full body, attacking, dynamic pose, motion lines"),
    newPose("被弾", "hit", "full body, being hit, flinching, pained expression, stumbling backward"),
    newPose("ダウン", "down", "full body, sitting on ground, wariza, exhausted"),
    newPose("拘束", "bound", "full body, restrained, arms held behind back, struggling"),
  ];
  const outer = newPart("上着", "jacket");
  const top = newPart("トップス", "white shirt");
  const bottom = newPart("ボトムス", "pleated skirt");
  const under = newPart("下着", "white bra, white panties", [outer.id, top.id, bottom.id]);
  const d1 = newStage("破損1", "d1", "torn clothes");
  d1.states = { [outer.id]: "torn", [top.id]: "torn" };
  const d2 = newStage("破損2", "d2", "torn clothes");
  d2.states = { [outer.id]: "exposed", [top.id]: "exposed", [bottom.id]: "torn" };
  const d3 = newStage("破損3", "d3", "torn clothes, clothes destroyed, underwear only");
  d3.states = { [outer.id]: "gone", [top.id]: "gone", [bottom.id]: "gone" };
  spec.outfit = { parts: [outer, top, bottom, under], stages: [newStage("無傷", "d0"), d1, d2, d3] };

  const wounds = newAxis("傷", "wound", "prompt", [
    newLevel("なし", "w0"),
    newLevel("軽傷", "w1", "scratches, bruises"),
    newLevel("重傷", "w2", "injured, bruises, cuts, blood"),
  ]);
  wounds.regionIds = [body.id];
  const fatigue = newAxis("疲労", "tired", "prompt", [
    newLevel("なし", "t0"),
    newLevel("疲れ", "t1", "tired, sweat, heavy breathing"),
    newLevel("限界", "t2", "exhausted, sweat, half-closed eyes, heavy breathing", 1.4),
  ]);
  fatigue.regionIds = [face.id];
  fatigue.composite = true;
  const fear = newAxis("恐怖", "fear", "prompt", [
    newLevel("なし", "f0"),
    newLevel("怯え", "f1", "scared, worried"),
    newLevel("恐怖", "f2", "scared, fearful, tears, trembling, open mouth", 1.6),
  ]);
  fear.regionIds = [face.id];
  fear.composite = true;
  spec.axes = [spec.axes[0], wounds, fatigue, fear];
  spec.export.nameTemplate = "{char}_{pose}_{damage}_{wound}_{tired}_{fear}";
  return spec;
}

function novel(): SpriteSpec {
  const spec = newSpec("heroine");
  const [body, face] = spec.regions;
  spec.poses = [newPose("正面", "front", "cowboy shot, standing, looking at viewer")];
  const clothes = newAxis("衣装", "outfit", "prompt", [
    newLevel("基本", "base"),
    newLevel("私服", "casual", "casual clothes"),
    newLevel("水着", "swim", "swimsuit"),
  ]);
  clothes.regionIds = [body.id];
  spec.axes = [clothes, expressionAxis(face.id)];
  spec.export.nameTemplate = "{char}_{pose}_{outfit}_{face}";
  return spec;
}

function expressions(): SpriteSpec {
  const spec = newSpec("chara");
  const face = spec.regions[1];
  spec.regions = [face];
  spec.poses = [newPose("正面", "front", "upper body, looking at viewer")];
  spec.axes = [expressionAxis(face.id)];
  spec.export.nameTemplate = "{char}_{face}";
  return spec;
}

export function builtinTemplate(id: BuiltinTemplateId): SpriteSpec {
  switch (id) {
    case "rpg-battle": return rpgBattle();
    case "novel": return novel();
    case "expressions": return expressions();
    default: return newSpec();
  }
}

/** Copy the current prompt text of every item into the spec itself. */
export function bakeTexts(spec: SpriteSpec, textOf: TextOf): SpriteSpec {
  const bake = <T extends { id: string; prompt: string; negative: string }>(x: T): T => {
    const t = textOf(x.id, { positive: x.prompt, negative: x.negative });
    return { ...x, prompt: t.positive, negative: t.negative };
  };
  return {
    ...spec,
    poses: spec.poses.map(bake),
    outfit: {
      parts: spec.outfit.parts.map(bake),
      stages: spec.outfit.stages.map((s) => ({ ...s, prompt: textOf(s.id, { positive: s.prompt, negative: "" }).positive })),
    },
    axes: spec.axes.map((a) => ({ ...a, levels: a.levels.map(bake) })),
  };
}

/** The same spec with every id renewed (references follow). Masks are kept or dropped. */
export function withFreshIds(spec: SpriteSpec, keepMasks: boolean): SpriteSpec {
  const map = new Map<string, string>();
  const re = (id: string) => {
    if (!map.has(id)) map.set(id, newId());
    return map.get(id)!;
  };
  const reKeys = <V>(o: Record<string, V>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [re(k), v]));
  const poses = spec.poses.map((p) => ({ ...p, id: re(p.id) }));
  const regions = spec.regions.map((r) => ({ ...r, id: re(r.id) }));
  const parts = spec.outfit.parts.map((p) => ({ ...p, id: re(p.id), coveredBy: p.coveredBy.map(re) }));
  const stages = spec.outfit.stages.map((s) => ({ ...s, id: re(s.id), states: reKeys(s.states), overrides: reKeys(s.overrides) }));
  const axes = spec.axes.map((a) => ({
    ...a, id: re(a.id), regionIds: a.regionIds.map(re), levels: a.levels.map((l) => ({ ...l, id: re(l.id) })),
  }));
  const masks = keepMasks
    ? Object.fromEntries(Object.entries(spec.masks).map(([pose, m]) => [re(pose), reKeys(m)]))
    : {};
  return { ...spec, poses, regions, outfit: { parts, stages }, axes, masks };
}

/** A copy for another set: baked text, fresh ids, a new seed (masks kept: same poses). */
export function copySpec(spec: SpriteSpec, textOf: TextOf): SpriteSpec {
  return { ...withFreshIds(bakeTexts(spec, textOf), true), seed: spec.seed == null ? null : randomSeed() };
}

/** Number of variant levels (for template previews): poses × levels of every axis. */
export function templateSize(spec: SpriteSpec): { poses: number; axes: { label: string; levels: number }[] } {
  return { poses: spec.poses.length, axes: spec.axes.map((a) => ({ label: a.label, levels: levelsOf(spec, a).length })) };
}
