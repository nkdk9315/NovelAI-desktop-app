import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useAutocomplete } from "@/hooks/use-autocomplete";
import { useTokenDrag } from "@/hooks/use-token-drag";
import { insertTagAt, tagQueryAt, type TagQuery } from "@/lib/tag-query";

function csvCategoryLabel(id: number): string {
  switch (id) {
    case 0:
      return "general";
    case 1:
      return "artist";
    case 3:
      return "works";
    case 4:
      return "character";
    case 5:
      return "meta";
    default:
      return "";
  }
}

interface PromptTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  highlightTokens?: string[];
  /** Grow the textarea while focused (to fit content, at least `expandedRows`). */
  expandOnFocus?: boolean;
  expandedRows?: number;
}

/** Upper bound for the focused height so the panel never becomes all textarea. */
const MAX_EXPANDED_VH = 0.6;
/**
 * Collapse is delayed on blur so a click on an element below the textarea
 * lands before the layout shifts upward.
 */
const COLLAPSE_DELAY_MS = 150;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlighted(value: string, tokens: string[]): React.ReactNode[] {
  if (tokens.length === 0) return [value];
  const re = new RegExp(tokens.map(escapeRegex).join("|"), "g");
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of value.matchAll(re)) {
    if (m.index == null) continue;
    if (m.index > last) nodes.push(value.slice(last, m.index));
    nodes.push(
      <span
        key={key++}
        className="rounded bg-primary/25 text-primary"
      >
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < value.length) nodes.push(value.slice(last));
  // Trailing space to preserve final line height when text ends with \n.
  if (value.endsWith("\n")) nodes.push(" ");
  return nodes;
}

export default function PromptTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  onKeyDown: onKeyDownProp,
  textareaRef: externalRef,
  highlightTokens,
  expandOnFocus = false,
  expandedRows,
}: PromptTextareaProps) {
  const tokens = highlightTokens ?? [];
  const hasHighlights = tokens.length > 0 && tokens.some((t) => t.length > 0);
  // Artists are managed in their own panel, so plain queries leave them out; `artist:` asks for them
  const tagSearch = useAutocomplete(300, undefined, [1]);
  const artistSearch = useAutocomplete(300, 1);
  const [query, setQuery] = useState<TagQuery | null>(null);
  const source = query?.artist ? artistSearch : tagSearch;
  // Only suggestions for what is typed now: stale ones would make Enter insert the wrong tag
  const current = query != null && source.resultsFor === query.query;
  const results = !current ? [] : query.artist
    ? source.results.filter((t) => t.csvCategory === 1).slice(0, 20)
    : source.results;
  const search = (q: TagQuery | null) => {
    setQuery(q);
    tagSearch.search(q && !q.artist ? q.query : "");
    artistSearch.search(q?.artist ? q.query : "");
  };
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const activeTokens = hasHighlights ? tokens.filter((t) => t.length > 0) : [];
  const tokenDrag = useTokenDrag({ textareaRef, overlayRef, value, tokens: activeTokens, onChange });
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExpanded = expandOnFocus && expanded;

  useEffect(() => () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }, []);

  // While expanded, grow to fit the content (bounded by MAX_EXPANDED_VH).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el || !expandOnFocus) return;
    el.style.height = "";
    if (!isExpanded) return;
    const border = el.offsetHeight - el.clientHeight;
    const target = Math.min(el.scrollHeight + border, window.innerHeight * MAX_EXPANDED_VH);
    if (target > el.offsetHeight) el.style.height = `${target}px`;
  }, [isExpanded, value, expandOnFocus, textareaRef]);

  // Put the caret right after an inserted tag in the same commit as the new text
  const pendingCursor = useRef<number | null>(null);
  useLayoutEffect(() => {
    const pos = pendingCursor.current;
    if (pos == null) return;
    pendingCursor.current = null;
    textareaRef.current?.setSelectionRange(pos, pos);
  }, [value, textareaRef]);

  const handleFocus = () => {
    if (!expandOnFocus) return;
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    setExpanded(true);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
    if (!expandOnFocus) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY_MS);
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    // Defer token extraction to after state update
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const q = tagQueryAt(newValue, textarea.selectionStart);
      search(q);
      setShowDropdown(q != null);
      setSelectedIndex(0);
    }, 0);
  };

  const insertTag = (tagName: string) => {
    const textarea = textareaRef.current;
    // Re-read at the cursor: the text may have changed since the query was taken
    const q = tagQueryAt(value, textarea?.selectionStart ?? value.length) ?? query;
    setShowDropdown(false);
    search(null);
    if (!q) return;
    const next = insertTagAt(value, q, tagName);
    pendingCursor.current = next.cursor;
    onChange(next.text);
    textarea?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || results.length === 0) {
      onKeyDownProp?.(e);
      return;
    }

    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = Math.min(prev + 1, results.length - 1);
        suggestionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        suggestionRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertTag(results[selectedIndex].name);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className={`relative ${hasHighlights ? "rounded-md bg-background" : ""}`}>
      {hasHighlights && (
        <div
          ref={overlayRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent px-3 py-2 text-sm text-transparent"
        >
          {renderHighlighted(value, tokens.filter((t) => t.length > 0))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className={`relative w-full resize-none rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
          hasHighlights ? "bg-transparent" : "bg-background"
        } ${tokenDrag.dragging ? "cursor-grabbing" : ""}`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onScroll={(e) => {
          if (overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        onPointerDown={tokenDrag.onPointerDown}
        onPointerMove={tokenDrag.onPointerMove}
        onPointerUp={tokenDrag.onPointerUp}
        onPointerCancel={tokenDrag.onPointerCancel}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={isExpanded ? Math.max(expandedRows ?? rows * 2, rows) : rows}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.map((tag, i) => (
            <button
              key={tag.name}
              ref={(el) => { suggestionRefs.current[i] = el; }}
              type="button"
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-accent ${
                i === selectedIndex ? "bg-accent" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertTag(tag.name);
              }}
            >
              <span className="font-medium">{tag.name}</span>
              {tag.csvCategory != null && (
                <span className="text-muted-foreground">
                  {csvCategoryLabel(tag.csvCategory)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
