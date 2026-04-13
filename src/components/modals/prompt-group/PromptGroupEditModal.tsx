import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TagEditor from "./TagEditor";
import type { GenreDto, PromptGroupDto, TagInput } from "@/types";

interface PromptGroupEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: PromptGroupDto | null;
  genres: GenreDto[];
  onSave: (data: {
    id: string;
    name: string;
    genreId?: string | null;
    tags: TagInput[];
    isDefault: boolean;
    defaultStrength: number;
  }) => void;
  onDelete: (id: string) => void;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

export default function PromptGroupEditModal({
  open,
  onOpenChange,
  group,
  genres,
  onSave,
  onDelete,
  contentClassName,
  contentStyle,
}: PromptGroupEditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagInput[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [defaultStrength, setDefaultStrength] = useState(0);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setGenreId(group.genreId);
      setTags(group.tags.map((t) => ({
        name: t.name || undefined,
        tag: t.tag,
        defaultStrength: t.defaultStrength,
        thumbnailPath: t.thumbnailPath ?? undefined,
      })));
      setIsDefault(group.isDefault);
      setDefaultStrength(group.defaultStrength);
    }
  }, [group]);

  if (!group) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: group.id,
      name: name.trim(),
      genreId,
      tags,
      isDefault,
      defaultStrength,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(group.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName ?? "max-w-md"} style={contentStyle}>
        <DialogHeader>
          <DialogTitle>{t("promptGroup.editGroup")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("promptGroup.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("promptGroup.namePlaceholder")}
              className="h-8 text-sm"
              disabled={group.isSystem}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={genreId ?? "none"}
              onValueChange={(v) => setGenreId(v === "none" ? null : v)}
              disabled={group.isSystem}
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
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={group.isSystem}
              />
              <Label className="text-[10px] text-muted-foreground">{t("promptGroup.defaultForGenre")}</Label>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Slider
                min={-10} max={10} step={0.1}
                value={[defaultStrength]}
                onValueChange={([v]) => setDefaultStrength(Math.round(v * 10) / 10)}
                disabled={group.isSystem}
                className="w-20 [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-range]]:h-0.5 [&_[data-slot=slider-thumb]]:h-2.5 [&_[data-slot=slider-thumb]]:w-2.5 [&_[data-slot=slider-thumb]]:border"
              />
              <span className="w-9 text-center text-[10px] font-mono bg-muted rounded px-1 py-0.5">
                {defaultStrength > 0 ? "+" : ""}{defaultStrength.toFixed(1)}
              </span>
            </div>
          </div>

          {!group.isSystem && (
            <TagEditor tags={tags} onTagsChange={setTags} />
          )}

          {group.isSystem && (
            <p className="text-xs text-muted-foreground">
              {t("promptGroup.systemCannotDelete")}
            </p>
          )}

          <div className="flex justify-between pt-2">
            {!group.isSystem ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="h-3 w-3" />
                    {t("common.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("promptGroup.deleteConfirm")}</AlertDialogTitle>
                    <AlertDialogDescription>{group.name}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              {!group.isSystem && (
                <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
                  {t("common.save")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
