import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { useSpriteStore } from "@/stores/sprite-store";
import { slugKey, spriteTargetId, type SpriteSpec } from "@/lib/sprite/spec";
import { uniqueKey } from "@/lib/sprite/edit";
import { HelpDot, Tip } from "../Hint";

export const updateSpec = (fn: (s: SpriteSpec) => SpriteSpec) => useSpriteStore.getState().updateSpec(fn);

/** Drop the prompt targets of removed items. */
export function dropTargets(ids: string[]) {
  const store = useSidebarPromptStore.getState();
  for (const id of ids) store.removeTarget(spriteTargetId(id));
}

export function Section({ title, hint, help, actions, children }: {
  title: string; hint?: string;
  /** Longer explanation behind a "?" next to the title */
  help?: string;
  actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border px-4 py-4 last:border-b-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {help && <HelpDot text={help} side="right" />}
        <div className="flex-1" />
        {actions}
      </div>
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

/** A text input that commits on blur / Enter (so typing doesn't save on every key). */
export function CommitInput({ value, onCommit, className, ...rest }: {
  value: string; onCommit: (v: string) => void; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <Input
      {...rest}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { if (text !== value) onCommit(text); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`h-7 text-xs ${className ?? ""}`}
    />
  );
}

/** File-name key: slugged and unique among its siblings. */
export function KeyInput({ value, taken, fallback, onCommit }: {
  value: string; taken: string[]; fallback: string; onCommit: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Tip text={t("sprite.define.keyHint")}>
      <span className="inline-flex">
        <CommitInput
          value={value}
          onCommit={(v) => onCommit(uniqueKey(slugKey(v, fallback), taken))}
          className="w-24 font-mono"
          aria-label={t("sprite.define.key")}
        />
      </span>
    </Tip>
  );
}

export function RowActions({ index, count, onMove, onRemove, removeDisabled, confirm }: {
  index: number; count: number; onMove: (delta: number) => void; onRemove: () => void; removeDisabled?: boolean;
  /** Ask before removing (the item has images / masks that would be orphaned) */
  confirm?: string;
}) {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex shrink-0 items-center">
      <Tip text={t("sprite.define.moveUp")}>
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0} aria-label={t("sprite.define.moveUp")} onClick={() => onMove(-1)}>
          <ArrowUp className="h-3 w-3" />
        </Button>
      </Tip>
      <Tip text={t("sprite.define.moveDown")}>
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === count - 1} aria-label={t("sprite.define.moveDown")} onClick={() => onMove(1)}>
          <ArrowDown className="h-3 w-3" />
        </Button>
      </Tip>
      <Tip text={t("common.delete")}>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" disabled={removeDisabled} aria-label={t("common.delete")}
          onClick={() => (confirm ? setAsking(true) : onRemove())}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </Tip>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sprite.define.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onRemove}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const chip = (on: boolean) =>
  `rounded-md border px-1.5 py-0.5 text-[10px] transition-colors ${
    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;
