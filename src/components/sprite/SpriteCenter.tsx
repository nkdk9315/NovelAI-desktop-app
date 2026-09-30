import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Images, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpriteStore, type CenterTab } from "@/stores/sprite-store";
import SpriteSetBar from "./SpriteSetBar";
import SpriteQueueBar from "./SpriteQueueBar";
import SpriteMatrix from "./matrix/SpriteMatrix";
import SpriteDefineView from "./define/SpriteDefineView";
import SpriteExportView from "./export/SpriteExportView";
import SpriteGuideView from "./guide/SpriteGuideView";
import NewSpriteSetDialog from "./NewSpriteSetDialog";
import SpriteHelpDialog from "./SpriteHelpDialog";
import SpriteSampleDialog from "./SpriteSampleDialog";
import { Tip } from "./Hint";

const TABS: CenterTab[] = ["guide", "matrix", "define", "export"];

export default function SpriteCenter() {
  const { t } = useTranslation();
  const spec = useSpriteStore((s) => s.spec);
  const tab = useSpriteStore((s) => s.tab);
  const setTab = useSpriteStore((s) => s.setTab);

  return (
    <div className="flex h-full flex-col">
      <SpriteSetBar />
      {spec ? (
        <>
          <div className="flex items-center gap-1 border-b border-border px-3" role="tablist">
            {TABS.map((id) => (
              <Tip key={id} side="top" text={t(`sprite.tabHint.${id}`)}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                    tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`sprite.tab.${id}`)}
                </button>
              </Tip>
            ))}
            <div className="flex-1" />
            <SpriteQueueBar />
          </div>
          <div key={tab} className="min-h-0 flex-1 overflow-auto">
            {tab === "guide" && <SpriteGuideView />}
            {tab === "matrix" && <SpriteMatrix />}
            {tab === "define" && <SpriteDefineView />}
            {tab === "export" && <SpriteExportView />}
          </div>
        </>
      ) : (
        <Welcome />
      )}
    </div>
  );
}

/** No set yet: what this page does, in three steps, and where to start. */
function Welcome() {
  const { t } = useTranslation();
  const [newOpen, setNewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const steps = t("sprite.welcome.steps", { returnObjects: true }) as unknown as { term: string; desc: string }[];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-8 text-center">
      <Layers className="h-8 w-8 text-muted-foreground/60" />
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("sprite.welcome.title")}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{t("sprite.intro")}</p>
      </div>
      <ol className="grid max-w-2xl gap-2 text-left text-xs sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.term} className="rounded-md border border-border p-3">
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[9px] text-primary">{i + 1}</span>
              {s.term}
            </p>
            <p className="leading-relaxed text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <Button size="sm" className="gap-1" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" />{t("sprite.welcome.create")}</Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setSampleOpen(true)}><Images className="h-4 w-4" />{t("sprite.sample.open")}</Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setHelpOpen(true)}><BookOpen className="h-4 w-4" />{t("sprite.help.open")}</Button>
      </div>
      {newOpen && <NewSpriteSetDialog open={newOpen} onOpenChange={setNewOpen} />}
      {helpOpen && <SpriteHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />}
      {sampleOpen && <SpriteSampleDialog open={sampleOpen} onOpenChange={setSampleOpen} />}
    </div>
  );
}
