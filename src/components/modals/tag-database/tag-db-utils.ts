import type { TagGroupDto } from "@/types";

// Children lists larger than this get bucketed alphabetically so the flat
// row array the virtualizer walks never grows into the thousands per scroll.
// Work categories like "Characters" hold 8000+ entries; virtualization alone
// is not enough if we'd still have to keep 8000 row descriptors in memory.
export const LETTER_PARTITION_THRESHOLD = 100;

// ---- Synthetic "Unclassified" subtree ----
//
// Tags that have no `tag_group_members` row at all are reached through a
// purely client-side tree: Unclassified -> <csv_category branches> ->
// <letter leaves>. Selecting a letter leaf fetches only that letter's
// slice from the backend, so csv_category switching is instant (no IPC)
// and individual letter fetches stay bounded.
//
// Each node has a negative id so it cannot collide with real tag_groups
// rows. The slug stores the payload we need to route clicks on select:
//   "virt:unclassified"                 -> root
//   "virt:cat{csv}"                     -> category branch (no tag fetch)
//   "virt:orphan:{csv}:{letterBucket}"  -> letter leaf (fetches orphans)

export const VIRT_UNCLASSIFIED_ROOT: TagGroupDto = {
  id: -1,
  slug: "virt:unclassified",
  title: "Unclassified",
  parentId: null,
  kind: "virtual",
  source: "seed",
  sortKey: 9999,
  childCount: 5,
  isFavorite: false,
};

// (csv_category, title) pairs for the 5 branches shown under Unclassified.
const VIRT_CATEGORY_META: Array<{ csvCat: number; title: string }> = [
  { csvCat: 0, title: "General" },
  { csvCat: 1, title: "Artists" },
  { csvCat: 3, title: "Copyrights" },
  { csvCat: 4, title: "Characters" },
  { csvCat: 5, title: "Meta" },
];

// Letter buckets in display order. Must match the bucket keys the backend
// understands (see `list_orphan_tags_by_category`).
export const ORPHAN_LETTERS: string[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0-9", "#",
];

const LETTER_ID_BASE = -10000; // unique space below the category branches

export function virtCategoryId(csvCat: number): number {
  // -10..-15 range; matches old scheme so favorites/expand state survive
  return -(10 + csvCat);
}

export function virtLetterId(csvCat: number, letterIdx: number): number {
  // 28 letters per csv_category; 5 categories -> plenty of room in
  // [LETTER_ID_BASE - 1000, LETTER_ID_BASE).
  return LETTER_ID_BASE - (csvCat * 100 + letterIdx);
}

export const VIRT_UNCLASSIFIED_CHILDREN: TagGroupDto[] = VIRT_CATEGORY_META.map(
  ({ csvCat, title }, idx) => ({
    id: virtCategoryId(csvCat),
    slug: `virt:cat${csvCat}`,
    title,
    parentId: VIRT_UNCLASSIFIED_ROOT.id,
    kind: "virtual",
    source: "seed",
    sortKey: idx,
    childCount: ORPHAN_LETTERS.length,
    isFavorite: false,
  }),
);

export function buildLetterChildrenForCategory(csvCat: number): TagGroupDto[] {
  return ORPHAN_LETTERS.map((L, i) => ({
    id: virtLetterId(csvCat, i),
    slug: `virt:orphan:${csvCat}:${L}`,
    title: L,
    parentId: virtCategoryId(csvCat),
    kind: "virtual",
    source: "seed",
    sortKey: i,
    childCount: 0,
    isFavorite: false,
  }));
}

/** Parse a `virt:orphan:{csv}:{bucket}` slug. Returns null on mismatch. */
export function parseOrphanLetterSlug(slug: string): { csvCategory: number; letterBucket: string } | null {
  if (!slug.startsWith("virt:orphan:")) return null;
  const rest = slug.slice("virt:orphan:".length);
  const firstColon = rest.indexOf(":");
  if (firstColon < 0) return null;
  const csvCategory = Number(rest.slice(0, firstColon));
  const letterBucket = rest.slice(firstColon + 1);
  if (Number.isNaN(csvCategory) || letterBucket.length === 0) return null;
  return { csvCategory, letterBucket };
}

export function bucketKey(title: string): string {
  const c = title.charAt(0).toUpperCase();
  if (c >= "A" && c <= "Z") return c;
  if (c >= "0" && c <= "9") return "0-9";
  return "#";
}

// ---- Flat row types for the virtualized tree ----

export type FlatRow =
  | {
      key: string;
      kind: "branch";
      depth: number;
      group: TagGroupDto;
      isOpen: boolean;
      hasChildren: boolean;
    }
  | {
      key: string;
      kind: "letter";
      depth: number;
      letterKey: string;
      letter: string;
      count: number;
      isOpen: boolean;
    };

/** Build the flattened row array used by the virtualizer. */
export function buildFlatRows(
  roots: TagGroupDto[],
  expanded: Set<number>,
  childrenCache: Record<number, TagGroupDto[]>,
  openLetters: Set<string>,
): FlatRow[] {
  const out: FlatRow[] = [];

  const pushNodes = (nodes: TagGroupDto[], depth: number): void => {
    for (const g of nodes) {
      const isOpen = expanded.has(g.id);
      const hasChildren = g.childCount > 0;
      out.push({ key: `g-${g.id}`, kind: "branch", depth, group: g, isOpen, hasChildren });
      if (isOpen && hasChildren) {
        const kids = childrenCache[g.id];
        if (kids) walk(kids, depth + 1);
      }
    }
  };

  const walk = (nodes: TagGroupDto[], depth: number): void => {
    if (nodes.length <= LETTER_PARTITION_THRESHOLD) {
      pushNodes(nodes, depth);
      return;
    }
    const buckets = new Map<string, TagGroupDto[]>();
    for (const n of nodes) {
      const k = bucketKey(n.title);
      let arr = buckets.get(k);
      if (!arr) { arr = []; buckets.set(k, arr); }
      arr.push(n);
    }
    const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
    const parentKey = nodes[0]?.parentId ?? "root";
    for (const [letter, bucketKids] of sorted) {
      const letterKey = `${parentKey}:${letter}`;
      const isOpen = openLetters.has(letterKey);
      out.push({ key: `letter-${letterKey}`, kind: "letter", depth, letterKey, letter, count: bucketKids.length, isOpen });
      if (isOpen) pushNodes(bucketKids, depth + 1);
    }
  };

  walk(roots, 0);
  return out;
}
