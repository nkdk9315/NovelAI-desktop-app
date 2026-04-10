import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ImageIcon, Search, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MODEL_TO_VIBE_KEY } from "@/lib/constants";
import type { VibeDto } from "@/types";
import * as ipc from "@/lib/ipc";

interface VibePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVibeIds: string[];
  modelFilter: string;
  maxVibes?: number;
  onConfirm: (vibeIds: string[]) => void;
}

export default function VibePickerModal({
  open,
  onOpenChange,
  selectedVibeIds,
  modelFilter,
  maxVibes,
  onConfirm,
}: VibePickerModalProps) {
  const { t } = useTranslation();
  const [vibes, setVibes] = useState<VibeDto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedVibeIds));

  useEffect(() => {
    if (open) {
      setSelected(new Set(selectedVibeIds));
      ipc.listVibes().then(setVibes).catch(() => {});
    }
  }, [open, selectedVibeIds]);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const vibeKey = MODEL_TO_VIBE_KEY[modelFilter];
  const filteredVibes = useMemo(() => {
    let list = vibeKey ? vibes.filter((v) => v.model === vibeKey) : vibes;
    if (showFavoritesOnly) list = list.filter((v) => v.isFavorite);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q));
    }
    return list;
  }, [vibes, vibeKey, showFavoritesOnly, searchQuery]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (maxVibes && next.size >= maxVibes) return prev;
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{t("style.selectVibes")}</DialogTitle>
            <div className="flex items-center gap-1">
              <div
                className="flex items-center cursor-text"
                onMouseEnter={() => setShowSearch(true)}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={(el) => { if (el && showSearch) el.focus(); }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setShowSearch(false); }}
                  placeholder={t("common.search")}
                  className={`bg-transparent border-b border-transparent text-[10px] outline-none transition-all duration-200 ml-1 ${
                    showSearch ? "w-28 border-muted-foreground/30 opacity-100" : "w-0 opacity-0 pointer-events-none"
                  }`}
                />
              </div>
              <Button
                variant={showFavoritesOnly ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowFavoritesOnly((v) => !v)}
                title={t("vibe.favoritesOnly")}
              >
                <Star className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-72">
          {filteredVibes.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("vibe.empty")}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 pr-2">
              {filteredVibes.map((vibe) => {
                const isSelected = selected.has(vibe.id);
                return (
                  <div
                    key={vibe.id}
                    className={`relative rounded-lg border p-1.5 cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
                    }`}
                    onClick={() => toggle(vibe.id)}
                  >
                    <div className="aspect-square rounded bg-muted mb-1 overflow-hidden flex items-center justify-center">
                      {vibe.thumbnailPath ? (
                        <img src={`asset://localhost/${vibe.thumbnailPath}`} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] truncate flex-1">{vibe.name}</p>
                      <button
                        className="p-0.5 rounded-full hover:bg-accent transition-colors shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          ipc.toggleVibeFavorite(vibe.id).then(() => {
                            ipc.listVibes().then(setVibes).catch(() => {});
                          });
                        }}
                      >
                        <Star className={`h-3 w-3 ${vibe.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400"}`} />
                      </button>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => { onConfirm([...selected]); onOpenChange(false); }}>
            {t("common.save")} ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
