import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SfxTextureIcon from "@/components/shared/SfxTextureIcon";
import { SFX_SIZES, SFX_TEXTURES, type SfxLine } from "@/lib/sound-effects";

interface SfxRowProps {
  line: SfxLine;
  onChange: (partial: Partial<Omit<SfxLine, "id">>) => void;
  onRemove: () => void;
}

/** One sound effect: its texture (picked from sample letters), size and text. */
export default function SfxRow({ line, onChange, onRemove }: SfxRowProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-muted/20 p-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 shrink-0 items-center gap-0.5 rounded-md border border-input px-1 text-foreground transition-colors hover:bg-accent"
            title={`${t("sfx.textureLabel")}: ${t(`sfx.texture.${line.texture}`)}`}
            aria-label={t("sfx.textureLabel")}
          >
            <SfxTextureIcon texture={line.texture} className="h-6 w-8" />
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-1 p-2">
          <p className="text-[9px] font-medium text-muted-foreground">{t("sfx.textureLabel")}</p>
          <div className="grid grid-cols-4 gap-1">
            {SFX_TEXTURES.map((tex) => (
              <button
                key={tex}
                type="button"
                aria-pressed={line.texture === tex}
                title={t(`sfx.textureHint.${tex}`)}
                onClick={() => { onChange({ texture: tex }); setOpen(false); }}
                className={`flex flex-col items-center gap-0.5 rounded-md border px-1 pt-1 pb-1 transition-colors ${
                  line.texture === tex ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-accent"
                }`}
              >
                <SfxTextureIcon texture={tex} className="h-7 w-10" />
                <span className="w-full truncate text-center text-[9px] leading-tight">{t(`sfx.texture.${tex}`)}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <div className="flex shrink-0 items-center rounded-md border border-border p-px" title={t("sfx.sizeLabel")}>
        {SFX_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={line.size === size}
            title={t(`sfx.sizeHint.${size}`)}
            onClick={() => onChange({ size })}
            className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              line.size === size ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {t(`sfx.size.${size}`)}
          </button>
        ))}
      </div>
      <input
        value={line.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={t("sfx.placeholder")}
        aria-label={t("sfx.textLabel")}
        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />
      <button
        type="button"
        title={t("sfx.remove")}
        aria-label={t("sfx.remove")}
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
