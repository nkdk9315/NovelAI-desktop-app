import { useRef, useState } from "react";
import { useAutocomplete } from "@/hooks/use-autocomplete";

/**
 * Shared autocomplete input logic for artist tag inputs.
 * Used by SidebarArtistTagInput and PresetTweakPanel.
 *
 * @param onAdd Called with a trimmed, non-empty tag name when the user confirms a tag.
 *              Business-logic checks (dedup, store update) live in the caller's callback.
 */
export function useArtistTagInput(onAdd: (name: string) => void) {
  const [tagInput, setTagInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { results: suggestions, search } = useAutocomplete(300, 1);
  const filteredSuggestions = suggestions.filter((s) => s.csvCategory === 1).slice(0, 8);

  const handleInputChange = (value: string) => {
    setTagInput(value);
    search(value);
    setShowSuggestions(value.trim().length > 0);
    setHighlightIndex(-1);
  };

  const handleAdd = (name: string) => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    setTagInput("");
    search("");
    setShowSuggestions(false);
    setHighlightIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey && showSuggestions && filteredSuggestions.length > 0)) {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev < filteredSuggestions.length - 1 ? prev + 1 : 0;
        suggestionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey && showSuggestions && filteredSuggestions.length > 0)) {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredSuggestions.length - 1;
        suggestionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
        handleAdd(filteredSuggestions[highlightIndex].name);
      } else {
        handleAdd(tagInput);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  };

  const onBlur = () => setTimeout(() => { setShowSuggestions(false); setHighlightIndex(-1); }, 150);

  return { tagInput, showSuggestions, highlightIndex, suggestionRefs, filteredSuggestions,
           handleInputChange, handleAdd, onKeyDown, onBlur };
}
