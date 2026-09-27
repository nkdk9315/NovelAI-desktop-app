/**
 * Lettering (font look) of a dialogue line, independent of its bubble kind:
 * appended to the line's phrase, e.g. `"覚悟しろ" in a round speech bubble,
 * in bold brush calligraphy letters`. Checked on V5 (2026-09-27); "wavy" and
 * "cute" only nudge the letters, a pixel font was too unreliable to offer.
 */
export const LETTERING_STYLES = {
  auto: "",
  bold: "in thick bold letters",
  impact: "in huge bold impact letters with rough jagged edges",
  mincho: "in an elegant serif mincho font",
  brush: "in bold brush calligraphy letters",
  horror: "in creepy dripping horror letters",
  wavy: "the letters themselves are drawn with shaky wobbly wavy lines",
  cute: "in a cute rounded maru gothic font with soft round letters",
} as const;

export type LetteringStyle = keyof typeof LETTERING_STYLES;
export const LETTERING_STYLE_IDS = Object.keys(LETTERING_STYLES) as LetteringStyle[];

export function isLetteringStyle(id: string): id is LetteringStyle {
  return Object.prototype.hasOwnProperty.call(LETTERING_STYLES, id);
}

/** Phrase for a line's lettering ("" for auto or an unknown id). */
export function letteringPhrase(id: string | undefined): string {
  return id && isLetteringStyle(id) ? LETTERING_STYLES[id] : "";
}
