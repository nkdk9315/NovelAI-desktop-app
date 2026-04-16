import { useTranslation } from "react-i18next";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { TagDto, TagGroupDto } from "@/types";

export interface TagContentPaneProps {
  selected: TagGroupDto | null;
  displayTags: TagDto[];
  query: string;
  selectedByGroup: Record<number, Map<number, string>>;
  onQueryChange: (q: string) => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleTagSelection: (tag: TagDto) => void;
}

export default function TagContentPane(props: TagContentPaneProps) {
  const { t } = useTranslation();
  const {
    selected, displayTags, query, selectedByGroup,
    onQueryChange, onRename, onDelete, onToggleTagSelection,
  } = props;

  return (
    <div className="flex flex-col min-h-0 border rounded-md overflow-hidden">
      <div className="shrink-0 p-2 border-b space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">
              {selected ? selected.title : t("tagDb.selectAGroup")}
            </div>
            {selected && (
              <div className="text-[10px] text-muted-foreground flex gap-2">
                <span>{selected.kind}</span>
                <span>·</span>
                <span>{selected.source}</span>
                <span>·</span>
                <span>{displayTags.length} tags</span>
              </div>
            )}
          </div>
          {selected && selected.source === "user" && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onRename}
                title={t("tagDb.rename")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                title={t("tagDb.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            className="pl-7 h-8 text-xs"
            placeholder={t("tagDb.searchPlaceholder")}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            disabled={!selected}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 flex flex-wrap gap-1">
          {displayTags.map((tag) => {
            const groupSel = selected ? selectedByGroup[selected.id] : undefined;
            const isSelected = groupSel?.has(tag.id) ?? false;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTagSelection(tag)}
                className="inline-block"
              >
                <Badge
                  variant={isSelected ? "default" : "secondary"}
                  className="cursor-pointer text-xs"
                >
                  {tag.name}
                </Badge>
              </button>
            );
          })}
          {selected && displayTags.length === 0 && (
            <span className="text-xs text-muted-foreground p-2">
              {t("tagDb.noTags")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
