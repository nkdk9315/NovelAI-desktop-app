import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { MODELS } from "@/lib/constants";
import type { ArtistTag, PresetVibeRef, StylePresetDto, VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";
import VibePickerModal from "./VibePickerModal";
import ArtistTagInput from "./ArtistTagInput";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: StylePresetDto | null;
  onSaved?: (preset: StylePresetDto) => void;
}

export default function StylePresetEditorModal({ open, onOpenChange, preset, onSaved }: Props) {
  const { t } = useTranslation();
  const isNew = !preset?.id;
  const currentModel = useGenerationParamsStore((s) => s.model);

  const [name, setName] = useState(preset?.name ?? "");
  const [model, setModel] = useState(currentModel);
  const [artistTags, setArtistTags] = useState<ArtistTag[]>(preset?.artistTags ?? []);
  const [vibeRefs, setVibeRefs] = useState<PresetVibeRef[]>(preset?.vibeRefs ?? []);
  const [selectedVibes, setSelectedVibes] = useState<VibeDto[]>([]);
  const MAX_PRESET_VIBES = 4;
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(
    preset?.thumbnailPath ?? null,
  );
  const [vibePickerOpen, setVibePickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevVibeCount = useRef(vibeRefs.length);

  // Auto-scroll to bottom when vibes are added
  useEffect(() => {
    if (vibeRefs.length > prevVibeCount.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    }
    prevVibeCount.current = vibeRefs.length;
  }, [vibeRefs.length]);

  // Load vibe details for display
  useEffect(() => {
    if (!open) return;
    const ids = vibeRefs.map((vr) => vr.vibeId);
    ipc.listVibes().then((allVibes) => {
      setSelectedVibes(allVibes.filter((v) => ids.includes(v.id)));
    }).catch(() => {});
  }, [open, vibeRefs]);

  const handleRemoveVibe = (vibeId: string) => {
    setVibeRefs((prev) => prev.filter((vr) => vr.vibeId !== vibeId));
  };

  const handleVibeStrength = (vibeId: string, strength: number) => {
    setVibeRefs((prev) => prev.map((vr) => vr.vibeId === vibeId ? { ...vr, strength } : vr));
  };

  const handleVibePickerConfirm = (ids: string[]) => {
    setVibeRefs((prev) => {
      const existing = new Map(prev.map((vr) => [vr.vibeId, vr]));
      return ids.slice(0, MAX_PRESET_VIBES).map((id) => existing.get(id) ?? { vibeId: id, strength: 0.7 });
    });
  };

  const handleSelectThumbnail = async () => {
    try {
      const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }],
      });
      if (selected) setThumbnailPath(selected as string);
    } catch (e) {
      toastError(String(e));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (isNew) {
        let created = await ipc.createStylePreset({
          name: name.trim(),
          artistTags,
          vibeRefs,
          model,
        });
        if (thumbnailPath) {
          created = await ipc.updatePresetThumbnail({ id: created.id, thumbnailPath });
        }
        onSaved?.(created);
      } else {
        await ipc.updateStylePreset({
          id: preset.id,
          name: name.trim(),
          artistTags,
          vibeRefs,
        });
        if (thumbnailPath && thumbnailPath !== preset.thumbnailPath) {
          await ipc.updatePresetThumbnail({ id: preset.id, thumbnailPath });
        } else if (!thumbnailPath && preset.thumbnailPath) {
          await ipc.clearPresetThumbnail(preset.id);
        }
      }
      toast.success(t("style.saveSuccess"));
      onOpenChange(false);
    } catch (e) {
      toastError(String(e));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isNew ? t("style.newPresetTitle") : t("style.editPresetTitle")}
            </DialogTitle>
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("style.presetName")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("style.presetNamePlaceholder")}
                  className="h-8 text-xs"
                />
              </div>

              {/* Model + Thumbnail */}
              <div className="flex gap-4 items-start">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">{t("vibe.selectModel")}</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="shrink-0 space-y-1.5">
                  <Label className="text-xs">{t("style.thumbnail")}</Label>
                  <div className="flex items-center gap-2">
                    {thumbnailPath ? (
                      <div className="h-12 w-12 rounded border border-border overflow-hidden bg-muted">
                        <img src={`asset://localhost/${thumbnailPath}`} alt="" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded border border-dashed border-border flex items-center justify-center bg-muted">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={handleSelectThumbnail}>
                        {t("style.changeThumbnail")}
                      </Button>
                      {thumbnailPath && (
                        <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setThumbnailPath(null)}>
                          {t("style.clearThumbnail")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Artist tags */}
              <ArtistTagInput artistTags={artistTags} onArtistTagsChange={setArtistTags} />

              <Separator />

              {/* Vibes — display selected + add button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("style.vibes")}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setVibePickerOpen(true)}
                    disabled={vibeRefs.length >= MAX_PRESET_VIBES}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {t("style.addVibe")} ({vibeRefs.length}/{MAX_PRESET_VIBES})
                  </Button>
                </div>
                {selectedVibes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">{t("vibe.empty")}</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedVibes.map((vibe) => {
                      const ref = vibeRefs.find((vr) => vr.vibeId === vibe.id);
                      return (
                        <div key={vibe.id} className="rounded-md border border-border p-1.5 space-y-1">
                          <div className="flex items-center gap-2">
                            {vibe.thumbnailPath ? (
                              <img src={`asset://localhost/${vibe.thumbnailPath}`} alt="" className="h-8 w-8 rounded object-contain shrink-0 bg-muted" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-xs truncate flex-1">{vibe.name}</span>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => handleRemoveVibe(vibe.id)}>
                              <X className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 pl-10">
                            <span className="text-[10px] text-muted-foreground w-8">{t("vibe.strength")}</span>
                            <Slider min={0} max={1} step={0.01} value={[ref?.strength ?? 0.7]} onValueChange={([v]) => handleVibeStrength(vibe.id, v)} className="flex-1" />
                            <span className="text-[10px] text-muted-foreground w-8 text-right">{(ref?.strength ?? 0.7).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VibePickerModal
        open={vibePickerOpen}
        onOpenChange={setVibePickerOpen}
        selectedVibeIds={vibeRefs.map((vr) => vr.vibeId)}
        modelFilter={model}
        maxVibes={MAX_PRESET_VIBES}
        onConfirm={handleVibePickerConfirm}
      />
    </>
  );
}
