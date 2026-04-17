import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MAX_CHARACTERS } from "@/lib/constants";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { GenreDto, PromptPresetDto } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PromptPresetDto | null;
  genres: GenreDto[];
  targetId: string;
}

export default function ApplyPresetDialog({ open, onOpenChange, preset, genres }: Props) {
  const { t } = useTranslation();
  const characters = useGenerationParamsStore((s) => s.characters);
  const addCharacter = useGenerationParamsStore((s) => s.addCharacter);
  const clearCharacters = useGenerationParamsStore((s) => s.clearCharacters);
  const initTarget = useSidebarPromptStore((s) => s.initTarget);
  const setPromptOverride = useSidebarPromptStore((s) => s.setPromptOverride);
  const setNegativeOverride = useSidebarPromptStore((s) => s.setNegativeOverride);

  const [mode, setMode] = useState<"add" | "replace">("replace");
  const [genreOverrides, setGenreOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open || !preset) return;
    setMode("replace");
    const overrides: Record<number, string> = {};
    preset.slots.forEach((slot, idx) => {
      if (!slot.genreId && genres.length > 0) overrides[idx] = genres[0].id;
    });
    setGenreOverrides(overrides);
  }, [open, preset, genres]);

  if (!preset) return null;

  const slotCount = preset.slots.length;
  const existingCount = characters.length;
  const canAdd = existingCount + slotCount <= MAX_CHARACTERS;

  const getGenreForSlot = (slotIdx: number): { name: string; id: string; icon: string; color: string } => {
    const slot = preset.slots[slotIdx];
    const genreId = slot.genreId ?? genreOverrides[slotIdx];
    const genre = genres.find((g) => g.id === genreId);
    if (genre) return { name: genre.name, id: genre.id, icon: genre.icon, color: genre.color };
    return { name: "Character", id: "genre-other", icon: "User", color: "#888888" };
  };

  const handleApply = () => {
    if (mode === "replace") clearCharacters();

    for (let i = 0; i < preset.slots.length; i++) {
      const genre = getGenreForSlot(i);
      addCharacter(genre);
    }

    const updatedChars = useGenerationParamsStore.getState().characters;
    const startIdx = mode === "replace" ? 0 : existingCount;

    for (let i = 0; i < preset.slots.length; i++) {
      const slot = preset.slots[i];
      const charId = updatedChars[startIdx + i]?.id;
      if (!charId) continue;
      initTarget(charId);
      if (slot.positivePrompt) setPromptOverride(charId, slot.positivePrompt);
      if (slot.negativePrompt) setNegativeOverride(charId, slot.negativePrompt);
    }

    onOpenChange(false);
  };

  const allGenresSelected = preset.slots.every((slot, idx) => slot.genreId || genreOverrides[idx]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("preset.applyTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border p-2.5">
            <div className="text-xs font-medium mb-2">{preset.name}</div>
            {preset.slots.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1">
                <span className="text-[10px] text-muted-foreground w-16 shrink-0 truncate">
                  {slot.slotLabel || `Slot ${idx + 1}`}
                </span>
                {slot.genreId ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">
                    {genres.find((g) => g.id === slot.genreId)?.name ?? slot.genreId}
                  </span>
                ) : (
                  <Select value={genreOverrides[idx] ?? ""} onValueChange={(v) => setGenreOverrides((prev) => ({ ...prev, [idx]: v }))}>
                    <SelectTrigger className="h-6 w-32 text-[10px]"><SelectValue placeholder={t("preset.selectGenre")} /></SelectTrigger>
                    <SelectContent>
                      {genres.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {slot.role !== "none" && (
                  <span className="text-[9px] px-1 py-0.5 rounded-sm bg-primary/10 text-primary font-mono">{slot.role}</span>
                )}
              </div>
            ))}
          </div>

          <RadioGroup value={mode} onValueChange={(v: string) => setMode(v as "add" | "replace")} className="space-y-1">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="replace" id="mode-replace" />
              <Label htmlFor="mode-replace" className="text-xs cursor-pointer">{t("preset.replaceExisting")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="add" id="mode-add" disabled={!canAdd} />
              <Label htmlFor="mode-add" className={`text-xs cursor-pointer ${!canAdd ? "text-muted-foreground" : ""}`}>
                {t("preset.addToExisting")}
              </Label>
            </div>
          </RadioGroup>

          {mode === "add" && !canAdd && (
            <div className="flex items-center gap-1.5 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {t("preset.maxCharactersWarning", { max: MAX_CHARACTERS })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button size="sm" disabled={!allGenresSelected} onClick={handleApply}>{t("preset.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
