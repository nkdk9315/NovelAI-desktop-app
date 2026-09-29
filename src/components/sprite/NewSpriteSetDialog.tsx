import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpriteStore } from "@/stores/sprite-store";
import { useSpriteTemplateStore } from "@/stores/sprite-template-store";
import { BUILTIN_TEMPLATES, builtinTemplate, templateSize, withFreshIds } from "@/lib/sprite/templates";
import { randomSeed, slugKey, type SpriteSpec } from "@/lib/sprite/spec";
import { toastError } from "@/lib/toast-error";

type Choice = { kind: "builtin"; id: (typeof BUILTIN_TEMPLATES)[number] } | { kind: "user"; id: string };

export default function NewSpriteSetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const templates = useSpriteTemplateStore((s) => s.templates);
  const loaded = useSpriteTemplateStore((s) => s.loaded);
  const [name, setName] = useState("");
  const [choice, setChoice] = useState<Choice>({ kind: "builtin", id: "rpg-battle" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loaded) void useSpriteTemplateStore.getState().load(); }, [loaded]);

  const specOf = (c: Choice): SpriteSpec | null => {
    if (c.kind === "builtin") return builtinTemplate(c.id);
    const tpl = templates.find((x) => x.id === c.id);
    return tpl ? { ...withFreshIds(tpl.spec, false), seed: randomSeed() } : null;
  };

  const create = async () => {
    const spec = specOf(choice);
    if (!spec || !name.trim()) return;
    setBusy(true);
    try {
      await useSpriteStore.getState().createSet(name.trim(), { ...spec, characterKey: slugKey(name, spec.characterKey) });
      useSpriteStore.getState().setTab("define");
      onOpenChange(false);
    } catch (e) {
      toastError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const row = (c: Choice, title: string, desc: string, extra?: React.ReactNode) => {
    const on = c.kind === choice.kind && c.id === choice.id;
    const size = specOf(c);
    const s = size ? templateSize(size) : null;
    return (
      <div
        key={`${c.kind}:${c.id}`}
        role="radio"
        aria-checked={on}
        tabIndex={0}
        onClick={() => setChoice(c)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setChoice(c); }}
        className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-left ${on ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
          {s && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t("sprite.template.size", { poses: s.poses })}
              {s.axes.map((a) => ` · ${a.label}×${a.levels}`).join("")}
            </p>
          )}
        </div>
        {extra}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sprite.newSet")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="sprite-set-name" className="text-xs">{t("sprite.setName")}</Label>
            <Input id="sprite-set-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("sprite.setNamePlaceholder")} />
          </div>
          <div className="space-y-1" role="radiogroup" aria-label={t("sprite.template.label")}>
            <Label className="text-xs">{t("sprite.template.label")}</Label>
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {BUILTIN_TEMPLATES.map((id) =>
                row({ kind: "builtin", id }, t(`sprite.template.${id}.name`), t(`sprite.template.${id}.desc`)))}
              {templates.map((tpl) =>
                row({ kind: "user", id: tpl.id }, tpl.name, t("sprite.template.user"), (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    title={t("common.delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (choice.kind === "user" && choice.id === tpl.id) setChoice({ kind: "builtin", id: "blank" });
                      void useSpriteTemplateStore.getState().remove(tpl.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={create} disabled={busy || !name.trim()}>{t("common.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
