import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNaxStore } from "@/stores/nax-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { bestImageByTag, naxCategoryOfSlug, naxTagKey, naxThumbUrl, naxVersionForModel } from "@/lib/nax";

interface Props {
  name: string;
  children: ReactNode;
}

/**
 * Hover preview of an artist's style from the nax.moe catalog, for the
 * current model. Renders just the children when the catalog has no image.
 */
export default function NaxArtistPreview({ name, children }: Props) {
  const key = naxTagKey(name);
  const images = useNaxStore((s) => s.imagesByTag[key]);
  const lookupTags = useNaxStore((s) => s.lookupTags);
  const version = naxVersionForModel(useGenerationParamsStore((s) => s.model));
  const artistImages = (images ?? []).filter((img) => naxCategoryOfSlug(img.gallerySlug) === "artist");
  const image = bestImageByTag(artistImages, version).get(key);

  return (
    <Tooltip delayDuration={350} onOpenChange={(o) => { if (o) lookupTags([name]).catch(() => {}); }}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      {image && (
        <TooltipContent side="right" className="p-1">
          <img src={naxThumbUrl(image.imageUrl)} alt={name} className="aspect-[832/1216] w-40 rounded object-cover" />
          <p className="px-0.5 pt-1 text-[10px]">
            {name} <span className="opacity-70">· nax.moe {image.modelVersion}</span>
          </p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
