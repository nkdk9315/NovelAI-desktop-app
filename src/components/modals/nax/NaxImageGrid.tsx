import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNaxFavorites } from "@/hooks/use-nax-favorites";
import { useNaxPromptActions } from "@/hooks/use-nax-prompt-actions";
import NaxImageCard, { type NaxGridItem } from "./NaxImageCard";

const MIN_CARD_WIDTH = 150;
const GAP = 8;
/** nax.moe renders every image at 832×1216. */
const IMAGE_RATIO = 1216 / 832;
const SCROLL_SAVE_DELAY_MS = 200;

/** Pick mode: cards toggle membership in a selection instead of the prompt. */
export interface NaxSelection {
  isSelected: (item: NaxGridItem) => boolean;
  toggle: (item: NaxGridItem) => void;
}

interface Props {
  items: NaxGridItem[];
  /** False while `items` may still be the previous view's list. */
  ready: boolean;
  showVersion?: boolean;
  showCategory?: boolean;
  onOpen: (item: NaxGridItem) => void;
  selection?: NaxSelection;
  /** Identifies what is listed; the scroll position is remembered per key. */
  viewKey: string;
  /** Changing the search filter scrolls back to the top. */
  searchKey: string;
  savedScroll: number;
  onScrollSave: (viewKey: string, top: number) => void;
}

/** Row-virtualized card grid; galleries hold up to ~16k images. */
export default function NaxImageGrid({
  items, ready, showVersion, showCategory, onOpen, selection, viewKey, searchKey, savedScroll, onScrollSave,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const { isFavorite, toggleFavorite } = useNaxFavorites();
  const { isAdded, toggle } = useNaxPromptActions();

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = Math.max(2, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP)));
  const cardWidth = width > 0 ? (width - GAP * (columns - 1)) / columns : MIN_CARD_WIDTH;
  const rowHeight = Math.round(cardWidth * IMAGE_RATIO) + GAP;
  const rowCount = Math.ceil(items.length / columns);

  const virt = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  });

  useEffect(() => { virt.measure(); }, [rowHeight, virt]);

  // Restore the remembered position once this view's items are laid out.
  // Until then, scroll events belong to the previous view and are not saved.
  const restoredKey = useRef<string | null>(null);
  const savedScrollRef = useRef(savedScroll);
  savedScrollRef.current = savedScroll;
  useEffect(() => {
    if (restoredKey.current === viewKey || !ready || items.length === 0 || width === 0) return;
    scrollRef.current?.scrollTo({ top: savedScrollRef.current });
    restoredKey.current = viewKey;
  }, [viewKey, ready, items.length, width]);

  // Typing a filter starts from the top. A different view (another tab has its
  // own search) is not a search change: it restores its own position above.
  const lastSearch = useRef({ viewKey, searchKey });
  useEffect(() => {
    const prev = lastSearch.current;
    lastSearch.current = { viewKey, searchKey };
    if (prev.viewKey === viewKey && prev.searchKey !== searchKey) scrollRef.current?.scrollTo({ top: 0 });
  }, [viewKey, searchKey]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const handleScroll = () => {
    const key = restoredKey.current;
    if (key !== viewKey) return;
    const top = scrollRef.current?.scrollTop ?? 0;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onScrollSave(key, top), SCROLL_SAVE_DELAY_MS);
  };

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div style={{ height: `${virt.getTotalSize()}px`, position: "relative", width: "100%" }}>
        {virt.getVirtualItems().map((row) => (
          <div
            key={row.key}
            className="absolute left-0 grid w-full"
            style={{
              top: row.start,
              height: rowHeight - GAP,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              columnGap: GAP,
            }}
          >
            {items.slice(row.index * columns, row.index * columns + columns).map((item) => (
              <NaxImageCard
                key={`${item.category}:${item.image?.gallerySlug ?? ""}:${item.tag}`}
                item={item}
                showVersion={showVersion}
                showCategory={showCategory}
                isFavorite={isFavorite(item.tag, item.category)}
                selectMode={selection != null}
                isAdded={selection ? selection.isSelected(item) : isAdded(item.tag, item.category)}
                onToggleFavorite={() => { toggleFavorite(item.tag, item.category).catch(() => {}); }}
                onToggleAdd={() => (selection ? selection.toggle(item) : toggle(item.tag, item.category))}
                onOpen={() => (selection ? selection.toggle(item) : onOpen(item))}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
