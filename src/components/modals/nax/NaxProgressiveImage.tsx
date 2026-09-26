import { useState } from "react";
import { naxThumbUrl } from "@/lib/nax";

interface Props {
  imageUrl: string;
  alt: string;
}

/** Cached thumbnail at once, swapped for the full-size original once loaded. */
export default function NaxProgressiveImage({ imageUrl, alt }: Props) {
  const [fullLoaded, setFullLoaded] = useState(false);
  return (
    <div className="relative aspect-[832/1216] w-full">
      <img src={naxThumbUrl(imageUrl)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={imageUrl}
        alt={alt}
        onLoad={() => setFullLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${fullLoaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
