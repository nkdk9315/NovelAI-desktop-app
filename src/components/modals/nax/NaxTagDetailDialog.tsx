import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, Plus, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNaxStore } from "@/stores/nax-store";
import { useNaxFavorites } from "@/hooks/use-nax-favorites";
import { useNaxPromptActions } from "@/hooks/use-nax-prompt-actions";
import { naxCategoryOfSlug, naxGalleryPageUrl, naxTagKey } from "@/lib/nax";
import NaxProgressiveImage from "./NaxProgressiveImage";
import IconTooltip from "@/components/shared/IconTooltip";
import type { NaxCategory } from "@/types";

interface Props {
  tag: string | null;
  category: NaxCategory;
  onOpenChange: (open: boolean) => void;
}

/** One tag across every gallery/model version, side by side. */
export default function NaxTagDetailDialog({ tag, category, onOpenChange }: Props) {
  const { t } = useTranslation();
  const galleries = useNaxStore((s) => s.galleries);
  const lookupTags = useNaxStore((s) => s.lookupTags);
  const images = useNaxStore((s) => (tag ? s.imagesByTag[naxTagKey(tag)] : undefined));
  const { isFavorite, toggleFavorite } = useNaxFavorites();
  const { isAdded, toggle } = useNaxPromptActions();
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!tag) return;
    setLoadFailed(false);
    lookupTags([tag]).catch(() => setLoadFailed(true));
  }, [tag, lookupTags]);

  if (!tag) return null;
  // Same tag in other categories (an artist named like a character) is noise here.
  const shown = (images ?? []).filter((img) => naxCategoryOfSlug(img.gallerySlug) === category);
  const titleOf = (slug: string) => galleries.find((g) => g.slug === slug)?.title ?? slug;
  const fav = isFavorite(tag, category);
  const added = isAdded(tag, category);

  const copy = () => {
    navigator.clipboard.writeText(tag).then(() => toast.success(t("nax.copied")), () => {});
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(1100px,92vw)] max-w-none flex-col overflow-hidden sm:max-w-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <span className="truncate">{tag}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              {t(`nax.category.${category}`)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={added ? "default" : "outline"} onClick={() => toggle(tag, category)}>
            {added ? <Check className="mr-1 h-3.5 w-3.5" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
            {added ? t("nax.removeFromPrompt") : t("nax.addToPrompt")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { toggleFavorite(tag, category).catch(() => {}); }}>
            <Star className={`mr-1 h-3.5 w-3.5 ${fav ? "fill-yellow-400 text-yellow-400" : ""}`} />
            {fav ? t("nax.unfavorite") : t("nax.favorite")}
          </Button>
          <Button size="sm" variant="ghost" onClick={copy}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            {t("nax.copyTag")}
          </Button>
          <p className="ml-auto text-[11px] text-muted-foreground">{t("nax.compareHint")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadFailed ? (
            <p className="py-10 text-center text-xs text-muted-foreground">{t("nax.loadFailed")}</p>
          ) : images && shown.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">{t("nax.notInCatalog")}</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {shown.map((img) => (
                <figure key={img.gallerySlug} className="overflow-hidden rounded-md border border-border bg-muted">
                  <NaxProgressiveImage imageUrl={img.imageUrl} alt={`${tag} (${img.modelVersion})`} />
                  <figcaption className="flex items-center gap-2 p-1.5 text-[11px]">
                    <span className="rounded bg-primary/15 px-1 font-medium text-primary">{img.modelVersion}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground" title={titleOf(img.gallerySlug)}>
                      {titleOf(img.gallerySlug)}
                    </span>
                    <span className="flex items-center gap-0.5 tabular text-muted-foreground"><ThumbsUp className="h-3 w-3" />{img.upVotes}</span>
                    <span className="flex items-center gap-0.5 tabular text-muted-foreground"><ThumbsDown className="h-3 w-3" />{img.downVotes}</span>
                    <IconTooltip label={t("nax.openOnSite")}>
                      <button
                        type="button"
                        aria-label={t("nax.openOnSite")}
                        onClick={() => { openExternal(naxGalleryPageUrl(img.gallerySlug, tag)).catch(() => {}); }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </IconTooltip>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
