import { useState, useEffect } from "react";
import type { TagDto } from "@/types";
import { useDebounce } from "./use-debounce";
import * as ipc from "@/lib/ipc";

/**
 * Free-text tag autocomplete.
 *
 * - Without `category`: queries the unified tag database (migration 013) via
 *   FTS5, returning matches across all categories and the scraped tag groups.
 * - With `category`: falls back to the legacy `search_system_prompts` command,
 *   which still supports csv_category filtering. Results are mapped into
 *   `TagDto` shape for a consistent consumer API.
 */
export function useAutocomplete(delay = 300, category?: number) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TagDto[]>([]);
  const debouncedQuery = useDebounce(query, delay);

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
      ipc.searchTags(q).then(setResults);
    }
  }, [debouncedQuery, category]);

  return { results, search: setQuery };
}
