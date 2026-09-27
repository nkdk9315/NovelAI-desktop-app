import { useTranslation } from "react-i18next";
import { Brush, History, ImagePlay, ImageUp, SquareDashed, Type, UserSquare, Wand2 } from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useImageSourceActions } from "@/hooks/use-image-source-actions";
import { useDirectorToolsStore } from "@/stores/director-tools-store";
import { useTypesetStore } from "@/stores/typeset-store";

interface ThumbnailContextMenuProps {
  imageId: string;
  canRestore: boolean;
  onRestore: () => void;
  children: React.ReactNode;
}

/** Right-click menu of a history thumbnail: reuse the image for img2img / inpaint / tools. */
export default function ThumbnailContextMenu({ imageId, canRestore, onRestore, children }: ThumbnailContextMenuProps) {
  const { t } = useTranslation();
  const { setAsBase, setAsCharacterReference } = useImageSourceActions();
  const openTools = useDirectorToolsStore((s) => s.openFor);
  const openTypeset = useTypesetStore((s) => s.openFor);
  const item = "gap-2 text-xs";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem className={item} onSelect={() => setAsBase({ imageId }, "img2img")}>
          <ImagePlay className="h-3.5 w-3.5" />{t("imageEdit.actions.img2img")}
        </ContextMenuItem>
        <ContextMenuItem className={item} onSelect={() => setAsBase({ imageId }, "img2img", "paint")}>
          <Brush className="h-3.5 w-3.5" />{t("imageEdit.actions.paint")}
        </ContextMenuItem>
        <ContextMenuItem className={item} onSelect={() => setAsBase({ imageId }, "inpaint", "mask")}>
          <SquareDashed className="h-3.5 w-3.5" />{t("imageEdit.actions.inpaint")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className={item} onSelect={() => openTools(imageId)}>
          <Wand2 className="h-3.5 w-3.5" />{t("tools.title")}
        </ContextMenuItem>
        <ContextMenuItem className={item} onSelect={() => openTools(imageId, "upscale")}>
          <ImageUp className="h-3.5 w-3.5" />{t("tools.names.upscale")}
        </ContextMenuItem>
        <ContextMenuItem className={item} onSelect={() => openTypeset(imageId)}>
          <Type className="h-3.5 w-3.5" />{t("typeset.title")}
        </ContextMenuItem>
        <ContextMenuItem className={item} onSelect={() => setAsCharacterReference({ imageId })}>
          <UserSquare className="h-3.5 w-3.5" />{t("charRef.useThis")}
        </ContextMenuItem>
        {canRestore && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem className={item} onSelect={onRestore}>
              <History className="h-3.5 w-3.5" />{t("history.restoreMenu")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
