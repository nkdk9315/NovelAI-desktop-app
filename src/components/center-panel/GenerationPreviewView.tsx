import { useState } from "react";
import type { GenerationPreview } from "@/stores/generation-store";

const FRAME = "col-start-1 row-start-1 max-h-full max-w-full object-contain";

/**
 * The running generation's denoising previews. Each one fades in over the
 * one before, so the picture rises out of the noise as on the official site.
 * `width`/`height` give it the final image's box even if previews are smaller.
 */
export default function GenerationPreviewView({ preview }: { preview: GenerationPreview }) {
  const [frames, setFrames] = useState<{ under: string | null; top: string }>({ under: null, top: preview.src });
  if (frames.top !== preview.src) setFrames({ under: frames.top, top: preview.src });

  return (
    <div className="grid h-full w-full grid-cols-1 grid-rows-1 place-items-center">
      {frames.under && (
        <img src={frames.under} alt="" width={preview.width} height={preview.height} draggable={false} className={FRAME} />
      )}
      <img
        key={frames.top}
        src={frames.top}
        alt=""
        width={preview.width}
        height={preview.height}
        draggable={false}
        className={`${FRAME} animate-preview-in`}
      />
    </div>
  );
}
