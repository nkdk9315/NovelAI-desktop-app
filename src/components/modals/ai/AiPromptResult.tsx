import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AiPromptRow } from "@/lib/ai-prompt";

interface AiPromptResultProps {
  groupName: string;
  rows: AiPromptRow[];
  onGroupNameChange: (v: string) => void;
  onRowChange: (key: string, partial: Partial<AiPromptRow>) => void;
}

/** Preview of what the AI wrote: pick, rename and fix entries before saving. */
export default function AiPromptResult({ groupName, rows, onGroupNameChange, onRowChange }: AiPromptResultProps) {
  const { t } = useTranslation();
  const checkedCount = rows.filter((r) => r.checked).length;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="ai-group-name" className="text-xs">{t("ai.result.groupName")}</Label>
        <Input id="ai-group-name" value={groupName} onChange={(e) => onGroupNameChange(e.target.value)} className="h-8 text-xs" />
      </div>
      <p className="text-[11px] text-muted-foreground">{t("ai.result.selected", { count: checkedCount, total: rows.length })}</p>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div key={row.key} className={`space-y-1.5 rounded-md border border-border p-2 ${row.checked ? "" : "opacity-50"}`}>
            <div className="flex items-center gap-2">
              <Checkbox checked={row.checked} onCheckedChange={(v) => onRowChange(row.key, { checked: v === true })}
                aria-label={t("ai.result.include")} />
              <Input value={row.name} onChange={(e) => onRowChange(row.key, { name: e.target.value })}
                aria-label={t("ai.result.entryName")} className="h-7 text-xs" />
            </div>
            <Textarea value={row.prompt} onChange={(e) => onRowChange(row.key, { prompt: e.target.value })}
              aria-label={t("ai.result.entryPrompt")} rows={2} className="min-h-0 text-xs" />
            {row.unknownTags.length > 0 && (
              <p className="text-[11px] text-amber-500">{t("ai.result.unknownTags")}: {row.unknownTags.join(", ")}</p>
            )}
            {row.removedTags.length > 0 && (
              <p className="text-[11px] text-muted-foreground">{t("ai.result.removedTags")}: {row.removedTags.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
