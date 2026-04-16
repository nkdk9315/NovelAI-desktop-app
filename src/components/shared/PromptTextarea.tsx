import { useRef, useState, useCallback } from "react";
import { useAutocomplete } from "@/hooks/use-autocomplete";

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
}

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
}: PromptTextareaProps) {
  const tokens = highlightTokens ?? [];
  const hasHighlights = tokens.length > 0 && tokens.some((t) => t.length > 0);
  const { results, search } = useAutocomplete();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalRef ?? internalRef;
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const getCurrentToken = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { token: "", start: 0, end: 0 };
    const pos = textarea.selectionStart;
    const before = value.slice(0, pos);
    // Find the start of the current token (after last comma or start)
    const lastComma = before.lastIndexOf(",");
    const start = lastComma + 1;
    const token = before.slice(start).trim();
    return { token, start, end: pos };
  }, [value]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    // Defer token extraction to after state update
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const pos = textarea.selectionStart;
      const before = newValue.slice(0, pos);
      const lastComma = before.lastIndexOf(",");
      const token = before.slice(lastComma + 1).trim();
      if (token.length >= 2) {
        search(token);
        setShowDropdown(true);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
        search("");
      }
    }, 0);
  };

  const insertTag = (tagName: string) => {
    const { start } = getCurrentToken();
    const pos = textareaRef.current?.selectionStart ?? value.length;

    // Find the whitespace-trimmed boundaries
    const beforeToken = value.slice(0, start);
    const afterCursor = value.slice(pos);

    // Skip trailing whitespace and comma after cursor
    let afterStart = 0;
    while (afterStart < afterCursor.length && afterCursor[afterStart] === " ") afterStart++;
    if (afterStart < afterCursor.length && afterCursor[afterStart] === ",") afterStart++;

    const prefix = beforeToken.replace(/,?\s*$/, "");
    const suffix = afterCursor.slice(afterStart).replace(/^\s*/, "");

    const newValue = prefix
      ? suffix
        ? `${prefix}, ${tagName}, ${suffix}`
        : `${prefix}, ${tagName}`
      : suffix
        ? `${tagName}, ${suffix}`
        : tagName;

    onChange(newValue);
    setShowDropdown(false);
    search("");
    textareaRef.current?.focus();
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
        }`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
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
