import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dices, History } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useGenerationStore } from "@/stores/generation-store";

const MAX_SEED = 4_294_967_295;

/** Fixed seed (empty = a new random seed for every generation). */
export default function SeedField() {
  const { t } = useTranslation();
  const seed = useGenerationParamsStore((s) => s.seed);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const lastSeed = useGenerationStore((s) => s.lastResult?.seed ?? null);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.trim());
    setParam("seed", draft.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= MAX_SEED ? n : null);
    setDraft(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("generation.seed")}</Label>
        <span className="text-[10px] text-muted-foreground">
          {seed === null ? t("generation.seedRandom") : t("generation.seedFixed")}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? (seed === null ? "" : String(seed))}
          placeholder={t("generation.seedRandom")}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          className="h-7 min-w-0 flex-1 rounded border border-border bg-background px-2 font-mono text-xs tabular outline-none focus:border-ring"
        />
        <Button
          variant="ghost" size="icon" className="h-7 w-7" disabled={lastSeed === null || lastSeed === 0}
          title={t("generation.seedUseLast")} onClick={() => lastSeed && setParam("seed", lastSeed)}
        >
          <History className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title={t("generation.seedClear")} onClick={() => setParam("seed", null)}>
          <Dices className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
