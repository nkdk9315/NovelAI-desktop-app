import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePromptStore } from "@/stores/prompt-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import type { PromptGroupDto } from "@/types";
import * as ipc from "@/lib/ipc";

interface GroupBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
}

export default function GroupBrowserModal({
  open,
  onOpenChange,
  targetId,
}: GroupBrowserModalProps) {
  const { t } = useTranslation();
  const genres = usePromptStore((s) => s.genres);
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const addGroupToTarget = useSidebarPromptStore((s) => s.addGroupToTarget);
  const removeGroupFromTarget = useSidebarPromptStore((s) => s.removeGroupFromTarget);
  const target = useSidebarPromptStore((s) => s.targets[targetId]);
  const existingGroupIds = target?.groups.map((g) => g.groupId) ?? [];

  const [selectedGenreId, setSelectedGenreId] = useState<string | undefined>(undefined);
  const [groups, setGroups] = useState<PromptGroupDto[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [systemSearch, setSystemSearch] = useState("");
  const [systemTags, setSystemTags] = useState<{ name: string; category: number }[]>([]);

  useEffect(() => {
    if (open) {
      loadGenres();
    }
  }, [open, loadGenres]);

  useEffect(() => {
    if (!open) return;
    ipc.listPromptGroups(selectedGenreId).then(setGroups).catch(() => setGroups([]));
  }, [open, selectedGenreId]);

  const handleToggleGroup = (group: PromptGroupDto) => {
    if (existingGroupIds.includes(group.id)) {
      removeGroupFromTarget(targetId, group.id);
    } else {
      addGroupToTarget(targetId, group);
    }
  };

  const handleExpandGroup = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
    setSystemSearch("");
    setSystemTags([]);
  };

  const handleSystemSearch = async (group: PromptGroupDto, query: string) => {
    setSystemSearch(query);
    if (!query.trim() || group.category == null) {
      setSystemTags([]);
      return;
    }
    try {
      const result = await ipc.listSystemGroupTags(group.category, query, 0, 20);
      setSystemTags(result.tags.map((t) => ({ name: t.name, category: t.category })));
    } catch {
      setSystemTags([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("promptGroup.selectGroup")}</DialogTitle>
        </DialogHeader>

        {/* Genre filter */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedGenreId === undefined ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setSelectedGenreId(undefined)}
          >
            {t("promptGroup.all")}
          </Button>
          {genres.map((g) => (
            <Button
              key={g.id}
              variant={selectedGenreId === g.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSelectedGenreId(g.id)}
            >
              {g.name}
            </Button>
          ))}
        </div>

        {/* Group list */}
        <ScrollArea className="max-h-72">
          <div className="space-y-1">
            {groups.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {t("promptGroup.noGroups")}
              </p>
            ) : (
              groups.map((group) => {
                const isAdded = existingGroupIds.includes(group.id);
                const isExpanded = expandedGroupId === group.id;

                return (
                  <div key={group.id} className="rounded-md border border-border">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-1 text-left text-sm"
                        onClick={() => handleExpandGroup(group.id)}
                      >
                        <ChevronRight
                          className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                        <span>{group.name}</span>
                        {group.isSystem && (
                          <Badge variant="secondary" className="text-[9px]">System</Badge>
                        )}
                      </button>
                      <Button
                        variant={isAdded ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-6 px-2 text-xs ${isAdded ? "text-destructive" : ""}`}
                        onClick={() => handleToggleGroup(group)}
                      >
                        {isAdded ? "−" : "+"}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="border-t px-2 py-1.5">
                        {/* System group: search */}
                        {group.isSystem && group.category != null && (
                          <div className="mb-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                              <Input
                                value={systemSearch}
                                onChange={(e) => handleSystemSearch(group, e.target.value)}
                                placeholder={t("common.search")}
                                className="h-7 pl-7 text-xs"
                              />
                            </div>
                            {systemTags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {systemTags.map((st) => (
                                  <Badge key={st.name} variant="outline" className="text-[10px]">
                                    {st.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Regular group: show entry names */}
                        {!group.isSystem && (
                          <div className="flex flex-wrap gap-1">
                            {group.tags.map((tag) => (
                              <Badge key={tag.id} variant="outline" className="text-[10px]">
                                {tag.name || tag.tag}
                              </Badge>
                            ))}
                            {group.tags.length === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
