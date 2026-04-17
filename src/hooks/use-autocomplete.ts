import { useState, useEffect } from "react";
import type { TagDto } from "@/types";
import { useDebounce } from "./use-debounce";
import * as ipc from "@/lib/ipc";
import * as tagIpc from "@/lib/ipc-tags";

/**
 * Free-text tag autocomplete.
 *
 * - Without `category`: queries the unified tag database (migration 013) via
 *   FTS5, returning matches across all categories and the scraped tag groups.
 * - With `category`: falls back to the legacy `search_system_prompts` command,
 *   which still supports csv_category filtering. Results are mapped into
 *   `TagDto` shape for a consistent consumer API.
 */
export function useAutocomplete(delay = 300, category?: number, excludeCategories?: number[]) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TagDto[]>([]);
  const debouncedQuery = useDebounce(query, delay);

  const excludeKey = excludeCategories?.join(",") ?? "";
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      return;
    }
    if (category !== undefined) {
      ipc.searchSystemPrompts(q, category).then((tags) =>
        setResults(
          tags.map((t) => ({
            id: 0,
            name: t.name,
            csvCategory: t.category,
          })),
        ),
      );
    } else {
      const excluded = excludeKey ? excludeKey.split(",").map(Number) : [];
      tagIpc.searchTags(q).then((tags) => {
        const filtered = excluded.length
          ? tags.filter((t) => t.csvCategory == null || !excluded.includes(t.csvCategory))
          : tags;
        setResults(filtered);
      });
    }
  }, [debouncedQuery, category, excludeKey]);

  return { results, search: setQuery };
}
