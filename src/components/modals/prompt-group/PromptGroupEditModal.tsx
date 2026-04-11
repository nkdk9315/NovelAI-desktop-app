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
  }) => void;
  onDelete: (id: string) => void;
}

export default function PromptGroupEditModal({
  open,
  onOpenChange,
  group,
  genres,
  onSave,
  onDelete,
}: PromptGroupEditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [genreId, setGenreId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagInput[]>([]);
  const [isDefault, setIsDefault] = useState(false);

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
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(group.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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

          <div className="space-y-1">
            <Label className="text-xs">{t("promptGroup.genre")}</Label>
            <Select
              value={genreId ?? "none"}
              onValueChange={(v) => setGenreId(v === "none" ? null : v)}
              disabled={group.isSystem}
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
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
              disabled={group.isSystem}
            />
            <Label className="text-xs">{t("promptGroup.defaultForGenre")}</Label>
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
