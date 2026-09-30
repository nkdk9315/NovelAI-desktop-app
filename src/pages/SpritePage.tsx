import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/header/Header";
import LeftPanel from "@/components/left-panel/LeftPanel";
import ResizeHandle from "@/components/shared/ResizeHandle";
import SpriteCenter from "@/components/sprite/SpriteCenter";
import SpriteCellPanel from "@/components/sprite/cell/SpriteCellPanel";
import SpriteMaskEditorDialog from "@/components/sprite/mask/SpriteMaskEditorDialog";
import NaxExplorerDialog from "@/components/modals/nax/NaxExplorerDialog";
import { useLayoutStore } from "@/stores/layout-store";
import { useProjectStore } from "@/stores/project-store";
import { useMangaStore } from "@/stores/manga-store";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteQueueStore } from "@/stores/sprite-queue-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useProjectPromptPersistence } from "@/hooks/use-project-prompt-persistence";
import { newMangaPage } from "@/lib/manga-page";
import { toastError } from "@/lib/toast-error";

/**
 * 差分制作 (F13): the left panel holds the character's look (shared by every
 * cell); the centre shows the variant matrix / definition / export; the right
 * side the selected cell. See docs/contracts/sprite-variants.md.
 */
export default function SpritePage() {
  const { t } = useTranslation();
  const leftSidebarWidth = useLayoutStore((s) => s.leftSidebarWidth);
  const rightSidebarWidth = useLayoutStore((s) => s.rightSidebarWidth);
  const setLeftSidebarWidth = useLayoutStore((s) => s.setLeftSidebarWidth);
  const setRightSidebarWidth = useLayoutStore((s) => s.setRightSidebarWidth);
  const projectId = useProjectStore((s) => s.currentProject?.id ?? null);
  useProjectPromptPersistence(projectId);

  useEffect(() => {
    useWorkspaceStore.getState().setWorkspace("sprite");
    // Manga mode would replace the prompts; it never applies here
    useMangaStore.getState().setPage(newMangaPage(false));
    return () => {
      // Start the pending save (it has captured the set and spec), then clear right away:
      // a remount must not have its freshly loaded state wiped later
      const sprite = useSpriteStore.getState();
      void sprite.flushSave();
      sprite.reset();
      useSpriteQueueStore.getState().requestStop();
      useWorkspaceStore.getState().setWorkspace("generation");
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    useSpriteStore.getState().load(projectId).catch((e) => toastError(t("sprite.loadFailed", { error: String(e) })));
  }, [projectId, t]);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside
          style={{ width: `${leftSidebarWidth}px` }}
          className="relative shrink-0 overflow-y-auto border-r border-border"
        >
          <p className="border-b border-border bg-muted/40 px-4 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {t("sprite.leftHint")}
          </p>
          <LeftPanel />
          <ResizeHandle side="left" onResize={(d) => setLeftSidebarWidth(leftSidebarWidth + d)} />
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden">
          <SpriteCenter />
        </main>
        <aside
          style={{ width: `${rightSidebarWidth}px` }}
          className="relative shrink-0 overflow-y-auto border-l border-border"
        >
          <SpriteCellPanel />
          <ResizeHandle side="right" onResize={(d) => setRightSidebarWidth(rightSidebarWidth + d)} />
        </aside>
      </div>
      <SpriteMaskEditorDialog />
      {/* The shared left panel has the tag explorer buttons */}
      <NaxExplorerDialog />
    </div>
  );
}
