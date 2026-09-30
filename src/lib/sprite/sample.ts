/**
 * The bundled sample set (差分の見本): what the variant feature makes, with the
 * settings behind it. Generated 2026-09-30 on nai-diffusion-5-full with a
 * transparent background (Opus free tier, 0 Anlas): 2 bases, 16 inpainted
 * variants and 1 local composite, from the prompts below. The same set can be
 * started from `sampleSpec()`.
 */
import aBase from "@/assets/sprite-samples/a-base.webp";
import aRegions from "@/assets/sprite-samples/a-regions.webp";
import aD1 from "@/assets/sprite-samples/a-d1.webp";
import aD2 from "@/assets/sprite-samples/a-d2.webp";
import aD2Wound from "@/assets/sprite-samples/a-d2-wound.webp";
import aD2WoundFear from "@/assets/sprite-samples/a-d2-wound-fear.webp";
import aD2AngryComposite from "@/assets/sprite-samples/a-d2-angry-composite.webp";
import aSmile from "@/assets/sprite-samples/a-smile.webp";
import aAngry from "@/assets/sprite-samples/a-angry.webp";
import aSad from "@/assets/sprite-samples/a-sad.webp";
import aSurprised from "@/assets/sprite-samples/a-surprised.webp";
import aBlush from "@/assets/sprite-samples/a-blush.webp";
import aWound from "@/assets/sprite-samples/a-wound.webp";
import aDirt from "@/assets/sprite-samples/a-dirt.webp";
import aBlood from "@/assets/sprite-samples/a-blood.webp";
import bBase from "@/assets/sprite-samples/b-base.webp";
import bRegions from "@/assets/sprite-samples/b-regions.webp";
import bD1 from "@/assets/sprite-samples/b-d1.webp";
import bD2 from "@/assets/sprite-samples/b-d2.webp";
import bAngry from "@/assets/sprite-samples/b-angry.webp";
import aBaseFace from "@/assets/sprite-samples/a-base-face.webp";
import aSmileFace from "@/assets/sprite-samples/a-smile-face.webp";
import aAngryFace from "@/assets/sprite-samples/a-angry-face.webp";
import aSadFace from "@/assets/sprite-samples/a-sad-face.webp";
import aSurprisedFace from "@/assets/sprite-samples/a-surprised-face.webp";
import aBlushFace from "@/assets/sprite-samples/a-blush-face.webp";
import { newAxis, newLevel, newPart, newPose, newSpec, newStage, type SpriteSpec } from "./spec";

export interface SampleImage {
  src: string;
  /** Close-up shown in the grid (the full image opens on click) */
  thumb?: string;
  /** i18n key under `sprite.sample.labels` */
  label: string;
  /** How it was made: i18n key under `sprite.sample.how` */
  how: "base" | "regions" | "inpaint" | "chain" | "composite";
}

export interface SampleSection {
  /** i18n key under `sprite.sample.sections` */
  id: "regions" | "damage" | "expressions" | "other" | "combo" | "poses";
  images: SampleImage[];
}

export const SAMPLE_SECTIONS: SampleSection[] = [
  { id: "damage", images: [
    { src: aBase, label: "base", how: "base" },
    { src: aD1, label: "d1", how: "inpaint" },
    { src: aD2, label: "d2", how: "chain" },
  ] },
  { id: "expressions", images: [
    { src: aBase, thumb: aBaseFace, label: "normal", how: "base" },
    { src: aSmile, thumb: aSmileFace, label: "smile", how: "inpaint" },
    { src: aAngry, thumb: aAngryFace, label: "angry", how: "inpaint" },
    { src: aSad, thumb: aSadFace, label: "sad", how: "inpaint" },
    { src: aSurprised, thumb: aSurprisedFace, label: "surprised", how: "inpaint" },
    { src: aBlush, thumb: aBlushFace, label: "blush", how: "inpaint" },
  ] },
  { id: "other", images: [
    { src: aWound, label: "wound", how: "inpaint" },
    { src: aDirt, label: "dirt", how: "inpaint" },
    { src: aBlood, label: "blood", how: "inpaint" },
  ] },
  { id: "combo", images: [
    { src: aD2Wound, label: "d2Wound", how: "chain" },
    { src: aD2WoundFear, label: "d2WoundFear", how: "chain" },
    { src: aD2AngryComposite, label: "d2Angry", how: "composite" },
  ] },
  { id: "poses", images: [
    { src: bBase, label: "poseBase", how: "base" },
    { src: bD1, label: "d1", how: "inpaint" },
    { src: bD2, label: "d2", how: "chain" },
    { src: bAngry, label: "angry", how: "inpaint" },
  ] },
  { id: "regions", images: [
    { src: aRegions, label: "regionsA", how: "regions" },
    { src: bRegions, label: "regionsB", how: "regions" },
  ] },
];

/** The left panel's main prompt used for the sample (the character's look; `rakugaki` is the style tag). */
export const SAMPLE_LOOK =
  "rakugaki, 1girl, solo, cynthia (pokemon), adult, mature female, tall, very long blonde hair, hair over one eye, grey eyes, black hair ornament";

/** What each part of the definition held, shown under the images. */
export const SAMPLE_PROMPTS: { label: string; text: string }[] = [
  { label: "look", text: SAMPLE_LOOK },
  { label: "poseA", text: "full body, standing, hand on own hip, looking at viewer" },
  { label: "poseB", text: "full body, fighting stance, pointing forward, dynamic pose, looking at viewer" },
  { label: "outfit", text: "school uniform, navy blue blazer with gold buttons, white collared shirt, red necktie, grey plaid pleated skirt, black thighhighs, brown loafers" },
  { label: "d1", text: "torn clothes, torn navy blue blazer…, torn grey plaid pleated skirt" },
  { label: "d2", text: "torn clothes, heavily torn navy blue blazer…, missing sleeve, torn white collared shirt, loose red necktie, heavily torn …skirt, torn black thighhighs" },
  { label: "expressions", text: "smile, happy, open mouth / angry, frown, clenched teeth / sad, crying, tears / surprised, wide-eyed, open mouth / blush, embarrassed, looking away" },
  { label: "other", text: "bruises, cuts, scratches, bandage on arm / dirty clothes, dirty skin, mud / blood on clothes (after the blazer)" },
  { label: "fear", text: "scared, fearful, tears, trembling" },
];

/** A set with the sample's poses, outfit and axes (the look goes in the left panel). */
export function sampleSpec(): SpriteSpec {
  const spec = newSpec("cynthia");
  const [body, face] = spec.regions;
  spec.poses = [
    newPose("立ち", "stand", SAMPLE_PROMPTS[1].text),
    newPose("指差し", "point", SAMPLE_PROMPTS[2].text),
  ];
  const blazer = newPart("ブレザー", "navy blue blazer with gold buttons");
  const shirt = newPart("シャツ", "white collared shirt");
  const tie = newPart("ネクタイ", "red necktie");
  const skirt = newPart("スカート", "grey plaid pleated skirt");
  const legs = newPart("ニーハイ", "black thighhighs");
  const shoes = newPart("靴", "brown loafers");
  spec.outfit.parts = [blazer, shirt, tie, skirt, legs, shoes];
  spec.outfit.stages[0].prompt = "school uniform";
  const d1 = newStage("破損1", "d1", "torn clothes, school uniform");
  d1.states = { [blazer.id]: "torn", [skirt.id]: "torn" };
  const d2 = newStage("破損2", "d2", "torn clothes, school uniform");
  d2.states = { [blazer.id]: "exposed", [shirt.id]: "torn", [skirt.id]: "exposed", [legs.id]: "torn" };
  d2.overrides = { [blazer.id]: "heavily torn navy blue blazer with gold buttons, missing sleeve", [tie.id]: "loose red necktie" };
  spec.outfit.stages.push(d1, d2);

  const expression = newAxis("表情", "face", "prompt", [
    newLevel("通常", "normal"),
    newLevel("笑顔", "smile", "smile, happy, open mouth"),
    newLevel("怒り", "angry", "angry, frown, clenched teeth"),
    newLevel("悲しみ", "sad", "sad, crying, tears"),
    newLevel("驚き", "surprised", "surprised, wide-eyed, open mouth"),
    newLevel("照れ", "blush", "blush, embarrassed, looking away"),
  ]);
  expression.regionIds = [face.id];
  expression.composite = true;
  const wound = newAxis("傷", "wound", "prompt", [newLevel("なし", "w0"), newLevel("傷", "w1", "bruises, cuts, scratches")]);
  wound.regionIds = [body.id];
  const blood = newAxis("服の血", "blood", "prompt", [newLevel("なし", "k0"), newLevel("血", "k1", "blood on clothes")]);
  blood.regionIds = [body.id];
  blood.partIds = [blazer.id];
  spec.axes = [spec.axes[0], expression, wound, blood];
  spec.export.nameTemplate = "{char}_{pose}_{damage}_{face}_{wound}_{blood}";
  return spec;
}
