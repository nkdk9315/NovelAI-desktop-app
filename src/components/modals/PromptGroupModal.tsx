import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toastError } from "@/lib/toast-error";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePromptStore } from "@/stores/prompt-store";
import type { TagGroupDto } from "@/types";
import type { SystemTreeNode } from "./prompt-group/PromptGroupGrid";
import * as ipc from "@/lib/ipc";
import PromptGroupModalContent from "./PromptGroupModalContent";
import PresetModalContent from "./preset/PresetModalContent";

type TabId = "groups" | "presets";

interface PromptGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
}

export default function PromptGroupModal({ open, onOpenChange, targetId }: PromptGroupModalProps) {
  const { t } = useTranslation();
  const loadGenres = usePromptStore((s) => s.loadGenres);
  const loadPromptGroups = usePromptStore((s) => s.loadPromptGroups);
  const loadPromptGroupFolders = usePromptStore((s) => s.loadPromptGroupFolders);

  const [activeTab, setActiveTab] = useState<TabId>("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [presetSearchQuery, setPresetSearchQuery] = useState("");
  const [showSystem, setShowSystem] = useState(false);
  const [systemTree, setSystemTree] = useState<SystemTreeNode[] | null>(null);
  const [tagDbGenresLoading, setTagDbGenresLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadGenres();
      loadPromptGroups(searchQuery || undefined);
      loadPromptGroupFolders().catch(() => {});
    }
  }, [open, searchQuery, loadGenres, loadPromptGroups, loadPromptGroupFolders]);

  useEffect(() => {
    if (!open || !showSystem || systemTree != null || tagDbGenresLoading) return;
    setTagDbGenresLoading(true);
    fetchFavoriteTagDbTree()
      .then(setSystemTree)
      .catch((e) => toastError(`${t("tagDb.loadFailed")}: ${String(e)}`))
      .finally(() => setTagDbGenresLoading(false));
  }, [open, showSystem, systemTree, tagDbGenresLoading, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg left-[8.5rem]! translate-x-0! max-h-[calc(100vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-1.5">
            <DialogTitle className="flex items-center gap-0">
              <button type="button" onClick={() => setActiveTab("groups")}
                className={`px-2 py-0.5 text-sm rounded-l-md transition-colors ${activeTab === "groups" ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                {t("preset.tabGroups")}
              </button>
              <button type="button" onClick={() => setActiveTab("presets")}
                className={`px-2 py-0.5 text-sm rounded-r-md transition-colors ${activeTab === "presets" ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                {t("preset.tabPresets")}
              </button>
            </DialogTitle>
          </div>
        </DialogHeader>
        {activeTab === "groups" ? (
          <PromptGroupModalContent
            targetId={targetId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showSystem={showSystem}
            onShowSystemChange={setShowSystem}
            systemTree={systemTree}
            setSystemTree={setSystemTree}
            tagDbGenresLoading={tagDbGenresLoading}
          />
        ) : (
          <PresetModalContent
            targetId={targetId}
            searchQuery={presetSearchQuery}
            onSearchChange={setPresetSearchQuery}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

async function fetchFavoriteTagDbTree(): Promise<SystemTreeNode[]> {
  async function visit(node: TagGroupDto): Promise<SystemTreeNode | null> {
    if (node.childCount === 0) return { kind: "leaf", id: node.id, title: node.title };
    const kids = await ipc.listFavoriteTagGroupChildren(node.id);
    const visited = await Promise.all(kids.map(visit));
    const children = visited.filter((c): c is SystemTreeNode => c !== null);
    if (children.length === 0) return null;
    const leafCount = children.reduce((acc, c) => acc + (c.kind === "leaf" ? 1 : c.leafCount), 0);
    return { kind: "branch", id: node.id, title: node.title, children, leafCount };
  }
  const roots = await ipc.listFavoriteTagGroupRoots();
  const topLevel: SystemTreeNode[] = [];
  for (const root of roots) {
    const supers = await ipc.listFavoriteTagGroupChildren(root.id);
    for (const sup of supers) { const node = await visit(sup); if (node) topLevel.push(node); }
  }
  topLevel.sort((a, b) => a.title.localeCompare(b.title));
  return topLevel;
}
