import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LetteringIcon from "@/components/shared/LetteringIcon";
import { LETTERING_STYLE_IDS, isLetteringStyle, type LetteringStyle } from "@/lib/lettering-styles";

/** Pick the font look of a dialogue line from a grid of sample letters. */
export default function LetteringPicker({ value, onChange }: {
  value: string | undefined; onChange: (id: LetteringStyle) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current: LetteringStyle = value && isLetteringStyle(value) ? value : "auto";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-input px-1 text-[10px] text-foreground transition-colors hover:bg-accent"
          title={`${t("dialogue.letteringLabel")}: ${t(`dialogue.lettering.${current}`)}`}
          aria-label={t("dialogue.letteringLabel")}
        >
          <LetteringIcon style={current} className="h-5 w-7" />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-1 p-2">
        <p className="text-[9px] font-medium text-muted-foreground">{t("dialogue.letteringLabel")}</p>
        <div className="grid grid-cols-4 gap-1">
          {LETTERING_STYLE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={current === id}
              title={t(`dialogue.letteringHint.${id}`)}
              onClick={() => { onChange(id); setOpen(false); }}
              className={`flex flex-col items-center gap-0.5 rounded-md border px-1 pt-1 pb-1 transition-colors ${
                current === id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-accent"
              }`}
            >
              <LetteringIcon style={id} className="h-7 w-10" />
              <span className="w-full truncate text-center text-[9px] leading-tight">{t(`dialogue.lettering.${id}`)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
