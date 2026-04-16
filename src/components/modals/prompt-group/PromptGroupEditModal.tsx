import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TagEditor from "./TagEditor";
import type { GenreDto, PromptGroupDto, PromptGroupFolderDto, TagInput } from "@/types";

interface SaveData { id: string; name: string; folderId: number | null; defaultGenreIds: string[]; tags: TagInput[]; isDefault: boolean; defaultStrength: number; }

interface PromptGroupEditModalProps {
  open: boolean; onOpenChange: (open: boolean) => void; group: PromptGroupDto | null;
  genres: GenreDto[]; folders: PromptGroupFolderDto[];
  createFolder: (title: string, parentId: number | null) => Promise<PromptGroupFolderDto>;
  onSave: (data: SaveData) => void; onDelete: (id: string) => void;
  contentClassName?: string; contentStyle?: React.CSSProperties;
}

function buildFolderOptions(folders: PromptGroupFolderDto[]) {
  const byParent = new Map<number | null, PromptGroupFolderDto[]>();
  for (const f of folders) { const arr = byParent.get(f.parentId) ?? []; arr.push(f); byParent.set(f.parentId, arr); }
  for (const arr of byParent.values()) arr.sort((a, b) => a.sortKey - b.sortKey || a.title.localeCompare(b.title));
  const out: { id: number; label: string }[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const k of byParent.get(parentId) ?? []) { out.push({ id: k.id, label: `${"\u00A0\u00A0".repeat(depth)}${k.title}` }); walk(k.id, depth + 1); }
  };
  walk(null, 0);
  return out;
}

export default function PromptGroupEditModal({
  open, onOpenChange, group, genres, folders, createFolder, onSave, onDelete, contentClassName, contentStyle,
}: PromptGroupEditModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [defaultGenreIds, setDefaultGenreIds] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<TagInput[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [defaultStrength, setDefaultStrength] = useState(0);
  const [showInlineFolder, setShowInlineFolder] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState("");

  useEffect(() => {
    if (group) {
      setName(group.name);
      setFolderId(group.folderId);
      setDefaultGenreIds(new Set(group.defaultGenreIds));
      setTags(group.tags.map((t) => ({
        name: t.name || undefined,
        tag: t.tag,
        negativePrompt: t.negativePrompt || undefined,
        defaultStrength: t.defaultStrength,
        thumbnailPath: t.thumbnailPath ?? undefined,
      })));
      setIsDefault(group.isDefault);
      setDefaultStrength(group.defaultStrength);
      setShowInlineFolder(false);
      setInlineFolderName("");
    }
  }, [group]);

  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders]);

  if (!group) return null;

  const toggleGenre = (id: string) => {
    setDefaultGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateInlineFolder = async () => {
    const trimmed = inlineFolderName.trim();
    if (!trimmed) return;
    try {
      const created = await createFolder(trimmed, null);
      setFolderId(created.id);
      setShowInlineFolder(false);
      setInlineFolderName("");
    } catch {
      // surfaced by parent
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: group.id,
      name: name.trim(),
      folderId,
      defaultGenreIds: Array.from(defaultGenreIds),
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

          {!group.isSystem && (
            <div className="space-y-1">
              <Label className="text-xs">{t("promptGroup.selectFolder")}</Label>
              <div className="flex items-center gap-1">
                <Select
                  value={folderId == null ? "none" : String(folderId)}
                  onValueChange={(v) => setFolderId(v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60!">
                    <SelectItem value="none">{t("promptGroup.noFolder")}</SelectItem>
                    {folderOptions.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] shrink-0"
                  onClick={() => setShowInlineFolder((v) => !v)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("promptGroup.folder.newFolder")}
                </Button>
              </div>
              {showInlineFolder && (
                <div className="flex items-center gap-1 pt-1">
                  <Input
                    value={inlineFolderName}
                    onChange={(e) => setInlineFolderName(e.target.value)}
                    placeholder={t("promptGroup.folder.newFolder")}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-[10px] shrink-0"
                    onClick={handleCreateInlineFolder}
                    disabled={!inlineFolderName.trim()}
                  >
                    {t("common.create")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {!group.isSystem && (
            <div className="space-y-1">
              <Label className="text-xs">{t("promptGroup.defaultGenres")}</Label>
              <div className="flex flex-wrap gap-1">
                {genres.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground">—</span>
                ) : (
                  genres.map((g) => {
                    const on = defaultGenreIds.has(g.id);
                    return (
                      <Badge
                        key={g.id}
                        variant={on ? "default" : "outline"}
                        className="cursor-pointer text-[10px] px-1.5 py-0.5 select-none transition-colors"
                        onClick={() => toggleGenre(g.id)}
                      >
                        {g.name}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={group.isSystem}
              />
              <Label className="text-[10px] text-muted-foreground">{t("promptGroup.defaultGenres")}</Label>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-auto">
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
