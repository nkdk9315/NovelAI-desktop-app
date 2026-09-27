import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Plus, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BubbleShapeIcon from "@/components/shared/BubbleShapeIcon";
import BubbleStylesDialog from "@/components/modals/BubbleStylesDialog";
import { useBubbleStyleStore } from "@/stores/bubble-style-store";
import {
  BUILTIN_BUBBLE_STYLE_IDS, bubbleStyleGroup, bubbleStyleLabel, customBubbleStyleId, resolveBubbleStyle,
  type BubbleShape, type BubbleStyleGroup, type BubbleStyleId,
} from "@/lib/bubble-styles";

const GROUPS: readonly BubbleStyleGroup[] = ["manga", "screen"];

function Tile({ shape, label, hint, selected, onClick }: {
  shape: BubbleShape; label: string; hint?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={hint ? `${label} — ${hint}` : label}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-md border px-1 pt-1.5 pb-1 transition-colors ${
        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-accent"
      }`}
    >
      <BubbleShapeIcon shape={shape} className="h-7 w-10" />
      <span className="w-full truncate text-center text-[9px] leading-tight">{label}</span>
    </button>
  );
}

/** Pick how a dialogue line is drawn, from a grid of bubble shapes (built-in + user-registered). */
export default function BubbleStylePicker({ value, onChange }: {
  value: BubbleStyleId; onChange: (id: BubbleStyleId) => void;
}) {
  const { t } = useTranslation();
  const customs = useBubbleStyleStore((s) => s.customBubbleStyles);
  const loaded = useBubbleStyleStore((s) => s.loaded);
  const load = useBubbleStyleStore((s) => s.loadCustomBubbleStyles);
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const current = resolveBubbleStyle(value, customs);
  const pick = (id: BubbleStyleId) => { onChange(id); setOpen(false); };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-7 min-w-0 items-center gap-1 rounded-md border border-input px-1.5 text-[10px] text-foreground transition-colors hover:bg-accent"
            title={t("dialogue.styleLabel")}
          >
            <BubbleShapeIcon shape={current.shape} className="h-5 w-7 shrink-0" />
            <span className="truncate">{bubbleStyleLabel(value, customs, t)}</span>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-[70vh] w-80 space-y-2 overflow-y-auto p-2">
          {GROUPS.map((group) => (
            <div key={group} className="space-y-1">
              <p className="text-[9px] font-medium text-muted-foreground">{t(`dialogue.group.${group}`)}</p>
              <div className="grid grid-cols-4 gap-1">
                {BUILTIN_BUBBLE_STYLE_IDS.filter((id) => bubbleStyleGroup(id) === group).map((id) => (
                  <Tile
                    key={id}
                    shape={resolveBubbleStyle(id, []).shape}
                    label={t(`dialogue.style.${id}`)}
                    hint={t(`dialogue.styleHint.${id}`)}
                    selected={value === id}
                    onClick={() => pick(id)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-1 border-t border-border pt-2">
            <p className="text-[9px] font-medium text-muted-foreground">{t("dialogue.customGroup")}</p>
            <div className="grid grid-cols-4 gap-1">
              {customs.map((c) => (
                <Tile
                  key={c.id}
                  shape={c.shape}
                  label={c.name}
                  hint={c.phrase}
                  selected={value === customBubbleStyleId(c.id)}
                  onClick={() => pick(customBubbleStyleId(c.id))}
                />
              ))}
              <button
                type="button"
                onClick={() => { setOpen(false); setManageOpen(true); }}
                className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border px-1 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {customs.length > 0 ? <Settings2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span className="text-[9px] leading-tight">
                  {t(customs.length > 0 ? "dialogue.manageCustom" : "dialogue.addCustom")}
                </span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {manageOpen && (
        <BubbleStylesDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          onCreated={(id) => onChange(customBubbleStyleId(id))}
        />
      )}
    </>
  );
}
