import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ChevronDown, ChevronRight, Power, Trash2, Pencil, SlidersHorizontal, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toastError } from "@/lib/toast-error";
import { useSidebarPresetGroupStore } from "@/stores/sidebar-preset-group-store";
import { usePresetStore } from "@/stores/preset-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import type {
  PromptPresetDto, SidebarPresetGroupInstanceDto, CreatePromptPresetRequest,
} from "@/types";
import PresetEditorModal from "@/components/modals/preset/PresetEditorModal";
import EditPairPopover from "./EditPairPopover";
import DefaultStrengthPopover from "./DefaultStrengthPopover";
import PresetStrengthPopover from "./PresetStrengthPopover";

interface Props {
  instance: SidebarPresetGroupInstanceDto;
}

export default function SidebarPresetGroupInstanceCard({ instance }: Props) {
  const { t } = useTranslation();
  const togglePreset = useSidebarPresetGroupStore((s) => s.togglePreset);
  const removeInstance = useSidebarPresetGroupStore((s) => s.removeInstance);
  const presets = usePresetStore((s) => s.presets);
  const presetFolders = usePresetStore((s) => s.presetFolders);
  const updatePreset = usePresetStore((s) => s.updatePreset);
  const createPreset = usePresetStore((s) => s.createPreset);
  const loadPresets = usePresetStore((s) => s.loadPresets);
  const renamePresetFolder = usePresetStore((s) => s.renamePresetFolder);
  const characters = useGenerationParamsStore((s) => s.characters);

  const [expanded, setExpanded] = useState(true);
  const [editingPair, setEditingPair] = useState(false);
  const [defaultStrengthOpen, setDefaultStrengthOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PromptPresetDto | null>(null);
  const [strengthTargetPresetId, setStrengthTargetPresetId] = useState<string | null>(null);
  const [showNewPreset, setShowNewPreset] = useState(false);
  const [renameInput, setRenameInput] = useState<string | null>(null);

  const folder = presetFolders.find((f) => f.id === instance.folderId);
  const presetsInFolder = useMemo(
    () => presets.filter((p) => p.folderId === instance.folderId),
    [presets, instance.folderId],
  );

  const sourceLabel = labelForCharacter(instance.sourceCharacterId, characters);
  const targetLabel = labelForCharacter(instance.targetCharacterId, characters);
  const activeCount = instance.activePresets.length;
  const activeIds = useMemo(
    () => new Set(instance.activePresets.map((a) => a.presetId)),
    [instance.activePresets],
  );

  const strengthTargetPreset = strengthTargetPresetId
    ? instance.activePresets.find((a) => a.presetId === strengthTargetPresetId)
    : null;

  const handlePresetEdit = async (data: CreatePromptPresetRequest) => {
    if (!editingPreset) return;
    await updatePreset({
      id: editingPreset.id,
      name: data.name,
      folderId: data.folderId,
      slots: data.slots,
    });
    await loadPresets();
  };

  const handlePresetCreate = async (data: CreatePromptPresetRequest) => {
    await createPreset({ ...data, folderId: instance.folderId });
  };

  const submitRename = async () => {
    if (renameInput === null) return;
    const title = renameInput.trim();
    if (!title || !folder) { setRenameInput(null); return; }
    try {
      await renamePresetFolder(folder.id, title);
    } catch (e) {
      toastError(String(e));
    } finally {
      setRenameInput(null);
    }
  };

  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-1">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1 text-xs font-medium"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="truncate">{folder?.title ?? t("sidebarPresetGroups.unknownFolder")}</span>
              <span className="shrink-0 text-[9px] text-muted-foreground">
                {activeCount}/{presetsInFolder.length}
              </span>
            </button>
          </ContextMenuTrigger>
          {folder && (
            <ContextMenuContent className="min-w-[9rem] p-0.5 text-[11px]">
              <ContextMenuItem
                className="text-[11px] py-1 px-2"
                onClick={() => setRenameInput(folder.title)}
              >
                <Pencil className="h-3 w-3 mr-1.5" />
                {t("preset.folder.rename")}
              </ContextMenuItem>
            </ContextMenuContent>
          )}
        </ContextMenu>
        <button
          type="button"
          title={t("preset.folder.createPresetHere")}
          onClick={() => setShowNewPreset(true)}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          title={t("sidebarPresetGroups.defaultStrength.title")}
          onClick={() => setDefaultStrengthOpen(true)}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent"
        >
          <SlidersHorizontal className="h-3 w-3" />
        </button>
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeInstance(instance.id)}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>

      <button
        type="button"
        className="mt-1 flex items-center gap-1 rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
        onClick={() => setEditingPair(true)}
      >
        <span className="truncate max-w-[6rem]">{targetLabel}</span>
        <ArrowRight className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate max-w-[6rem]">{sourceLabel}</span>
        <Pencil className="h-2.5 w-2.5 shrink-0 ml-0.5 opacity-60" />
      </button>

      {expanded && (
        <div className="mt-1.5">
          {presetsInFolder.length === 0 ? (
            <div className="text-[10px] text-muted-foreground px-1">
              {t("sidebarPresetGroups.emptyFolder")}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {presetsInFolder.map((p) => {
                const isActive = activeIds.has(p.id);
                const active = instance.activePresets.find((a) => a.presetId === p.id);
                const hasOverride = !!active && (active.positiveStrength !== null || active.negativeStrength !== null);
                return (
                  <ContextMenu key={p.id}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => togglePreset(instance.id, p.id)}
                        title={p.name}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tracking-wide transition-all max-w-[9rem] ${
                          isActive
                            ? "border-primary/60 bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(from_var(--primary)_l_c_h_/_0.2)] hover:bg-primary/25"
                            : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Power className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate font-medium">{p.name}</span>
                        {hasOverride && (
                          <span
                            title={t("sidebarPresetGroups.presetStrength.customBadge")}
                            className="shrink-0 rounded bg-primary/20 px-0.5 text-[9px]"
                          >
                            ±
                          </span>
                        )}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="min-w-[9rem] p-0.5 text-[11px]">
                      <ContextMenuItem
                        className="text-[11px] py-1 px-2"
                        onClick={() => setEditingPreset(p)}
                      >
                        <Pencil className="h-3 w-3 mr-1.5" />
                        {t("common.edit")}
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-[11px] py-1 px-2"
                        disabled={!isActive}
                        onClick={() => { if (isActive) setStrengthTargetPresetId(p.id); }}
                      >
                        <SlidersHorizontal className="h-3 w-3 mr-1.5" />
                        {t("sidebarPresetGroups.presetStrength.title")}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          )}
        </div>
      )}

      <EditPairPopover
        open={editingPair}
        onOpenChange={setEditingPair}
        instance={instance}
      />
      <DefaultStrengthPopover
        open={defaultStrengthOpen}
        onOpenChange={setDefaultStrengthOpen}
        instance={instance}
      />
      <PresetStrengthPopover
        open={strengthTargetPresetId !== null}
        onOpenChange={(v) => { if (!v) setStrengthTargetPresetId(null); }}
        instance={instance}
        active={strengthTargetPreset ?? null}
      />
      <PresetEditorModal
        open={editingPreset !== null}
        onOpenChange={(o) => { if (!o) setEditingPreset(null); }}
        preset={editingPreset}
        folders={presetFolders}
        onSave={handlePresetEdit}
      />
      <PresetEditorModal
        open={showNewPreset}
        onOpenChange={setShowNewPreset}
        preset={null}
        folders={presetFolders}
        initialFolderId={instance.folderId}
        onSave={handlePresetCreate}
      />
      <Dialog open={renameInput !== null} onOpenChange={(o) => { if (!o) setRenameInput(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("preset.folder.rename")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameInput ?? ""}
            onChange={(e) => setRenameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitRename(); } }}
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameInput(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => void submitRename()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function labelForCharacter(
  characterId: string,
  characters: { id: string; genreName: string }[],
): string {
  if (characterId === "main") return "Main";
  const idx = characters.findIndex((c) => c.id === characterId);
  if (idx < 0) return "?";
  const c = characters[idx];
  return `#${idx + 1} ${c.genreName}`;
}
