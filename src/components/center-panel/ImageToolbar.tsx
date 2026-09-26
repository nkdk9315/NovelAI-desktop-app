import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Brush, ImagePlay, ImageUp, Sparkles, SquareDashed, UserSquare, Wand2 } from "lucide-react";
import { useImageSourceActions } from "@/hooks/use-image-source-actions";
import { useDirectorToolsStore } from "@/stores/director-tools-store";
import EnhancePopover from "./EnhancePopover";

const ToolButton = forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & { label: string }>(
  ({ label, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className="flex h-8 items-center gap-1 rounded px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      {...rest}
    >
      {children}
    </button>
  ),
);
ToolButton.displayName = "ToolButton";

/** Action row above the preview image: use as base, edit, enhance, tools. */
export default function ImageToolbar({ imageId }: { imageId: string }) {
  const { t } = useTranslation();
  const { setAsBase, setAsCharacterReference } = useImageSourceActions();
  const openTools = useDirectorToolsStore((s) => s.openFor);
  const divider = <div className="mx-0.5 h-5 w-px bg-border" />;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-0.5 border-b border-border px-2 py-1">
      <ToolButton label={t("imageEdit.actions.img2imgHint")} onClick={() => setAsBase({ imageId }, "img2img")}>
        <ImagePlay className="h-4 w-4" />
        <span className="hidden lg:inline">{t("imageEdit.actions.img2img")}</span>
      </ToolButton>
      <ToolButton label={t("imageEdit.actions.paintHint")} onClick={() => setAsBase({ imageId }, "img2img", "paint")}>
        <Brush className="h-4 w-4" />
        <span className="hidden lg:inline">{t("imageEdit.actions.paint")}</span>
      </ToolButton>
      <ToolButton label={t("imageEdit.actions.inpaintHint")} onClick={() => setAsBase({ imageId }, "inpaint", "mask")}>
        <SquareDashed className="h-4 w-4" />
        <span className="hidden lg:inline">{t("imageEdit.actions.inpaint")}</span>
      </ToolButton>
      {divider}
      <EnhancePopover
        imageId={imageId}
        trigger={
          <ToolButton label={t("enhance.title")}>
            <Sparkles className="h-4 w-4" />
            <span className="hidden lg:inline">{t("enhance.short")}</span>
          </ToolButton>
        }
      />
      <ToolButton label={t("tools.title")} onClick={() => openTools(imageId)}>
        <Wand2 className="h-4 w-4" />
        <span className="hidden lg:inline">{t("tools.short")}</span>
      </ToolButton>
      <ToolButton label={t("tools.names.upscale")} onClick={() => openTools(imageId, "upscale")}>
        <ImageUp className="h-4 w-4" />
        <span className="hidden lg:inline">{t("tools.upscaleShort")}</span>
      </ToolButton>
      {divider}
      <ToolButton label={t("charRef.useThis")} onClick={() => setAsCharacterReference({ imageId })}>
        <UserSquare className="h-4 w-4" />
        <span className="hidden lg:inline">{t("charRef.short")}</span>
      </ToolButton>
    </div>
  );
}
