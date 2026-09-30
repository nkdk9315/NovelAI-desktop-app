import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSpriteQueueStore } from "@/stores/sprite-queue-store";
import { useSpriteStore } from "@/stores/sprite-store";
import { cellLabel, parseCellKey } from "@/lib/sprite/cells";

/** Generation progress, stop button and the reasons cells were skipped. */
export default function SpriteQueueBar() {
  const { t } = useTranslation();
  const running = useSpriteQueueStore((s) => s.running);
  const done = useSpriteQueueStore((s) => s.done);
  const total = useSpriteQueueStore((s) => s.total);
  const failures = useSpriteQueueStore((s) => s.failures);
  const stopRequested = useSpriteQueueStore((s) => s.stopRequested);
  const spec = useSpriteStore((s) => s.spec);

  const reason = (r: string) => (r.startsWith("sprite.") || r.startsWith("generation.") || r.startsWith("manga.") ? t(r) : r);

  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      {running && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="tabular text-muted-foreground">{t("sprite.queue.progress", { done, total })}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={stopRequested}
            onClick={() => useSpriteQueueStore.getState().requestStop()}
          >
            <Square className="h-3 w-3" />{stopRequested ? t("sprite.queue.stopping") : t("sprite.queue.stop")}
          </Button>
        </>
      )}
      {failures.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />{t("sprite.queue.failures", { count: failures.length })}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 space-y-2">
            <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
              {failures.map((f, i) => (
                <li key={`${f.key}-${i}`} className="rounded border border-border p-1.5">
                  <button
                    type="button"
                    className="font-medium underline-offset-2 hover:underline"
                    onClick={() => useSpriteStore.getState().selectCell(f.key)}
                  >
                    {spec ? cellLabel(spec, parseCellKey(f.key)) : f.key}
                  </button>
                  <p className="break-words text-muted-foreground">{reason(f.reason)}</p>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="h-7 w-full text-xs" onClick={() => useSpriteQueueStore.getState().clearFailures()}>
              {t("sprite.queue.clearFailures")}
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
