/**
 * Definition of a sprite variant set (差分制作, F13): poses, outfit parts and
 * damage stages, variant axes, mask regions and export settings. Stored as
 * JSON in `sprite_sets.spec`. See docs/contracts/sprite-variants.md.
 *
 * Prompt text of a pose / part / stage / level lives in the prompt target
 * `sprite:<id>` (so tag groups and autocomplete work like the main prompt);
 * the `prompt` / `negative` fields here are the initial text used until the
 * target exists (templates, older data).
 */

export const SPRITE_SPEC_VERSION = 1;

export type PartState = "intact" | "torn" | "exposed" | "gone";
export const PART_STATES: PartState[] = ["intact", "torn", "exposed", "gone"];

export interface SpritePose {
  id: string;
  /** Used in export file names */
  key: string;
  label: string;
  prompt: string;
  negative: string;
  /** Axes this pose doesn't vary (e.g. no fear levels for the attack pose) */
  skipAxes: string[];
  /** Left-panel characters in this pose (e.g. the enemy holding her); null = every character */
  characterIds: string[] | null;
}

export interface SpriteRegion {
  id: string;
  key: string;
  label: string;
  /** CSS colour of the region overlay */
  color: string;
}

export interface OutfitPart {
  id: string;
  name: string;
  prompt: string;
  negative: string;
  /** Parts worn over this one; non-empty = hidden until one of them is exposed / gone (underwear) */
  coveredBy: string[];
}

export interface DamageStage {
  id: string;
  key: string;
  label: string;
  /** Stage-wide tags such as `torn clothes` */
  prompt: string;
  states: Record<string, PartState>;
  /** Text used for a part at this stage instead of the automatic `torn …` wording */
  overrides: Record<string, string>;
}

export interface AxisLevel {
  id: string;
  key: string;
  label: string;
  prompt: string;
  negative: string;
  /** ≠ 1 wraps the prompt as `w::prompt::` */
  weight: number;
}

export interface SpriteAxis {
  id: string;
  key: string;
  label: string;
  /** "outfit" takes its levels from `outfit.stages` */
  kind: "outfit" | "prompt";
  regionIds: string[];
  /** Level n is derived from level n-1 (true) or from level 0 (false) */
  chain: boolean;
  /** Combinations with other axes may be made by pixel compositing */
  composite: boolean;
  /**
   * Outfit parts the levels belong to (wet shirt, stained underwear): the tags
   * follow the part in the prompt and are left out — and the cell isn't made —
   * while every one of them is hidden or gone. Empty = the whole picture.
   */
  partIds: string[];
  levels: AxisLevel[];
}

export type SpriteExportTarget =
  | "generic" | "rpgmaker-mz" | "rpgmaker-mv" | "wolf" | "tyrano" | "kirikiri"
  | "renpy" | "unity" | "godot" | "unreal" | "web-atlas";

export interface SpriteExportSettings {
  target: SpriteExportTarget;
  /** Tokens: {char} {pose} {<axis key>} {index} */
  nameTemplate: string;
  scale: number;
  /** Export variants as difference layers over their pose's base */
  layers: boolean;
  atlasMaxSize: number;
  lastDir: string | null;
  /** Remove plain backgrounds (V4.5 / white) on export; transparent images pass through */
  removeBackground: boolean;
  /** Also remove flat enclosed gaps (between an arm and the body) */
  fillHoles: boolean;
  /** Drop small pieces far from the character (stray text, signatures, motion lines) */
  removeIslands: boolean;
}

/**
 * How cells are generated against the background:
 * - transparent: V5 makes transparent images; V4.5 a plain white background removed on export
 * - white: a plain white background, kept
 * - asis: nothing added (the prompt decides)
 */
export type SpriteBackground = "transparent" | "white" | "asis";

export interface SpriteSpec {
  version: number;
  characterKey: string;
  width: number;
  height: number;
  /** null = random */
  seed: number | null;
  candidatesPerCell: number;
  inpaintStrength: number;
  /** V4.5: other poses' bases use the first pose's adopted base as character reference */
  poseReference: boolean;
  background: SpriteBackground;
  /** Keep text, sound effects and effect lines out of the images (dialogue / SFX of the left panel are ignored) */
  noText: boolean;
  poses: SpritePose[];
  outfit: { parts: OutfitPart[]; stages: DamageStage[] };
  axes: SpriteAxis[];
  regions: SpriteRegion[];
  /** poseId → regionId → 1/8-size black / white PNG (base64, one pixel per 8px cell) */
  masks: Record<string, Record<string, string>>;
  export: SpriteExportSettings;
}

export const spriteTargetId = (itemId: string) => `sprite:${itemId}`;

export const newId = () => crypto.randomUUID();

export const REGION_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#14b8a6", "#ec4899"];

export function newPose(label: string, key: string, prompt = ""): SpritePose {
  return { id: newId(), key, label, prompt, negative: "", skipAxes: [], characterIds: null };
}

export function newRegion(label: string, key: string, index: number): SpriteRegion {
  return { id: newId(), key, label, color: REGION_COLORS[index % REGION_COLORS.length] };
}

export function newPart(name: string, prompt = "", coveredBy: string[] = []): OutfitPart {
  return { id: newId(), name, prompt, negative: "", coveredBy };
}

export function newStage(label: string, key: string, prompt = ""): DamageStage {
  return { id: newId(), key, label, prompt, states: {}, overrides: {} };
}

export function newLevel(label: string, key: string, prompt = "", weight = 1): AxisLevel {
  return { id: newId(), key, label, prompt, negative: "", weight };
}

export function newAxis(label: string, key: string, kind: SpriteAxis["kind"], levels: AxisLevel[] = []): SpriteAxis {
  return { id: newId(), key, label, kind, regionIds: [], chain: kind === "outfit", composite: false, partIds: [], levels };
}

export const DEFAULT_EXPORT: SpriteExportSettings = {
  target: "generic",
  nameTemplate: "{char}_{pose}",
  scale: 1,
  layers: false,
  atlasMaxSize: 4096,
  lastDir: null,
  removeBackground: true,
  fillHoles: true,
  removeIslands: true,
};

export function randomSeed(): number {
  return Math.floor(Math.random() * 4_294_967_295);
}

/** A minimal set: one pose, clothes / face regions and an outfit axis without stages yet. */
export function newSpec(characterKey = "chara"): SpriteSpec {
  const body = newRegion("服", "body", 0);
  const face = newRegion("顔", "face", 1);
  const outfitAxis = newAxis("服の破損", "damage", "outfit");
  outfitAxis.regionIds = [body.id];
  return {
    version: SPRITE_SPEC_VERSION,
    characterKey,
    width: 832,
    height: 1216,
    seed: randomSeed(),
    candidatesPerCell: 2,
    inpaintStrength: 1,
    poseReference: false,
    background: "transparent",
    noText: true,
    poses: [newPose("通常", "idle", "full body, standing, looking at viewer")],
    outfit: { parts: [], stages: [newStage("無傷", "d0")] },
    axes: [outfitAxis],
    regions: [body, face],
    masks: {},
    export: { ...DEFAULT_EXPORT },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Fill fields missing from stored / older specs so the UI can rely on them. */
export function normalizeSpec(raw: unknown): SpriteSpec {
  const base = newSpec();
  if (!isObj(raw)) return base;
  const r = raw as Partial<SpriteSpec>;
  const outfit = isObj(r.outfit) ? r.outfit as SpriteSpec["outfit"] : base.outfit;
  return {
    ...base,
    ...r,
    version: SPRITE_SPEC_VERSION,
    poses: (Array.isArray(r.poses) ? r.poses : base.poses).map((p) => ({ ...p, skipAxes: p.skipAxes ?? [], characterIds: p.characterIds ?? null })),
    outfit: {
      parts: (Array.isArray(outfit.parts) ? outfit.parts : []).map((p) => ({ ...p, coveredBy: p.coveredBy ?? [] })),
      stages: (Array.isArray(outfit.stages) && outfit.stages.length > 0 ? outfit.stages : base.outfit.stages)
        .map((s) => ({ ...s, states: s.states ?? {}, overrides: s.overrides ?? {} })),
    },
    axes: (Array.isArray(r.axes) ? r.axes : base.axes)
      .map((a) => ({ ...a, regionIds: a.regionIds ?? [], partIds: a.partIds ?? [], levels: a.levels ?? [] })),
    regions: Array.isArray(r.regions) ? r.regions : base.regions,
    masks: isObj(r.masks) ? r.masks as SpriteSpec["masks"] : {},
    export: { ...DEFAULT_EXPORT, ...(isObj(r.export) ? r.export : {}) },
  };
}

/** A file-name-safe key: ASCII letters, digits, `-` and `_` (fallback when empty). */
export function slugKey(text: string, fallback: string): string {
  const s = text.normalize("NFKD").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
  return s || fallback;
}

/**
 * A set size with the image's aspect ratio, in 64px steps, about as large as
 * `area` (so an imported drawing isn't stretched when it is inpainted).
 */
export function sizeForAspect(width: number, height: number, area = 832 * 1216): { width: number; height: number } {
  const ar = width / height;
  const step = (v: number) => Math.min(2048, Math.max(256, Math.round(v / 64) * 64));
  const w = step(Math.sqrt(area * ar));
  return { width: w, height: step(w / ar) };
}

export const sameAspect = (a: { width: number; height: number }, b: { width: number; height: number }) =>
  Math.abs(a.width / a.height - b.width / b.height) < 0.02;
