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
  onSave: (data: { name: string; genreId?: string; tags: TagInput[]; isDefault: boolean }) => void;
}

export default function PromptGroupAddModal({
  open,
  onOpenChange,
  genres,
  onSave,
}: PromptGroupAddModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagInput[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      genreId: genreId ?? undefined,
      tags,
      isDefault,
    });
    // Reset
    setName("");
    setGenreId(null);
    setTags([]);
    setIsDefault(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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

          <div className="space-y-1">
            <Label className="text-xs">{t("promptGroup.genre")}</Label>
            <Select
              value={genreId ?? "none"}
              onValueChange={(v) => setGenreId(v === "none" ? null : v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            <Label className="text-xs">{t("promptGroup.defaultForGenre")}</Label>
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
