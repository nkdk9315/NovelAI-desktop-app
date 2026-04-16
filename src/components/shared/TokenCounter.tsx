import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptTokenCounts } from "@/hooks/use-prompt-token-counts";

interface TokenCounterProps {
  counts: PromptTokenCounts;
  compact?: boolean;
}

function Line({
  label,
  count,
  max,
  overflow,
}: {
  label: string;
  count: number;
  max: number;
  overflow: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
        overflow
          ? "bg-destructive/10 text-destructive"
          : "text-muted-foreground",
      )}
    >
      <span className="uppercase tracking-wide">{label}</span>
      <span className="tabular-nums">
        {count}
        <span className="opacity-60"> / {max}</span>
      </span>
    </div>
  );
}

export default function TokenCounter({ counts, compact = false }: TokenCounterProps) {
  const { t } = useTranslation();
  const { positiveTotal, negativeTotal, maxTokens, positiveOverflow, negativeOverflow, overflow } =
    counts;

  return (
    <div className={cn("flex flex-col gap-1", compact && "items-end")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Line
          label={t("generation.tokensPositive")}
          count={positiveTotal}
          max={maxTokens}
          overflow={positiveOverflow}
        />
        <Line
          label={t("generation.tokensNegative")}
          count={negativeTotal}
          max={maxTokens}
          overflow={negativeOverflow}
        />
      </div>
      {overflow && (
        <div className="flex items-center gap-1 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>{t("generation.tokenLimitExceeded", { max: maxTokens })}</span>
        </div>
      )}
    </div>
  );
}
