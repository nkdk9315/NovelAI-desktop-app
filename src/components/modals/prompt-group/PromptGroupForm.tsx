import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GenreDto, PromptGroupDto } from "@/types";

interface PromptGroupFormProps {
  editing: PromptGroupDto | null;
  showCreateForm: boolean;
  formName: string;
  onFormNameChange: (name: string) => void;
  formGenreId: string | null;
  onFormGenreIdChange: (id: string | null) => void;
  formUsageType: string;
  onFormUsageTypeChange: (type: string) => void;
  formTags: string[];
  formTagInput: string;
  onFormTagInputChange: (input: string) => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  genres: GenreDto[];
}

export default function PromptGroupForm({
  showCreateForm,
  formName,
  onFormNameChange,
  formGenreId,
  onFormGenreIdChange,
  formUsageType,
  onFormUsageTypeChange,
  formTags,
  formTagInput,
  onFormTagInputChange,
  onAddTag,
  onRemoveTag,
  onSave,
  onCancel,
  genres,
}: PromptGroupFormProps) {
  const { t } = useTranslation();

  if (!showCreateForm) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        {t("promptGroup.noGroups")}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs">{t("promptGroup.name")}</Label>
        <Input
          value={formName}
          onChange={(e) => onFormNameChange(e.target.value)}
          placeholder={t("promptGroup.namePlaceholder")}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("promptGroup.genre")}</Label>
        <Select
          value={formGenreId ?? "none"}
          onValueChange={(v) => onFormGenreIdChange(v === "none" ? null : v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("promptGroup.usage")}</Label>
        <Select value={formUsageType} onValueChange={onFormUsageTypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">{t("promptGroup.usageBoth")}</SelectItem>
            <SelectItem value="main">{t("promptGroup.usageMain")}</SelectItem>
            <SelectItem value="character">{t("promptGroup.usageCharacter")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">{t("promptGroup.tags")}</Label>
        <div className="flex flex-wrap gap-1">
          {formTags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs">
              {tag}
              <button type="button" onClick={() => onRemoveTag(i)}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={formTagInput}
            onChange={(e) => onFormTagInputChange(e.target.value)}
            placeholder={t("promptGroup.tagPlaceholder")}
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag();
              }
            }}
          />
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onAddTag}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" className="text-xs" onClick={onSave} disabled={!formName.trim()}>
          {t("common.save")}
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </>
  );
}
