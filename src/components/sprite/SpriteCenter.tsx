import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import { useSpriteStore, type CenterTab } from "@/stores/sprite-store";
import SpriteSetBar from "./SpriteSetBar";
import SpriteQueueBar from "./SpriteQueueBar";
import SpriteMatrix from "./matrix/SpriteMatrix";
import SpriteDefineView from "./define/SpriteDefineView";
import SpriteExportView from "./export/SpriteExportView";

const TABS: CenterTab[] = ["matrix", "define", "export"];

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
              <button
                key={id}
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
            ))}
            <div className="flex-1" />
            <SpriteQueueBar />
          </div>
          <div key={tab} className="min-h-0 flex-1 overflow-auto">
            {tab === "matrix" && <SpriteMatrix />}
            {tab === "define" && <SpriteDefineView />}
            {tab === "export" && <SpriteExportView />}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <Layers className="h-8 w-8 opacity-40" />
          <p>{t("sprite.noSetYet")}</p>
          <p className="max-w-md text-xs">{t("sprite.intro")}</p>
        </div>
      )}
    </div>
  );
}
