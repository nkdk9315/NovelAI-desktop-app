import { useState, useEffect } from "react";
import type { SystemTagDto } from "@/types";
import { useDebounce } from "./use-debounce";
import * as ipc from "@/lib/ipc";

export function useAutocomplete(delay = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SystemTagDto[]>([]);
  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    ipc.searchSystemPrompts(debouncedQuery).then(setResults);
  }, [debouncedQuery]);

  return { results, search: setQuery };
}
