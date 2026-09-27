import { useTranslation } from "react-i18next";
import { AlertTriangle, MessageSquareText, Plus } from "lucide-react";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { useSidebarPromptStore } from "@/stores/sidebar-prompt-store";
import { positiveTextOf } from "@/stores/sidebar-prompt-text-sync";
import { Checkbox } from "@/components/ui/checkbox";
import { textCharCount, textCharLimit, textIssues, type TextIssue } from "@/lib/in-image-text";
import { promptDrawsText, shouldStripNoText } from "@/lib/generation-request";
import DialogueLineRow from "./DialogueLineRow";

interface DialogueEditorProps {
  targetId: string;
  /** The main prompt's editor also shows the options shared by every target */
  isMain?: boolean;
}

function issueText(issue: TextIssue, t: (key: string, args?: Record<string, unknown>) => string): string {
  if (issue.kind === "tooLong") return t("dialogue.issue.tooLong", { count: issue.count, limit: issue.limit });
  return t(`dialogue.issue.${issue.kind}`);
}

/** Dialogue / in-image text lines of one prompt target, sent as a trailing `Text:` block. */
export default function DialogueEditor({ targetId, isMain = false }: DialogueEditorProps) {
  const { t } = useTranslation();
  const model = useGenerationParamsStore((s) => s.model);
  const stripNoText = useGenerationParamsStore((s) => s.stripNoTextWithDialogue);
  const setParam = useGenerationParamsStore((s) => s.setParam);
  const target = useSidebarPromptStore((s) => s.targets[targetId]);
  const characters = useGenerationParamsStore((s) => s.characters);
  const autoSfx = useGenerationParamsStore((s) => s.autoSfx);
  const showSharedOptions = useSidebarPromptStore((s) => isMain && (autoSfx || promptDrawsText(characters, s.targets)));
  // Sound effects always drop `no text` (it hides soft and automatic ones)
  const forcedBySfx = useSidebarPromptStore((s) =>
    shouldStripNoText({ characters, autoSfx, stripNoTextWithDialogue: false }, s.targets));
  const addLine = useSidebarPromptStore((s) => s.addDialogueLine);
  const updateLine = useSidebarPromptStore((s) => s.updateDialogueLine);
  const removeLine = useSidebarPromptStore((s) => s.removeDialogueLine);

  if (!target) return null;
  const lines = target.dialogue ?? [];
  // Dialogue and sound effects share one `Text:` block, so they are counted and checked together
  const count = textCharCount(target);
  const limit = textCharLimit(model);
  const issues = textIssues(model, target, positiveTextOf(target));

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <MessageSquareText className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-medium text-foreground" title={t("dialogue.hint")}>
          {t(isMain ? "dialogue.mainLabel" : "dialogue.charLabel")}
        </span>
        {count > 0 && (
          <span className={`text-[9px] tabular-nums ${count > limit ? "text-destructive" : "text-muted-foreground"}`}>
            {count}/{limit}
          </span>
        )}
        <button
          type="button"
          onClick={() => addLine(targetId)}
          className="ml-auto flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-2.5 w-2.5" />
          {t("dialogue.add")}
        </button>
      </div>

      {isMain && lines.length === 0 && (
        <p className="text-[9px] leading-snug text-muted-foreground">{t("dialogue.hint")}</p>
      )}

      {lines.map((line) => (
        <DialogueLineRow
          key={line.id}
          line={line}
          onChange={(partial) => updateLine(targetId, line.id, partial)}
          onRemove={() => removeLine(targetId, line.id)}
        />
      ))}

      {showSharedOptions && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <label
            className="flex items-center gap-1 text-[9px] text-muted-foreground"
            title={t(forcedBySfx ? "dialogue.stripNoTextBySfx" : "dialogue.stripNoTextHint")}
          >
            <Checkbox
              aria-label={t("dialogue.stripNoText")}
              className="size-3 [&_svg]:size-2.5"
              checked={forcedBySfx || stripNoText}
              disabled={forcedBySfx}
              onCheckedChange={(v) => setParam("stripNoTextWithDialogue", v === true)}
            />
            {t("dialogue.stripNoText")}
            {forcedBySfx && <span className="opacity-70">（{t("dialogue.stripNoTextBySfxShort")}）</span>}
          </label>
        </div>
      )}

      {issues.map((issue) => (
        <p key={issue.kind} className="flex items-start gap-1 text-[9px] leading-snug text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-px h-2.5 w-2.5 shrink-0" />
          {issueText(issue, t)}
        </p>
      ))}
    </div>
  );
}
