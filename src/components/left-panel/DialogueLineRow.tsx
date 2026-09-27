import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import BubbleStylePicker from "./BubbleStylePicker";
import LetteringPicker from "./LetteringPicker";
import { TEXT_DIRECTIONS, type DialogueLine, type TextDirection } from "@/lib/dialogue";

interface DialogueLineRowProps {
  line: DialogueLine;
  onChange: (partial: Partial<Omit<DialogueLine, "id">>) => void;
  onRemove: () => void;
}

/** One dialogue line: its kind (bubble shape), writing direction and text. */
export default function DialogueLineRow({ line, onChange, onRemove }: DialogueLineRowProps) {
  const { t } = useTranslation();
  const direction = line.direction ?? "auto";

  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/20 p-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <BubbleStylePicker value={line.style} onChange={(style) => onChange({ style })} />
        <LetteringPicker value={line.lettering} onChange={(lettering) => onChange({ lettering })} />
        <div className="flex shrink-0 items-center rounded-md border border-border p-px" title={t("dialogue.directionLabel")}>
          {TEXT_DIRECTIONS.map((d: TextDirection) => (
            <button
              key={d}
              type="button"
              aria-pressed={direction === d}
              title={t(`dialogue.direction.${d}`)}
              onClick={() => onChange({ direction: d })}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                direction === d ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {t(`dialogue.directionShort.${d}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          title={t("dialogue.remove")}
          aria-label={t("dialogue.remove")}
          onClick={onRemove}
          className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        value={line.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={t("dialogue.placeholder")}
        aria-label={t("dialogue.textLabel")}
        rows={Math.min(Math.max(line.text.split("\n").length + 1, 3), 8)}
        className="block w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring"
      />
    </div>
  );
}
