import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as ipc from "@/lib/ipc";
import type { GenreDto } from "@/types";

interface SystemGroupSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemGroupId: string | null;
  systemGroupName: string;
  genres: GenreDto[];
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
}

export default function SystemGroupSettingsModal({
  open,
  onOpenChange,
  systemGroupId,
  systemGroupName,
  genres,
  contentClassName,
  contentStyle,
}: SystemGroupSettingsModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !systemGroupId) return;
    setSearch("");
    let cancelled = false;
    ipc.getSystemGroupGenreDefaults(systemGroupId).then((loaded) => {
      if (cancelled) return;
      setSelected(new Set(loaded.filter((e) => e.showByDefault).map((e) => e.genreId)));
    }).catch((e) => toast.error(String(e)));
    return () => { cancelled = true; };
  }, [open, systemGroupId]);

  const toggle = (genreId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(genreId); else next.delete(genreId);
      return next;
    });
  };

  const filteredGenres = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter((g) => g.name.toLowerCase().includes(q));
  }, [genres, search]);

  const handleSave = async () => {
    if (!systemGroupId) return;
    setSaving(true);
    try {
      const payload = Array.from(selected).map((genreId) => ({
        genreId,
        showByDefault: true,
      }));
      await ipc.setSystemGroupGenreDefaults(systemGroupId, payload);
      onOpenChange(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName ?? "max-w-md"} style={contentStyle}>
        <DialogHeader>
          <DialogTitle>
            {t("systemGroupSettings.title")}
            {systemGroupName ? ` — ${systemGroupName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {t("systemGroupSettings.description")}
          </p>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="h-8 text-xs"
          />

          {genres.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("systemGroupSettings.noGenres")}</p>
          ) : (
            <div className="h-72 overflow-y-auto space-y-0.5 border rounded-md p-2">
              {filteredGenres.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-2 text-center">
                  {t("systemGroupSettings.noMatches")}
                </p>
              ) : (
                filteredGenres.map((genre) => {
                  const checked = selected.has(genre.id);
                  return (
                    <label
                      key={genre.id}
                      className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggle(genre.id, v === true)}
                      />
                      <span className="flex-1 truncate">{genre.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {t("systemGroupSettings.selectedCount", { count: selected.size })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
