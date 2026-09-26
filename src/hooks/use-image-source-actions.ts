import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loadHistoryImage, loadImageFile, type LoadedImage } from "@/lib/canvas-image";
import { useImageEditStore, type EditMode, type EditorLayer } from "@/stores/image-edit-store";
import { useCharRefStore } from "@/stores/char-ref-store";

export type ImageSource = { imageId: string } | { path: string } | { loaded: LoadedImage };

async function load(source: ImageSource): Promise<LoadedImage> {
  if ("imageId" in source) return loadHistoryImage(source.imageId);
  if ("path" in source) return loadImageFile(source.path);
  return source.loaded;
}

/** Turn a history image / file into the img2img base or the character reference. */
export function useImageSourceActions() {
  const { t } = useTranslation();

  const setAsBase = useCallback(async (source: ImageSource, mode: EditMode, editor?: EditorLayer) => {
    try {
      const img = await load(source);
      const store = useImageEditStore.getState();
      store.setBase({ ...img, sourceImageId: "imageId" in source ? source.imageId : null }, mode);
      if (editor) store.openEditor(editor);
      else toast.success(t(mode === "inpaint" ? "imageEdit.baseSetInpaint" : "imageEdit.baseSetImg2Img"));
    } catch (e) {
      toast.error(t("imageEdit.loadFailed", { error: String(e) }));
    }
  }, [t]);

  const setAsCharacterReference = useCallback(async (source: ImageSource) => {
    try {
      useCharRefStore.getState().setImage(await load(source));
      toast.success(t("charRef.set"));
    } catch (e) {
      toast.error(t("imageEdit.loadFailed", { error: String(e) }));
    }
  }, [t]);

  return { setAsBase, setAsCharacterReference };
}
