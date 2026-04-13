import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TagEditor from "./TagEditor";
import type { GenreDto, TagInput } from "@/types";

interface PromptGroupAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genres: GenreDto[];
  onSave: (data: { name: string; genreId?: string; tags: TagInput[]; isDefault: boolean; defaultStrength: number }) => void;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

export default function PromptGroupAddModal({
  open,
  onOpenChange,
  genres,
  onSave,
  contentClassName,
  contentStyle,
}: PromptGroupAddModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagInput[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [defaultStrength, setDefaultStrength] = useState(0);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      genreId: genreId ?? undefined,
      tags,
      isDefault,
      defaultStrength,
    });
    // Reset
    setName("");
    setGenreId(null);
    setTags([]);
    setIsDefault(false);
    setDefaultStrength(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName ?? "max-w-md"} style={contentStyle}>
        <DialogHeader>
          <DialogTitle>{t("promptGroup.newGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("promptGroup.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("promptGroup.namePlaceholder")}
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={genreId ?? "none"}
              onValueChange={(v) => setGenreId(v === "none" ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label className="text-[10px] text-muted-foreground">{t("promptGroup.defaultForGenre")}</Label>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Slider
                min={-10} max={10} step={0.1}
                value={[defaultStrength]}
                onValueChange={([v]) => setDefaultStrength(Math.round(v * 10) / 10)}
                className="w-20 [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-range]]:h-0.5 [&_[data-slot=slider-thumb]]:h-2.5 [&_[data-slot=slider-thumb]]:w-2.5 [&_[data-slot=slider-thumb]]:border"
              />
              <span className="w-9 text-center text-[10px] font-mono bg-muted rounded px-1 py-0.5">
                {defaultStrength > 0 ? "+" : ""}{defaultStrength.toFixed(1)}
              </span>
            </div>
          </div>

          <TagEditor tags={tags} onTagsChange={setTags} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
              {t("common.create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
