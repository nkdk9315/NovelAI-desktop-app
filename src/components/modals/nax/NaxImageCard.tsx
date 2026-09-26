import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ImageOff, Plus, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { naxThumbUrl } from "@/lib/nax";
import IconTooltip from "@/components/shared/IconTooltip";
import type { NaxCategory, NaxImageDto } from "@/types";

export interface NaxGridItem {
  tag: string;
  category: NaxCategory;
  /** null = tag not in the catalog for any gallery (e.g. a favorite typed by hand) */
  image: NaxImageDto | null;
}

interface Props {
  item: NaxGridItem;
  isFavorite: boolean;
  isAdded: boolean;
  /** Show the image's model version (favorites mix versions). */
  showVersion?: boolean;
  /** Show the genre (favorites listing every genre). */
  showCategory?: boolean;
  /** Pick mode: `isAdded`/`onToggleAdd`/`onOpen` mean selected/select. */
  selectMode?: boolean;
  onToggleFavorite: () => void;
  onToggleAdd: () => void;
  onOpen: () => void;
}

/** Genre badge colors, so mixed favorites can be told apart at a glance. */
const CATEGORY_BADGE: Record<NaxCategory, string> = {
  artist: "bg-sky-600/90",
  character: "bg-rose-600/90",
  copyright: "bg-violet-600/90",
  face: "bg-amber-600/90",
  hair: "bg-emerald-600/90",
  other: "bg-zinc-600/90",
};

export default function NaxImageCard({ item, isFavorite, isAdded, showVersion, showCategory, selectMode, onToggleFavorite, onToggleAdd, onOpen }: Props) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const { image } = item;
  const addLabel = selectMode
    ? t(isAdded ? "nax.picker.deselect" : "nax.picker.select")
    : t(isAdded ? "nax.removeFromPrompt" : "nax.addToPrompt");

  return (
    <div className={`group relative h-full overflow-hidden rounded-md border bg-muted ${isAdded ? "border-primary ring-1 ring-primary" : "border-border"}`}>
      <button type="button" onClick={onOpen} className="block h-full w-full" aria-label={`${item.tag}: ${selectMode ? t(isAdded ? "nax.picker.deselect" : "nax.picker.select") : t("nax.openDetail")}`}>
        {image && !failed ? (
          <img
            src={naxThumbUrl(image.imageUrl)}
            alt={item.tag}
            draggable={false}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-muted-foreground">
            <ImageOff className="h-5 w-5" />
            <span className="text-center text-[10px]">{image ? t("nax.imageUnavailable") : t("nax.notInCatalog")}</span>
          </div>
        )}
      </button>

      {selectMode && isAdded && <div className="pointer-events-none absolute inset-0 bg-primary/20" />}

      {/* Top: version / NEW + favorite */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-1">
        <div className="flex flex-wrap gap-1">
          {showCategory && (
            <span className={`rounded px-1 text-[9px] font-medium text-white ${CATEGORY_BADGE[item.category]}`}>
              {t(`nax.category.${item.category}`)}
            </span>
          )}
          {showVersion && image && (
            <span className="rounded bg-black/60 px-1 text-[9px] font-medium text-white">{image.modelVersion}</span>
          )}
          {image?.isNew && (
            <IconTooltip label={t("nax.newHint")}>
              <span className="pointer-events-auto rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground">NEW</span>
            </IconTooltip>
          )}
        </div>
        <IconTooltip label={isFavorite ? t("nax.unfavorite") : t("nax.favorite")}>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? t("nax.unfavorite") : t("nax.favorite")}
            aria-pressed={isFavorite}
            className={`pointer-events-auto rounded-full bg-black/50 p-1 transition-opacity hover:bg-black/70 ${isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
          >
            <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
          </button>
        </IconTooltip>
      </div>

      {/* Bottom: name, votes, add-to-prompt */}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-1 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-1.5 pt-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-white" title={item.tag}>{item.tag}</p>
          {image && image.upVotes + image.downVotes > 0 && (
            <p className="flex items-center gap-1.5 text-[9px] text-white/75 tabular">
              <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{image.upVotes}</span>
              <span className="flex items-center gap-0.5"><ThumbsDown className="h-2.5 w-2.5" />{image.downVotes}</span>
            </p>
          )}
        </div>
        <IconTooltip label={addLabel} side="top">
          <button
            type="button"
            onClick={onToggleAdd}
            aria-label={addLabel}
            aria-pressed={isAdded}
            className={`shrink-0 rounded-md p-1 transition-colors ${isAdded ? "bg-primary text-primary-foreground" : "bg-white/15 text-white hover:bg-primary hover:text-primary-foreground"}`}
          >
            {isAdded ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </IconTooltip>
      </div>
    </div>
  );
}
