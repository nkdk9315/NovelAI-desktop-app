import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { Button } from "@/components/ui/button";
import IconTooltip from "@/components/shared/IconTooltip";
import { useNaxStore } from "@/stores/nax-store";
import { tabViewOf, useNaxViewStore } from "@/stores/nax-view-store";
import { useSidebarArtistTagsStore } from "@/stores/sidebar-artist-tags-store";
import { useGenerationParamsStore } from "@/stores/generation-params-store";
import { NAX_SITE_URL, NAX_VERSIONS, naxVersionForModel, pickGallery } from "@/lib/nax";
import NaxToolbar from "./NaxToolbar";
import NaxImageGrid, { type NaxSelection } from "./NaxImageGrid";
import NaxTagDetailDialog from "./NaxTagDetailDialog";
import type { NaxGridItem } from "./NaxImageCard";
import { useNaxItems } from "./use-nax-items";
import NaxCacheMenu from "./NaxCacheMenu";

interface Props {
  /** Left of the status row: the dialog's title and description. */
  heading: ReactNode;
  /** Pick mode: cards toggle a selection instead of editing the prompt. */
  selection?: NaxSelection;
}

/**
 * Body of the tag explorer: nax.moe galleries and favorites with sync status,
 * filters and the image grid. Shared by the explorer dialog and the tag
 * picker. What it shows is remembered in `useNaxViewStore`.
 */
export default function NaxBrowser({ heading, selection }: Props) {
  const { t, i18n } = useTranslation();
  const galleries = useNaxStore((s) => s.galleries);
  const status = useNaxStore((s) => s.status);
  const syncing = useNaxStore((s) => s.syncing);
  const syncError = useNaxStore((s) => s.syncError);
  const ensureSynced = useNaxStore((s) => s.ensureSynced);
  const loadFavoriteTags = useNaxStore((s) => s.loadFavoriteTags);
  const loadFavoriteArtists = useSidebarArtistTagsStore((s) => s.loadFavoriteArtists);
  const model = useGenerationParamsStore((s) => s.model);
  const modelVersion = naxVersionForModel(model);
  const view = useNaxViewStore();
  const [detail, setDetail] = useState<NaxGridItem | null>(null);

  // Mounted only while its dialog is open.
  useEffect(() => {
    ensureSynced();
    loadFavoriteTags();
    loadFavoriteArtists();
  }, [ensureSynced, loadFavoriteTags, loadFavoriteArtists]);

  // Galleries follow the generation model unless the user picked a version
  // for this same model; switching the model drops that pick.
  const syncModelVersion = view.syncModelVersion;
  useEffect(() => { syncModelVersion(modelVersion); }, [modelVersion, syncModelVersion]);
  const { tab, favCategory, favVersion } = view;
  const { pickedSlug, search, sort, seed, version: pickedVersion } = tabViewOf(view, tab);
  const version = pickedVersion ?? modelVersion;
  const favorites = tab === "favorites";
  const category = favorites ? null : tab;
  const gallery = useMemo(() => {
    if (!category) return null;
    const picked = galleries.find((g) => g.slug === pickedSlug && g.category === category);
    return picked ?? pickGallery(galleries, category, version);
  }, [galleries, category, pickedSlug, version]);

  const versions = useMemo(
    () => (category
      ? NAX_VERSIONS.filter((v) => galleries.some((g) => g.category === category && g.modelVersion === v))
      : ["all", ...NAX_VERSIONS]),
    [galleries, category],
  );
  const variants = gallery ? galleries.filter((g) => g.category === category && g.modelVersion === gallery.modelVersion) : [];

  const { items, loading, error, favoriteCount, favoriteCounts } = useNaxItems({
    gallery, favorites, preferredVersion: version, favCategory, favVersion, search, sort, seed,
  });

  const changeVersion = (v: string) => {
    if (favorites) view.setFavVersion(v);
    else view.pickVersion(v, modelVersion);
  };
  // Search is left out: typing should not create a remembered position per keystroke.
  const viewKey = favorites
    ? `favorites|${favCategory}|${favVersion}|${sort}|${seed}`
    : `${gallery?.slug}|${sort}|${seed}`;
  const hasCatalog = (status?.imageCount ?? 0) > 0;
  const syncedLabel = status?.syncedAt ? new Date(status.syncedAt).toLocaleString(i18n.language) : null;

  let body: React.ReactNode;
  if (!hasCatalog && syncing) {
    body = <Centered><Loader2 className="h-5 w-5 animate-spin" />{t("nax.firstSync")}</Centered>;
  } else if (!hasCatalog) {
    body = (
      <Centered>
        <AlertTriangle className="h-5 w-5" />
        {t("nax.offline")}
        <Button size="sm" variant="outline" onClick={() => ensureSynced(true)}>{t("nax.retry")}</Button>
      </Centered>
    );
  } else if (error) {
    body = <Centered>{t("nax.loadFailed")}</Centered>;
  } else if (!loading && items.length === 0) {
    const emptyFavorites = favorites && favoriteCount === 0;
    body = <Centered>{emptyFavorites ? t("nax.favoritesEmpty") : t("nax.noResults")}</Centered>;
  } else {
    body = (
      <NaxImageGrid
        items={items}
        ready={!loading}
        showVersion={favorites}
        showCategory={favorites && favCategory === "all"}
        onOpen={setDetail}
        selection={selection}
        viewKey={viewKey}
        searchKey={search}
        savedScroll={view.scroll[viewKey] ?? 0}
        onScrollSave={view.saveScroll}
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 pr-8">
        <div className="min-w-0 flex-1">{heading}</div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {syncError && hasCatalog && (
            <span className="flex items-center gap-1 text-amber-500" title={syncError}>
              <AlertTriangle className="h-3 w-3" />{t("nax.usingCache")}
            </span>
          )}
          {syncedLabel && <span className="tabular">{t("nax.syncedAt", { time: syncedLabel, count: status?.imageCount ?? 0 })}</span>}
          <NaxCacheMenu />
          <IconTooltip label={t("nax.refresh")}>
            {/* span: a disabled button fires no hover events, so the tooltip needs a wrapper */}
            <span className="inline-flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={syncing}
                onClick={() => ensureSynced(true)}
                aria-label={t("nax.refresh")}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            </span>
          </IconTooltip>
        </div>
      </div>

      <NaxToolbar
        tab={tab}
        onTabChange={view.setTab}
        favoriteCount={favoriteCount}
        favCategory={favCategory}
        onFavCategoryChange={view.setFavCategory}
        favoriteCounts={favoriteCounts}
        versions={versions}
        version={favorites ? favVersion : (gallery?.modelVersion ?? version)}
        modelVersion={modelVersion}
        onVersionChange={changeVersion}
        variants={variants}
        gallerySlug={gallery?.slug ?? null}
        onGalleryChange={view.setPickedSlug}
        search={search}
        onSearchChange={view.setSearch}
        sort={sort}
        onSortChange={view.setSort}
        onReshuffle={view.reshuffle}
        count={items.length}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {body}
        {loading && hasCatalog && (
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        {t("nax.attribution")}{" "}
        <button type="button" className="underline hover:text-foreground" onClick={() => { openExternal(NAX_SITE_URL).catch(() => {}); }}>
          nax.moe
        </button>
        {" · "}{t("nax.notAffiliated")}
      </p>

      {detail && (
        <NaxTagDetailDialog
          tag={detail.tag}
          category={detail.category}
          onOpenChange={(o) => { if (!o) setDetail(null); }}
        />
      )}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}
