import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cellStateOf, useSpriteStore } from "@/stores/sprite-store";
import * as spriteIpc from "@/lib/ipc-sprite";
import { buildEntries } from "@/lib/sprite/export/entries";
import { buildExportPlan, previewTexts, targetSupportsLayers } from "@/lib/sprite/export/plan";
import { TARGETS } from "@/lib/sprite/export/types";
import { allCells, cellKey } from "@/lib/sprite/cells";
import type { SpriteExportTarget } from "@/lib/sprite/spec";
import { toastError } from "@/lib/toast-error";
import { CommitInput, Section, chip, updateSpec } from "../define/common";

const SCALES = [1, 0.75, 0.5, 0.25];
const ATLAS_SIZES = [2048, 4096, 8192];

export default function SpriteExportView() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec)!;
  const setId = useSpriteStore((s) => s.activeSetId)!;
  const cells = useSpriteStore((s) => s.cells);
  const [busy, setBusy] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const ex = spec.export;
  const patch = (p: Partial<typeof ex>) => updateSpec((s) => ({ ...s, export: { ...s.export, ...p } }));

  const entries = useMemo(() => buildEntries(spec, cellStateOf), [spec, cells]); // eslint-disable-line react-hooks/exhaustive-deps
  const missing = useMemo(
    () => allCells(spec).map(cellKey).filter((k) => !cells[k]?.adoptedImageId && !cells[k]?.excluded).length,
    [spec, cells],
  );
  const preview = useMemo(() => previewTexts(spec, entries), [spec, entries]);
  const layersOk = targetSupportsLayers(ex.target);
  const tokens = ["{char}", "{pose}", ...spec.axes.map((a) => `{${a.key}}`), "{index}"];

  const run = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const dir = await open({ directory: true, defaultPath: ex.lastDir ?? undefined });
    if (typeof dir !== "string") return;
    patch({ lastDir: dir });
    setBusy(true);
    try {
      const plan = await buildExportPlan(spec, setId, dir, entries);
      const res = await spriteIpc.exportSpriteSet(plan);
      toast.success(t("sprite.export.done", { count: res.files.length, dir: res.outDir }));
    } catch (e) {
      toastError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <Section title={t("sprite.export.target")} hint={t(`sprite.export.targets.${ex.target}.desc`)}>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t("sprite.export.target")}>
          {TARGETS.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={ex.target === x.id} className={chip(ex.target === x.id)}
              onClick={() => patch({ target: x.id as SpriteExportTarget })}>
              {t(`sprite.export.targets.${x.id}.name`)}
            </button>
          ))}
        </div>
      </Section>
      <Section title={t("sprite.export.options")}>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label className="text-xs">{t("sprite.export.nameTemplate")}</Label>
            <CommitInput value={ex.nameTemplate} className="font-mono" onCommit={(v) => patch({ nameTemplate: v.trim() || "{char}_{pose}" })} />
            <div className="flex flex-wrap gap-1">
              {tokens.map((tok) => (
                <button key={tok} type="button" className={chip(ex.nameTemplate.includes(tok))}
                  onClick={() => patch({ nameTemplate: ex.nameTemplate.includes(tok) ? ex.nameTemplate : `${ex.nameTemplate}_${tok}` })}>
                  {tok}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Label className="text-xs">{t("sprite.export.scale")}</Label>
              <Select value={String(ex.scale)} onValueChange={(v) => patch({ scale: Number(v) })}>
                <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCALES.map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs">
                      {Math.round(s * 100)}% ({Math.round(spec.width * s)}×{Math.round(spec.height * s)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className={`flex items-center gap-2 ${layersOk ? "" : "opacity-50"}`} title={t("sprite.export.layersHint")}>
              <Switch checked={ex.layers && layersOk} disabled={!layersOk} onCheckedChange={(v) => patch({ layers: v })} />
              {t("sprite.export.layers")}
            </label>
            {ex.target === "web-atlas" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">{t("sprite.export.atlasSize")}</Label>
                <Select value={String(ex.atlasMaxSize)} onValueChange={(v) => patch({ atlasMaxSize: Number(v) })}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATLAS_SIZES.map((s) => <SelectItem key={s} value={String(s)} className="text-xs">{s}px</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {ex.layers && layersOk && <p className="text-[11px] text-muted-foreground">{t("sprite.export.layersNote")}</p>}
        </div>
      </Section>
      <Section title={t("sprite.export.contents")}>
        <div className="space-y-2 text-xs">
          <p>{t("sprite.export.summary", { count: entries.length, missing })}</p>
          <ul className="max-h-40 overflow-y-auto rounded border border-border p-2 font-mono text-[11px]">
            {entries.map((e) => <li key={e.cellKey}>{e.name}.png <span className="text-muted-foreground">({e.id})</span></li>)}
            {entries.length === 0 && <li className="text-muted-foreground">{t("sprite.export.nothing")}</li>}
          </ul>
          <button type="button" className="flex items-center gap-1 font-medium" onClick={() => setShowFiles((v) => !v)}>
            {showFiles ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {t("sprite.export.files", { count: preview.images.length + preview.texts.length + (preview.atlas ? 1 : 0) })}
          </button>
          {showFiles && (
            <div className="space-y-2">
              {preview.atlas && <p className="font-mono text-[11px]">{preview.atlas.relDir}/{preview.atlas.name}-N.png / .json</p>}
              {preview.texts.map((f) => (
                <details key={f.relPath} className="rounded border border-border">
                  <summary className="cursor-pointer px-2 py-1 font-mono text-[11px]">{f.relPath}</summary>
                  <pre className="max-h-64 overflow-auto bg-muted/40 p-2 text-[10px] leading-snug">{f.content}</pre>
                </details>
              ))}
            </div>
          )}
          <Button className="gap-1" disabled={busy || entries.length === 0} onClick={() => { void run(); }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
            {t("sprite.export.run")}
          </Button>
        </div>
      </Section>
    </div>
  );
}
