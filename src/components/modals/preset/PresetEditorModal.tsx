import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  GenreDto, PresetFolderDto, PresetSlotInput, PromptPresetDto, CreatePromptPresetRequest,
  PresetCharacterSlotDto,
} from "@/types";
import PresetPositionPicker from "./PresetPositionPicker";

// Simplified model: a preset is a 2-role interaction template (source + target).
// Legacy presets with >2 slots, role="none" slots, or genre/slotLabel set are
// silently reduced to first source + first target on load.
interface SlotState {
  positivePrompt: string;
  negativePrompt: string;
  positionX: number;
  positionY: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PromptPresetDto | null;
  // `genres` is unused in the simplified editor — kept for signature stability
  // with callers that still pass it.
  genres?: GenreDto[];
  folders: PresetFolderDto[];
  initialFolderId?: number | null;
  onSave: (data: CreatePromptPresetRequest) => Promise<void>;
  contentClassName?: string;
}

const EMPTY_SLOT: SlotState = { positivePrompt: "", negativePrompt: "", positionX: 0.5, positionY: 0.5 };

function pickFirstByRole(
  slots: PresetCharacterSlotDto[],
  role: "source" | "target",
): SlotState {
  const match = slots.find((s) => s.role === role);
  if (!match) return { ...EMPTY_SLOT };
  return {
    positivePrompt: match.positivePrompt,
    negativePrompt: match.negativePrompt,
    positionX: match.positionX,
    positionY: match.positionY,
  };
}

export default function PresetEditorModal({
  open, onOpenChange, preset, folders, initialFolderId, onSave, contentClassName,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [sourceSlot, setSourceSlot] = useState<SlotState>({ ...EMPTY_SLOT });
  const [targetSlot, setTargetSlot] = useState<SlotState>({ ...EMPTY_SLOT });
  const [interactionTag, setInteractionTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (preset) {
      setName(preset.name);
      setFolderId(preset.folderId);
      setSourceSlot(pickFirstByRole(preset.slots, "source"));
      setTargetSlot(pickFirstByRole(preset.slots, "target"));
    } else {
      setName("");
      setFolderId(initialFolderId ?? null);
      setSourceSlot({ ...EMPTY_SLOT });
      setTargetSlot({ ...EMPTY_SLOT });
    }
    setInteractionTag("");
  }, [open, preset, initialFolderId]);

  const updateSource = (partial: Partial<SlotState>) =>
    setSourceSlot((prev) => ({ ...prev, ...partial }));
  const updateTarget = (partial: Partial<SlotState>) =>
    setTargetSlot((prev) => ({ ...prev, ...partial }));

  // Add `target#tag` to source (the actor targets someone),
  // and `source#tag` to target (the receiver has someone sourcing the action).
  const addInteraction = () => {
    const tag = interactionTag.trim();
    if (!tag) return;
    const sourceSep = sourceSlot.positivePrompt.trim() ? ", " : "";
    const targetSep = targetSlot.positivePrompt.trim() ? ", " : "";
    setSourceSlot((s) => ({ ...s, positivePrompt: s.positivePrompt + sourceSep + `target#${tag}` }));
    setTargetSlot((s) => ({ ...s, positivePrompt: s.positivePrompt + targetSep + `source#${tag}` }));
    setInteractionTag("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const slots: PresetSlotInput[] = [
        {
          slotLabel: "",
          genreId: null,
          positivePrompt: sourceSlot.positivePrompt,
          negativePrompt: sourceSlot.negativePrompt || undefined,
          role: "source",
          positionX: sourceSlot.positionX,
          positionY: sourceSlot.positionY,
        },
        {
          slotLabel: "",
          genreId: null,
          positivePrompt: targetSlot.positivePrompt,
          negativePrompt: targetSlot.negativePrompt || undefined,
          role: "target",
          positionX: targetSlot.positionX,
          positionY: targetSlot.positionY,
        },
      ];
      await onSave({ name: name.trim(), folderId, slots });
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const renderSlotCard = (
    slot: SlotState,
    update: (partial: Partial<SlotState>) => void,
    roleLabel: string,
    roleHint: string,
    peerSlot: SlotState,
    color: string,
    peerColor: string,
  ) => (
    <div className="rounded-md border border-border p-2.5 space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold text-primary">{roleLabel}</span>
        <span className="text-[10px] text-muted-foreground">{roleHint}</span>
      </div>
      <div>
        <Label className="text-[10px]">{t("preset.positivePrompt")}</Label>
        <Textarea
          value={slot.positivePrompt}
          onChange={(e) => update({ positivePrompt: e.target.value })}
          className="mt-0.5 min-h-[3rem] text-[11px] font-mono"
          rows={2}
        />
      </div>
      <div>
        <Label className="text-[10px]">{t("preset.negativePrompt")}</Label>
        <Textarea
          value={slot.negativePrompt}
          onChange={(e) => update({ negativePrompt: e.target.value })}
          className="mt-0.5 min-h-[2rem] text-[11px] font-mono"
          rows={1}
        />
      </div>
      <div>
        <Label className="text-[10px]">{t("preset.position")}</Label>
        <div className="mt-0.5">
          <PresetPositionPicker
            x={slot.positionX}
            y={slot.positionY}
            onChange={(x, y) => update({ positionX: x, positionY: y })}
            color={color}
            peerX={peerSlot.positionX}
            peerY={peerSlot.positionY}
            peerColor={peerColor}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[calc(100vh-4rem)] overflow-y-auto ${contentClassName ?? ""}`}>
        <DialogHeader>
          <DialogTitle className="text-sm">{preset ? t("preset.edit") : t("preset.create")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("preset.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("preset.namePlaceholder")}
              className="mt-1 h-8 text-xs"
            />
          </div>

          {folders.length > 0 && (
            <div>
              <Label className="text-xs">{t("promptGroup.selectFolder")}</Label>
              <Select
                value={folderId?.toString() ?? "__none__"}
                onValueChange={(v) => setFolderId(v === "__none__" ? null : Number(v))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("preset.folder.uncategorized")}</SelectItem>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id.toString()}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {renderSlotCard(
            sourceSlot,
            updateSource,
            t("preset.roleSource"),
            t("preset.roleSourceHint"),
            targetSlot,
            "#a855f7",
            "#f97316",
          )}
          {renderSlotCard(
            targetSlot,
            updateTarget,
            t("preset.roleTarget"),
            t("preset.roleTargetHint"),
            sourceSlot,
            "#f97316",
            "#a855f7",
          )}

          <Separator />

          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5 space-y-2">
            <span className="text-[10px] font-semibold text-primary">{t("preset.interactionHelper")}</span>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <Label className="text-[10px]">{t("preset.interactionTag")}</Label>
                <Input
                  value={interactionTag}
                  onChange={(e) => setInteractionTag(e.target.value)}
                  placeholder={t("preset.interactionTagPlaceholder")}
                  className="mt-0.5 h-7 text-[11px]"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInteraction(); } }}
                />
              </div>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={!interactionTag.trim()}
                onClick={addInteraction}
              >
                {t("preset.addInteraction")}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {t("preset.interactionHelperDescription")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button size="sm" disabled={saving || !name.trim()} onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
