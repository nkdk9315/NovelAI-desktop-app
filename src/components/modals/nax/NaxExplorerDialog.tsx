import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useNaxStore } from "@/stores/nax-store";
import NaxBrowser from "./NaxBrowser";

/**
 * Browse nax.moe's tag galleries (artists, characters, hair, ...) and put tags
 * into the prompt with one click. Mounted by each page that shows the left
 * panel (its buttons open it via `useNaxStore`).
 */
export default function NaxExplorerDialog() {
  const { t } = useTranslation();
  const open = useNaxStore((s) => s.open);
  const closeExplorer = useNaxStore((s) => s.closeExplorer);
  // Leaving the page must not leave it open for the next one
  useEffect(() => closeExplorer, [closeExplorer]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) closeExplorer(); }}>
      <DialogContent className="fixed left-[336px] right-4 translate-x-0 w-auto max-w-none h-[min(860px,90vh)] overflow-hidden flex flex-col gap-3 sm:max-w-none">
        <NaxBrowser
          heading={(
            <>
              <DialogTitle>{t("nax.title")}</DialogTitle>
              <DialogDescription className="text-[11px]">{t("nax.description")}</DialogDescription>
            </>
          )}
        />
      </DialogContent>
    </Dialog>
  );
}
