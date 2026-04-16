import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { AssetFolderDto, RandomPresetSettings, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import { MODEL_TO_VIBE_KEY } from "@/lib/constants";
import { expandFolderDescendants, filterVibePool } from "@/lib/random-preset";
import { PseudoFolderRow, FolderTree } from "./RandomPresetFolderTree";

interface RandomPresetSettingsDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  settings: RandomPresetSettings; onSettingsChange: (settings: RandomPresetSettings) => void;
  allVibes: VibeDto[]; currentModel: string;
}

export default function RandomPresetSettingsDialog({ open, onOpenChange, settings, onSettingsChange, allVibes, currentModel }: RandomPresetSettingsDialogProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState<RandomPresetSettings>(settings);
  const [allFolders, setAllFolders] = useState<AssetFolderDto[]>([]);
  const [freshVibes, setFreshVibes] = useState<VibeDto[] | null>(null);

  useEffect(() => { if (open) setLocal(settings); }, [open, settings]);
  useEffect(() => {
    if (!open) { setFreshVibes(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [vibesList, roots] = await Promise.all([ipc.listVibes(), ipc.listVibeFolderRoots()]);
        if (!cancelled) setFreshVibes(vibesList);
        const collected: AssetFolderDto[] = [...roots];
        const queue: AssetFolderDto[] = roots.filter((f) => f.childCount > 0);
        while (queue.length > 0) {
          const batch = queue.splice(0, queue.length);
          const results = await Promise.all(batch.map((f) => ipc.listVibeFolderChildren(f.id)));
          for (const children of results) { collected.push(...children); for (const c of children) { if (c.childCount > 0) queue.push(c); } }
        }
        if (!cancelled) setAllFolders(collected);
      } catch { if (!cancelled) setAllFolders([]); }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const vibes = freshVibes ?? allVibes;
  const directCountByFolder = useMemo(() => { const map = new Map<number, number>(); for (const v of vibes) { if (v.folderId != null) map.set(v.folderId, (map.get(v.folderId) ?? 0) + 1); } return map; }, [vibes]);
  const unclassifiedCount = useMemo(() => vibes.filter((v) => v.folderId == null).length, [vibes]);
  const folderScopedVibes = useMemo(() => {
    if (local.folderIds.length === 0) return vibes;
    const realIds = local.folderIds.filter((id) => id >= 0);
    const includeUnclassified = local.folderIds.includes(-1);
    const allowed = expandFolderDescendants(realIds, allFolders);
    return vibes.filter((v) => { if (v.folderId == null) return includeUnclassified; return allowed.has(v.folderId); });
  }, [vibes, local.folderIds, allFolders]);
  const folderScopedCount = folderScopedVibes.length;
  const modelExcludedCount = useMemo(() => { const vibeKey = MODEL_TO_VIBE_KEY[currentModel]; if (!vibeKey) return 0; return folderScopedVibes.filter((v) => v.model !== vibeKey).length; }, [folderScopedVibes, currentModel]);
  const candidateCount = useMemo(() => filterVibePool(vibes, local, currentModel, allFolders).length, [vibes, local, currentModel, allFolders]);

  const update = (patch: Partial<RandomPresetSettings>) => { const next = { ...local, ...patch }; setLocal(next); onSettingsChange(next); };
  const toggleFolder = (folderId: number) => { update({ folderIds: local.folderIds.includes(folderId) ? local.folderIds.filter((id) => id !== folderId) : [...local.folderIds, folderId] }); };
  const UNCLASSIFIED_ID = -1;
  const allSelected = local.folderIds.length === 0;
  const unclassifiedSelected = local.folderIds.includes(UNCLASSIFIED_ID);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-sm">{t("style.randomSettings")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <SettingRow label={t("style.randomVibeCount")}>
            <ModeToggle isRandom={local.vibeCount === "random"} onToggle={(r) => update({ vibeCount: r ? "random" : 2 })} />
            {local.vibeCount !== "random" && <Input type="number" min={1} max={4} value={local.vibeCount} onChange={(e) => update({ vibeCount: clamp(Number(e.target.value), 1, 4) })} className="h-7 w-16 text-xs" />}
          </SettingRow>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("style.randomArtistTagCount")}</Label>
            <div className="flex items-center gap-2">
              <TriToggle value={local.artistTagCount === 0 ? "none" : local.artistTagCount === "random" ? "random" : "fixed"} onChange={(v) => update({ artistTagCount: v === "none" ? 0 : v === "random" ? "random" : 1 })} />
              {local.artistTagCount !== "random" && local.artistTagCount !== 0 && <Input type="number" min={1} max={100} value={local.artistTagCount} onChange={(e) => update({ artistTagCount: clamp(Number(e.target.value), 1, 100) })} className="h-7 w-16 text-xs" />}
            </div>
            {local.artistTagCount === "random" && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{t("style.randomMin")}</span>
                <Input type="number" min={0} max={100} value={local.artistTagCountMin} onChange={(e) => { const v = clamp(Number(e.target.value), 0, 100); update({ artistTagCountMin: Math.min(v, local.artistTagCountMax) }); }} className="h-7 w-16 text-xs" />
                <span className="text-[10px] text-muted-foreground">{t("style.randomMax")}</span>
                <Input type="number" min={0} max={100} value={local.artistTagCountMax} onChange={(e) => { const v = clamp(Number(e.target.value), 0, 100); update({ artistTagCountMax: Math.max(v, local.artistTagCountMin) }); }} className="h-7 w-16 text-xs" />
              </div>
            )}
          </div>
          {local.artistTagCount !== 0 && <ArtistStrengthSection local={local} update={update} />}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("style.randomVibeStrengthRange")}</Label>
            <SliderRow label={t("style.randomMin")} min={0} max={1} step={0.05} value={local.vibeStrengthMin} onChange={(v) => update({ vibeStrengthMin: Math.min(v, local.vibeStrengthMax) })} fmt={(v) => v.toFixed(2)} />
            <SliderRow label={t("style.randomMax")} min={0} max={1} step={0.05} value={local.vibeStrengthMax} onChange={(v) => update({ vibeStrengthMax: Math.max(v, local.vibeStrengthMin) })} fmt={(v) => v.toFixed(2)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="favorites-only" checked={local.favoritesOnly} onCheckedChange={(checked) => update({ favoritesOnly: checked === true })} />
            <Label htmlFor="favorites-only" className="text-xs cursor-pointer">{t("style.randomFavoritesOnly")}</Label>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("style.randomFolderScope")}</Label>
              {local.folderIds.length > 0 && <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground underline" onClick={() => update({ folderIds: [] })}>{t("style.randomFolderClear")}</button>}
            </div>
            <p className="text-[10px] text-muted-foreground">{t("style.randomFolderHint")}</p>
            <div className="rounded-md border border-border p-1 max-h-48 overflow-y-auto">
              <PseudoFolderRow label={t("style.randomFolderAll")} checked={allSelected} onClick={() => update({ folderIds: [] })} count={vibes.length} />
              <PseudoFolderRow label={t("style.randomFolderUnclassified")} checked={unclassifiedSelected} onClick={() => toggleFolder(UNCLASSIFIED_ID)} count={unclassifiedCount} />
              {allFolders.length > 0 && <FolderTree folders={allFolders} selectedIds={local.folderIds} onToggle={toggleFolder} directCountByFolder={directCountByFolder} />}
              {allFolders.length === 0 && <p className="text-[10px] text-muted-foreground px-2 py-1">{t("style.randomFolderEmpty")}</p>}
            </div>
          </div>
          <div className="space-y-0.5 text-[11px] text-muted-foreground border-t border-border pt-2">
            <div>{t("style.randomFolderVibeTotal", { count: folderScopedCount })}</div>
            {modelExcludedCount > 0 && <div className="text-amber-600 dark:text-amber-500">{t("style.randomModelExcluded", { count: modelExcludedCount })}</div>}
            <div>{t("style.randomCandidateCount", { count: candidateCount })}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div className="space-y-1.5"><Label className="text-xs">{label}</Label><div className="flex items-center gap-2">{children}</div></div>);
}

function ModeToggle({ isRandom, onToggle }: { isRandom: boolean; onToggle: (random: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      <button type="button" className={`px-2 py-0.5 text-[10px] ${isRandom ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`} onClick={() => onToggle(true)}>{t("style.randomOptionRandom")}</button>
      <button type="button" className={`px-2 py-0.5 text-[10px] ${!isRandom ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`} onClick={() => onToggle(false)}>{t("style.randomOptionFixed")}</button>
    </div>
  );
}

type TriValue = "none" | "random" | "fixed";
function TriToggle({ value, onChange }: { value: TriValue; onChange: (v: TriValue) => void }) {
  const { t } = useTranslation();
  const options: { key: TriValue; label: string }[] = [{ key: "none", label: t("style.randomOptionNone") }, { key: "random", label: t("style.randomOptionRandom") }, { key: "fixed", label: t("style.randomOptionFixed") }];
  return (
    <div className="flex rounded-md border border-border overflow-hidden">
      {options.map((opt) => (<button key={opt.key} type="button" className={`px-2 py-0.5 text-[10px] ${value === opt.key ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`} onClick={() => onChange(opt.key)}>{opt.label}</button>))}
    </div>
  );
}

function SliderRow({ label, min, max, step, value, onChange, fmt }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} className="flex-1" />
      <span className="text-xs text-muted-foreground w-8 text-right">{fmt(value)}</span>
    </div>
  );
}

function ArtistStrengthSection({ local, update }: { local: RandomPresetSettings; update: (p: Partial<RandomPresetSettings>) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t("style.randomArtistTagStrength")}</Label>
      <div className="flex items-center gap-2">
        <ModeToggle isRandom={local.artistTagStrength === "random"} onToggle={(r) => update({ artistTagStrength: r ? "random" : 0 })} />
        {local.artistTagStrength !== "random" && (
          <div className="flex items-center gap-2 flex-1">
            <Slider min={0} max={10} step={0.5} value={[local.artistTagStrength]} onValueChange={([v]) => update({ artistTagStrength: v })} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{local.artistTagStrength === 0 ? "\u2014" : local.artistTagStrength.toFixed(1)}</span>
          </div>
        )}
      </div>
      {local.artistTagStrength === "random" && (
        <>
          <SliderRow label={t("style.randomMin")} min={0} max={10} step={0.5} value={local.artistTagStrengthMin} onChange={(v) => update({ artistTagStrengthMin: Math.min(v, local.artistTagStrengthMax) })} fmt={(v) => v.toFixed(1)} />
          <SliderRow label={t("style.randomMax")} min={0} max={10} step={0.5} value={local.artistTagStrengthMax} onChange={(v) => update({ artistTagStrengthMax: Math.max(v, local.artistTagStrengthMin) })} fmt={(v) => v.toFixed(1)} />
        </>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
