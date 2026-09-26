import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HardDrive } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import IconTooltip from "@/components/shared/IconTooltip";
import * as naxIpc from "@/lib/ipc-nax";
import { formatBytes } from "@/lib/nax";
import { toastError } from "@/lib/toast-error";
import type { NaxThumbCacheInfoDto } from "@/types";

const LIMIT_OPTIONS_MB = [200, 500, 1000, 2000, 5000];

/** Cap as the user picked it: "500 MB", "2 GB". */
const formatLimit = (mb: number) => (mb >= 1000 && mb % 1000 === 0 ? `${mb / 1000} GB` : `${mb} MB`);

/** Thumbnail cache usage, size cap and clearing. */
export default function NaxCacheMenu() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<NaxThumbCacheInfoDto | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<NaxThumbCacheInfoDto>) => {
    setBusy(true);
    try { setInfo(await action()); } catch (e) { toastError(String(e)); } finally { setBusy(false); }
  };

  const limitOptions = info && !LIMIT_OPTIONS_MB.includes(info.limitMb)
    ? [...LIMIT_OPTIONS_MB, info.limitMb].sort((a, b) => a - b)
    : LIMIT_OPTIONS_MB;
  const usedRatio = info ? Math.min(1, info.usedBytes / (info.limitMb * 1024 * 1024)) : 0;

  return (
    <Popover onOpenChange={(o) => { if (o) run(naxIpc.naxThumbCacheInfo); }}>
      <IconTooltip label={t("nax.cache.title")}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label={t("nax.cache.title")}>
            <HardDrive className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <div>
          <p className="text-xs font-medium">{t("nax.cache.title")}</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{t("nax.cache.description")}</p>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${usedRatio * 100}%` }} />
          </div>
          <p className="text-[11px] tabular text-muted-foreground">
            {info
              ? t("nax.cache.usage", { used: formatBytes(info.usedBytes), limit: formatLimit(info.limitMb), count: info.fileCount })
              : "…"}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px]">{t("nax.cache.limit")}</span>
          <Select
            value={info ? String(info.limitMb) : undefined}
            disabled={!info || busy}
            onValueChange={(v) => run(() => naxIpc.naxSetThumbCacheLimit(Number(v)))}
          >
            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {limitOptions.map((mb) => (
                <SelectItem key={mb} value={String(mb)} className="text-xs">{formatLimit(mb)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!info || busy || info.fileCount === 0}
          onClick={() => run(naxIpc.naxClearThumbCache)}
        >
          {t("nax.cache.clear")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
