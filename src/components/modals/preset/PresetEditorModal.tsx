import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { GenreDto, PresetFolderDto, PresetSlotInput, PromptPresetDto, CreatePromptPresetRequest } from "@/types";

interface SlotState {
  slotLabel: string;
  genreId: string | null;
  positivePrompt: string;
  negativePrompt: string;
  role: "target" | "source" | "none";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PromptPresetDto | null;
  genres: GenreDto[];
  folders: PresetFolderDto[];
  initialFolderId?: number | null;
  onSave: (data: CreatePromptPresetRequest) => Promise<void>;
  contentClassName?: string;
}

const DEFAULT_SLOT: SlotState = { slotLabel: "", genreId: null, positivePrompt: "", negativePrompt: "", role: "none" };

export default function PresetEditorModal({ open, onOpenChange, preset, genres, folders, initialFolderId, onSave, contentClassName }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotState[]>([{ ...DEFAULT_SLOT }, { ...DEFAULT_SLOT }]);
  const [interactionTag, setInteractionTag] = useState("");
  const [actorIdx, setActorIdx] = useState(0);
  const [receiverIdx, setReceiverIdx] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (preset) {
      setName(preset.name);
      setFolderId(preset.folderId);
      setSlots(preset.slots.map((s) => ({
        slotLabel: s.slotLabel,
        genreId: s.genreId,
        positivePrompt: s.positivePrompt,
        negativePrompt: s.negativePrompt,
        role: s.role,
      })));
    } else {
      setName("");
      setFolderId(initialFolderId ?? null);
      setSlots([{ ...DEFAULT_SLOT }, { ...DEFAULT_SLOT }]);
    }
    setInteractionTag("");
    setActorIdx(0);
    setReceiverIdx(1);
  }, [open, preset, initialFolderId]);

  const updateSlot = (index: number, partial: Partial<SlotState>) => {
    setSlots((prev) => prev.map((s, i) => i === index ? { ...s, ...partial } : s));
  };

  const addSlot = () => setSlots((prev) => [...prev, { ...DEFAULT_SLOT }]);
  const removeSlot = (index: number) => {
    if (slots.length <= 2) return;
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const addInteraction = () => {
    const tag = interactionTag.trim();
    if (!tag || actorIdx === receiverIdx) return;
    setSlots((prev) => prev.map((s, i) => {
      if (i === actorIdx) {
        const sep = s.positivePrompt.trim() ? ", " : "";
        return { ...s, positivePrompt: s.positivePrompt + sep + `target#${tag}` };
      }
      if (i === receiverIdx) {
        const sep = s.positivePrompt.trim() ? ", " : "";
        return { ...s, positivePrompt: s.positivePrompt + sep + `source#${tag}` };
      }
      return s;
    }));
    setInteractionTag("");
  };

  const handleSave = async () => {
    if (!name.trim() || slots.length < 2) return;
    setSaving(true);
    try {
      const slotInputs: PresetSlotInput[] = slots.map((s) => ({
        slotLabel: s.slotLabel,
        genreId: s.genreId,
        positivePrompt: s.positivePrompt,
        negativePrompt: s.negativePrompt || undefined,
        role: s.role,
      }));
      await onSave({ name: name.trim(), folderId, slots: slotInputs });
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[calc(100vh-4rem)] overflow-y-auto ${contentClassName ?? ""}`}>
        <DialogHeader>
          <DialogTitle className="text-sm">{preset ? t("preset.edit") : t("preset.create")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("preset.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("preset.namePlaceholder")} className="mt-1 h-8 text-xs" />
          </div>

          {folders.length > 0 && (
            <div>
              <Label className="text-xs">{t("promptGroup.selectFolder")}</Label>
              <Select value={folderId?.toString() ?? "__none__"} onValueChange={(v) => setFolderId(v === "__none__" ? null : Number(v))}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("preset.folder.uncategorized")}</SelectItem>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id.toString()}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {slots.map((slot, idx) => (
            <div key={idx} className="rounded-md border border-border p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground">{t("preset.slot")} {idx + 1}</span>
                <div className="flex-1" />
                {slots.length > 2 && (
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => removeSlot(idx)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">{t("preset.slotLabel")}</Label>
                  <Input value={slot.slotLabel} onChange={(e) => updateSlot(idx, { slotLabel: e.target.value })}
                    placeholder={t("preset.slotLabelPlaceholder")} className="mt-0.5 h-7 text-[11px]" />
                </div>
                <div>
                  <Label className="text-[10px]">{t("preset.genre")}</Label>
                  <Select value={slot.genreId ?? "__unset__"} onValueChange={(v) => updateSlot(idx, { genreId: v === "__unset__" ? null : v })}>
                    <SelectTrigger className="mt-0.5 h-7 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset__">{t("preset.genreUnset")}</SelectItem>
                      {genres.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">{t("preset.role")}</Label>
                  <Select value={slot.role} onValueChange={(v) => updateSlot(idx, { role: v as SlotState["role"] })}>
                    <SelectTrigger className="mt-0.5 h-7 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("preset.roleNone")}</SelectItem>
                      <SelectItem value="target">{t("preset.roleTarget")}</SelectItem>
                      <SelectItem value="source">{t("preset.roleSource")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[10px]">{t("preset.positivePrompt")}</Label>
                <Textarea value={slot.positivePrompt} onChange={(e) => updateSlot(idx, { positivePrompt: e.target.value })}
                  className="mt-0.5 min-h-[3rem] text-[11px] font-mono" rows={2} />
              </div>
              <div>
                <Label className="text-[10px]">{t("preset.negativePrompt")}</Label>
                <Textarea value={slot.negativePrompt} onChange={(e) => updateSlot(idx, { negativePrompt: e.target.value })}
                  className="mt-0.5 min-h-[2rem] text-[11px] font-mono" rows={1} />
              </div>
            </div>
          ))}

          <Button size="sm" variant="outline" className="w-full h-7 text-[11px]" onClick={addSlot}>
            <Plus className="h-3 w-3 mr-1" />{t("preset.addSlot")}
          </Button>

          <Separator />

          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5 space-y-2">
            <span className="text-[10px] font-semibold text-primary">{t("preset.interactionHelper")}</span>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <Label className="text-[10px]">{t("preset.interactionTag")}</Label>
                <Input value={interactionTag} onChange={(e) => setInteractionTag(e.target.value)}
                  placeholder={t("preset.interactionTagPlaceholder")} className="mt-0.5 h-7 text-[11px]"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInteraction(); } }} />
              </div>
              <div>
                <Label className="text-[10px]">{t("preset.actor")}</Label>
                <Select value={actorIdx.toString()} onValueChange={(v) => {
                  const idx = Number(v);
                  setActorIdx(idx);
                  if (slots.length === 2 && idx === receiverIdx) setReceiverIdx(idx === 0 ? 1 : 0);
                }}>
                  <SelectTrigger className="mt-0.5 h-7 w-24 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {slots.map((s, i) => <SelectItem key={i} value={i.toString()}>{s.slotLabel || `Slot ${i + 1}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">{t("preset.receiver")}</Label>
                <Select value={receiverIdx.toString()} onValueChange={(v) => {
                  const idx = Number(v);
                  setReceiverIdx(idx);
                  if (slots.length === 2 && idx === actorIdx) setActorIdx(idx === 0 ? 1 : 0);
                }}>
                  <SelectTrigger className="mt-0.5 h-7 w-24 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {slots.map((s, i) => <SelectItem key={i} value={i.toString()}>{s.slotLabel || `Slot ${i + 1}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="h-7 px-2 text-[11px]" disabled={!interactionTag.trim() || actorIdx === receiverIdx}
                onClick={addInteraction}>{t("preset.addInteraction")}</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button size="sm" disabled={saving || !name.trim() || slots.length < 2} onClick={() => void handleSave()}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
