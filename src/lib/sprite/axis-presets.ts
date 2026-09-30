/**
 * Ready-made variant axes for the body, the face, the clothes and the
 * underwear. Clothes / underwear axes are attached to outfit parts, so their
 * tags follow the part and vanish while it is hidden. Verified 2026-09-30
 * (V5 inpaint over the clothes region, 0 Anlas): `stained panties` on the
 * visible underwear 2/2, `wet clothes, see-through` 2/2, `blood on clothes` 2/2.
 */
import { uniqueKey } from "./edit";
import { newAxis, newLevel, type SpriteAxis, type SpriteSpec } from "./spec";

export type AxisPresetGroup = "body" | "face" | "clothes" | "underwear";

interface AxisPreset {
  id: string;
  group: AxisPresetGroup;
  label: string;
  key: string;
  /** [label, key, prompt, weight] — the first is the default level */
  levels: [string, string, string, number?][];
  chain?: boolean;
  composite?: boolean;
}

export const AXIS_PRESETS: AxisPreset[] = [
  { id: "wounds", group: "body", label: "傷", key: "wound", chain: true,
    levels: [["なし", "w0", ""], ["軽傷", "w1", "scratches, bruises"], ["重傷", "w2", "injured, bruises, cuts, blood"]] },
  { id: "bodyDirt", group: "body", label: "体の汚れ", key: "dirt",
    levels: [["なし", "g0", ""], ["汚れ", "g1", "dirty skin, dirt on body"], ["泥まみれ", "g2", "very dirty, mud on body, dirty skin"]] },
  { id: "sweat", group: "body", label: "汗", key: "sweat",
    levels: [["なし", "s0", ""], ["汗", "s1", "sweat"], ["大汗", "s2", "very sweaty, sweat, shiny skin"]] },
  { id: "expression", group: "face", label: "表情", key: "face", composite: true,
    levels: [["通常", "normal", ""], ["笑顔", "smile", "smile"], ["怒り", "angry", "angry, frown"], ["悲しみ", "sad", "sad, teary eyes"],
      ["驚き", "surprised", "surprised, open mouth"], ["照れ", "blush", "blush, embarrassed"]] },
  { id: "blush", group: "face", label: "赤面", key: "blush", composite: true,
    levels: [["なし", "b0", ""], ["赤面", "b1", "blush"], ["真っ赤", "b2", "full-face blush, embarrassed", 1.3]] },
  { id: "fear", group: "face", label: "恐怖", key: "fear", composite: true,
    levels: [["なし", "f0", ""], ["怯え", "f1", "scared, worried"], ["恐怖", "f2", "scared, fearful, tears, trembling, open mouth", 1.6]] },
  { id: "fatigue", group: "face", label: "疲労", key: "tired", composite: true,
    levels: [["なし", "t0", ""], ["疲れ", "t1", "tired, sweat, heavy breathing"], ["限界", "t2", "exhausted, sweat, half-closed eyes, heavy breathing", 1.4]] },
  { id: "wet", group: "clothes", label: "服の濡れ", key: "wet",
    levels: [["なし", "n0", ""], ["濡れ", "n1", "wet clothes, see-through"], ["びしょ濡れ", "n2", "soaked, wet clothes, see-through, clothes clinging to body"]] },
  { id: "blood", group: "clothes", label: "服の血", key: "blood", chain: true,
    levels: [["なし", "k0", ""], ["血", "k1", "blood on clothes"], ["血まみれ", "k2", "bloodstained clothes, blood splatter", 1.2]] },
  { id: "clothesDirt", group: "clothes", label: "服の汚れ", key: "cdirt",
    levels: [["なし", "c0", ""], ["汚れ", "c1", "dirty clothes, stained clothes"], ["ひどい汚れ", "c2", "very dirty clothes, mud, stained clothes"]] },
  { id: "underwearStain", group: "underwear", label: "下着のシミ", key: "ustain",
    levels: [["なし", "u0", ""], ["シミ", "u1", "stained panties"]] },
];

/** Region used for a group: `body` / `face` by key, else the first / second region. */
function regionFor(spec: SpriteSpec, group: AxisPresetGroup): string[] {
  const byKey = (key: string, fallback: number) => (spec.regions.find((r) => r.key === key) ?? spec.regions[fallback])?.id;
  const id = group === "face" ? byKey("face", 1) : byKey("body", 0);
  return id ? [id] : [];
}

/** Parts a clothes / underwear axis attaches to: worn-under parts for underwear, the others for clothes. */
export function presetParts(spec: SpriteSpec, group: AxisPresetGroup): string[] {
  if (group === "underwear") return spec.outfit.parts.filter((p) => p.coveredBy.length > 0).map((p) => p.id);
  if (group === "clothes") return spec.outfit.parts.filter((p) => p.coveredBy.length === 0).map((p) => p.id);
  return [];
}

export function axisFromPreset(spec: SpriteSpec, presetId: string): SpriteAxis | null {
  const p = AXIS_PRESETS.find((x) => x.id === presetId);
  if (!p) return null;
  const axis = newAxis(p.label, uniqueKey(p.key, spec.axes.map((a) => a.key)), "prompt",
    p.levels.map(([label, key, prompt, weight]) => newLevel(label, key, prompt, weight ?? 1)));
  axis.regionIds = regionFor(spec, p.group);
  axis.partIds = presetParts(spec, p.group);
  axis.chain = p.chain ?? false;
  axis.composite = p.composite ?? false;
  return axis;
}
