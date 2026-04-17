import { useTranslation } from "react-i18next";
import type { Character } from "@/stores/generation-params-store";

interface Props {
  label: string;
  value: string;
  onChange: (id: string) => void;
  characters: Character[];
}

export default function CharacterPicker({ label, value, onChange, characters }: Props) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded border border-border bg-background px-2 text-xs"
      >
        <option value="">{t("sidebarPresetGroups.pair.pickerPlaceholder")}</option>
        <option value="main">Main</option>
        {characters.map((c, idx) => (
          <option key={c.id} value={c.id}>
            #{idx + 1} {c.genreName}
          </option>
        ))}
      </select>
    </label>
  );
}
