import { useTranslation } from "react-i18next";
import { Dices, Search, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NAX_CATEGORIES, NAX_VERSIONS } from "@/lib/nax";
import IconTooltip from "@/components/shared/IconTooltip";
import type { NaxTab } from "@/stores/nax-store";
import type { NaxFavoriteFilter, NaxSort } from "@/stores/nax-view-store";
import type { NaxCategory, NaxGalleryDto } from "@/types";

interface Props {
  tab: NaxTab;
  onTabChange: (tab: NaxTab) => void;
  favoriteCount: number;
  /** Favorites tab: genre filter and per-genre counts. */
  favCategory: NaxFavoriteFilter<NaxCategory>;
  onFavCategoryChange: (c: NaxFavoriteFilter<NaxCategory>) => void;
  favoriteCounts: Partial<Record<NaxFavoriteFilter<NaxCategory>, number>>;
  /** Versions that have a gallery for the current tab ("all" on favorites). */
  versions: string[];
  version: string | null;
  /** Version matching the generation model, marked in the picker. */
  modelVersion: string | null;
  onVersionChange: (v: string) => void;
  variants: NaxGalleryDto[];
  gallerySlug: string | null;
  onGalleryChange: (slug: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  sort: NaxSort;
  onSortChange: (s: NaxSort) => void;
  onReshuffle: () => void;
  count: number;
}

const chip = (active: boolean) =>
  `rounded-md px-2.5 py-1 text-xs transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`;

export default function NaxToolbar(p: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {NAX_CATEGORIES.map((c) => (
          <button key={c} type="button" className={chip(p.tab === c)} onClick={() => p.onTabChange(c)}>
            {t(`nax.category.${c}`)}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <button type="button" className={`${chip(p.tab === "favorites")} flex items-center gap-1`} onClick={() => p.onTabChange("favorites")}>
          <Star className="h-3 w-3" />
          {t("nax.favorites")}
          {p.favoriteCount > 0 && <span className="tabular opacity-80">{p.favoriteCount}</span>}
        </button>
      </div>

      {p.tab === "favorites" && (
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={t("nax.genre")}>
          {(["all", ...NAX_CATEGORIES] as const)
            .filter((c) => c === "all" || c === p.favCategory || (p.favoriteCounts[c] ?? 0) > 0)
            .map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={p.favCategory === c}
                onClick={() => p.onFavCategoryChange(c)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${p.favCategory === c ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {c === "all" ? t("nax.allGenres") : t(`nax.category.${c}`)}
                <span className="tabular opacity-70">{p.favoriteCounts[c] ?? 0}</span>
              </button>
            ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border p-0.5" role="radiogroup" aria-label={t("nax.version")}>
          {["all", ...NAX_VERSIONS].filter((v) => p.versions.includes(v)).map((v) => {
            const button = (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={p.version === v}
                onClick={() => p.onVersionChange(v)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${p.version === v ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v === "all" ? t("nax.allVersions") : v}
                {v === p.modelVersion && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
            return v === p.modelVersion
              ? <IconTooltip key={v} label={t("nax.currentModel")}>{button}</IconTooltip>
              : button;
          })}
        </div>

        {p.variants.length > 1 && (
          <Select value={p.gallerySlug ?? undefined} onValueChange={p.onGalleryChange}>
            <SelectTrigger className="h-7 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {p.variants.map((g) => (
                <SelectItem key={g.slug} value={g.slug} className="text-xs">{g.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={p.search}
            onChange={(e) => p.onSearchChange(e.target.value)}
            placeholder={t("nax.searchPlaceholder")}
            className="h-7 w-full rounded-md border border-border bg-muted/40 pl-7 pr-2 text-xs outline-none focus:border-primary/50 focus:bg-background"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>

        <Select value={p.sort} onValueChange={(v) => p.onSortChange(v as NaxSort)}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="score" className="text-xs">{t("nax.sort.score")}</SelectItem>
            <SelectItem value="recent" className="text-xs" title={t("nax.sort.recentHint")}>{t("nax.sort.recent")}</SelectItem>
            <SelectItem value="name" className="text-xs">{t("nax.sort.name")}</SelectItem>
            <SelectItem value="random" className="text-xs">{t("nax.sort.random")}</SelectItem>
          </SelectContent>
        </Select>
        {p.sort === "random" && (
          <IconTooltip label={t("nax.reshuffle")}>
            <button
              type="button"
              onClick={p.onReshuffle}
              aria-label={t("nax.reshuffle")}
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Dices className="h-3.5 w-3.5" />
            </button>
          </IconTooltip>
        )}
        <span className="text-[11px] tabular text-muted-foreground">{t("nax.count", { count: p.count })}</span>
      </div>
    </div>
  );
}
