/** Visual-novel engines: TyranoScript, KiriKiri Z (KAG) and Ren'Py. */
import type { ExportEntry } from "./entries";
import type { Adapter } from "./types";

const q = (s: string) => s.replace(/"/g, "");

/**
 * TyranoScript: `chara_new` with the first pose's base, `chara_face` per
 * sprite. With layers, variants go into a `chara_layer` part stacked on the
 * pose's base face.
 */
export const tyranoAdapter: Adapter = ({ spec, entries, layers }) => {
  const c = spec.characterKey;
  const dir = `data/fgimage/chara/${c}`;
  const storage = (e: ExportEntry) => `chara/${c}/${e.name}.png`;
  const first = entries.find((e) => e.isBase) ?? entries[0];
  const lines = [`; ${c} の立ち絵差分（NovelAI Desktop で書き出し）`, ""];
  if (first) lines.push(`[chara_new name="${c}" storage="${storage(first)}" jname="${q(c)}"]`);
  const faces = layers ? entries.filter((e) => e.isBase || !e.baseName) : entries;
  for (const e of faces) lines.push(`[chara_face name="${c}" face="${e.name}" storage="${storage(e)}"]`);
  if (layers) {
    lines.push("", "; 差分レイヤー: [chara_mod name=\"" + c + "\" face=<素体>] のあと [chara_part name=\"" + c + "\" variant=<ID>]");
    lines.push(`[chara_layer name="${c}" part="variant" id="none" storage="none" zindex="10"]`);
    for (const e of entries.filter((x) => !x.isBase && x.baseName)) {
      lines.push(`[chara_layer name="${c}" part="variant" id="${e.name}" storage="${storage(e)}"]`);
    }
  }
  return {
    images: entries.map((e) => ({ name: e.name, relPath: `${dir}/${e.name}.png` })),
    texts: [{ relPath: `data/scenario/${c}_sprites.ks`, content: `${lines.join("\n")}\n` }],
  };
};

/** KiriKiri Z / KAG: images in fgimage + a lookup dictionary and a `[<char>_show id=…]` macro. */
export const kirikiriAdapter: Adapter = ({ spec, entries }) => {
  const c = spec.characterKey;
  const dict = entries.map((e) => `  "${e.id}" => "${e.name}"`).join(",\n");
  const ks = `; ${c} の立ち絵差分（NovelAI Desktop で書き出し）
; 使い方: [${c}_show id="${entries[0]?.id ?? "pose/level"}" layer=0 pos=c]
[iscript]
global.naiSprite_${c} = %[
${dict}
];
[endscript]
[macro name="${c}_show"]
[image storage="&global.naiSprite_${c}[mp.id]" layer="&mp.layer !== void ? mp.layer : '0'" page=fore visible=true pos="&mp.pos !== void ? mp.pos : 'c'"]
[endmacro]
`;
  return {
    images: entries.map((e) => ({ name: e.name, relPath: `fgimage/${e.name}.png` })),
    texts: [{ relPath: `scenario/${c}_sprites.ks`, content: ks }],
  };
};

/**
 * Ren'Py: `image <char> <pose> <axis>_<level> …` (attribute order free with
 * `show`). With layers, variants are `Composite`s of the base and the layer.
 */
export const renpyAdapter: Adapter = ({ spec, entries, layers, scale }) => {
  const c = spec.characterKey;
  const path = (e: ExportEntry) => `images/${c}/${e.name}.png`;
  const tags = (e: ExportEntry) => [e.poseKey, ...spec.axes.map((a) => `${a.key}_${e.levels[a.key]}`)].join(" ");
  const w = Math.round(spec.width * scale);
  const h = Math.round(spec.height * scale);
  const byPose = new Map(entries.filter((e) => e.isBase).map((e) => [e.coord.poseId, e]));
  const lines = [`# ${c} の立ち絵差分（NovelAI Desktop で書き出し）`, `# 例: show ${c} ${entries[0] ? tags(entries[0]) : ""}`, ""];
  for (const e of entries) {
    const base = byPose.get(e.coord.poseId);
    if (layers && !e.isBase && base) {
      lines.push(`image ${c} ${tags(e)} = Composite((${w}, ${h}), (0, 0), "${path(base)}", (0, 0), "${path(e)}")`);
    } else {
      lines.push(`image ${c} ${tags(e)} = "${path(e)}"`);
    }
  }
  return {
    images: entries.map((e) => ({ name: e.name, relPath: `game/${path(e)}` })),
    texts: [{ relPath: `game/${c}_sprites.rpy`, content: `${lines.join("\n")}\n` }],
  };
};
