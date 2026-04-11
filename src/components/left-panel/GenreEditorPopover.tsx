import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENRE_ICONS, GENRE_COLORS, getGenreIcon } from "@/lib/genre-icons";

interface GenreEditorPopoverProps {
  onSave: (name: string, icon: string, color: string) => void | Promise<void>;
  trigger?: React.ReactNode;
  initialName?: string;
  initialIcon?: string;
  initialColor?: string;
}

export default function GenreEditorPopover({
  onSave,
  trigger,
  initialName = "",
  initialIcon = "user",
  initialColor = "#888888",
}: GenreEditorPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);
  const [color, setColor] = useState(initialColor);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setName(initialName);
      setIcon(initialIcon);
      setColor(initialColor);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim(), icon, color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="icon" className="h-7 w-7" title={t("promptGroup.newGenre")}>
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <div className="space-y-1">
          <Label className="text-xs">{t("promptGroup.genreNamePlaceholder")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Icon</Label>
          <div className="grid grid-cols-6 gap-1">
            {GENRE_ICONS.map((def) => {
              const Icon = def.icon;
              return (
                <button
                  key={def.name}
                  type="button"
                  className={`flex h-7 w-7 items-center justify-center rounded border ${
                    icon === def.name
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:bg-accent"
                  }`}
                  onClick={() => setIcon(def.name)}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Color</Label>
          <div className="grid grid-cols-6 gap-1">
            {GENRE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`h-6 w-6 rounded-full border-2 ${
                  color === c ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!name.trim()}>
            {t("common.save")}
          </Button>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 border-t pt-2">
          {(() => {
            const PreviewIcon = getGenreIcon(icon);
            return <PreviewIcon className="h-5 w-5" style={{ color }} />;
          })()}
          <span className="text-xs text-muted-foreground">
            {name || "—"}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
