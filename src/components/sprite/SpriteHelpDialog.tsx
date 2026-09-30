import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpriteStore } from "@/stores/sprite-store";

interface Item { term: string; desc: string }

const PAGES = ["flow", "terms", "screen", "faq"] as const;

/** 使い方: the workflow, the vocabulary of the screen, where things are, and common questions. */
export default function SpriteHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const hasSet = useSpriteStore((s) => s.spec != null);
  const list = (key: string) => t(key, { returnObjects: true }) as unknown as Item[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("sprite.help.title")}</DialogTitle>
          <DialogDescription>{t("sprite.help.lead")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="flow" className="min-h-0">
          <TabsList>
            {PAGES.map((p) => <TabsTrigger key={p} value={p} className="text-xs">{t(`sprite.help.pages.${p}`)}</TabsTrigger>)}
          </TabsList>
          {PAGES.map((p) => (
            <TabsContent key={p} value={p} className="max-h-[58vh] overflow-y-auto pr-1">
              {p === "flow" ? (
                <ol className="space-y-2 text-xs">
                  {list("sprite.help.flow").map((it, i) => (
                    <li key={it.term} className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{i + 1}</span>
                      <div>
                        <p className="font-medium">{it.term}</p>
                        <p className="leading-relaxed text-muted-foreground">{it.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <dl className="space-y-2 text-xs">
                  {list(`sprite.help.${p}`).map((it) => (
                    <div key={it.term} className="rounded-md border border-border p-2">
                      <dt className="font-medium">{it.term}</dt>
                      <dd className="mt-0.5 leading-relaxed text-muted-foreground">{it.desc}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </TabsContent>
          ))}
        </Tabs>
        {hasSet && (
          <Button size="sm" variant="outline" className="w-fit gap-1 text-xs"
            onClick={() => { useSpriteStore.getState().setTab("guide"); onOpenChange(false); }}>
            <Compass className="h-3.5 w-3.5" />{t("sprite.help.toGuide")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
