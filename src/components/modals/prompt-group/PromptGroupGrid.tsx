import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { GenreDto, PromptGroupDto } from "@/types";

interface PromptGroupGridProps {
  genres: GenreDto[];
  groups: PromptGroupDto[];
  selectedGenreId: string | undefined;
  searchQuery: string;
  showSystem: boolean;
  existingGroupIds: string[];
  onGenreChange: (id: string | undefined) => void;
  onSearchChange: (query: string) => void;
  onShowSystemChange: (show: boolean) => void;
  onAdd: () => void;
  onToggleSidebar: (group: PromptGroupDto) => void;
  onEdit: (group: PromptGroupDto) => void;
  onDelete: (id: string) => void;
}

export default function PromptGroupGrid({
  genres,
  groups,
  selectedGenreId,
  searchQuery,
  showSystem,
  existingGroupIds,
  onGenreChange,
  onSearchChange,
  onShowSystemChange,
  onAdd,
  onToggleSidebar,
  onEdit,
  onDelete,
}: PromptGroupGridProps) {
  const { t } = useTranslation();
  const [previewGroup, setPreviewGroup] = useState<PromptGroupDto | null>(null);

  const filteredGroups = showSystem ? groups : groups.filter((g) => !g.isSystem);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={selectedGenreId ?? "all"}
          onValueChange={(v) => onGenreChange(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("promptGroup.all")}</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("common.search")}
          className="h-8 flex-1 min-w-24 text-xs"
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={onAdd} title={t("promptGroup.newGroup")}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="show-system"
          checked={showSystem}
          onCheckedChange={(v) => onShowSystemChange(v === true)}
        />
        <label htmlFor="show-system" className="text-xs text-muted-foreground cursor-pointer">
          System
        </label>
      </div>

      {/* Card grid */}
      <ScrollArea className="h-72">
        {filteredGroups.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            {t("promptGroup.noGroups")}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 pr-3 sm:grid-cols-5">
            {filteredGroups.map((group) => {
              const isAdded = existingGroupIds.includes(group.id);
              return (
                <ContextMenu key={group.id}>
                  <ContextMenuTrigger>
                    <button
                      type="button"
                      className={`relative flex h-24 w-full flex-col items-center justify-center gap-0.5 rounded-md border p-1.5 text-center overflow-hidden transition-colors ${
                        isAdded
                          ? "border-primary/40 bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                      onClick={() => onToggleSidebar(group)}
                    >
                      {isAdded && (
                        <div className="absolute right-0.5 top-0.5 rounded-full bg-primary p-0.5">
                          <Check className="h-2 w-2 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted/50 shrink-0">
                        {group.thumbnailPath ? (
                          <img
                            src={group.thumbnailPath}
                            alt={group.name}
                            className="h-full w-full rounded object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium line-clamp-1 w-full">{group.name}</span>
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {group.isDefault && (
                          <Badge variant="outline" className="text-[7px] px-1 py-0">{t("promptGroup.defaultForGenre")}</Badge>
                        )}
                        {group.isSystem && (
                          <Badge variant="secondary" className="text-[7px] px-1 py-0">Sys</Badge>
                        )}
                        <Badge variant="secondary" className="text-[7px] px-1 py-0">{group.tags.length}</Badge>
                      </div>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onEdit(group)}>
                      {t("common.edit")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setPreviewGroup(group)}>
                      {t("promptGroup.showEntries")}
                    </ContextMenuItem>
                    {!group.isSystem && (
                      <ContextMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(group.id)}
                      >
                        {t("common.delete")}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Entry preview dialog */}
      {previewGroup && (
        <Dialog open onOpenChange={() => setPreviewGroup(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">{previewGroup.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-1">
              {previewGroup.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name || tag.tag}
                </Badge>
              ))}
              {previewGroup.tags.length === 0 && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
