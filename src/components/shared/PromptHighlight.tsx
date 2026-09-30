import { emphasisOf, highlightPrompt, type EmphasisDirection, type SyntaxKind, type SyntaxSpan } from "@/lib/prompt-syntax";

/** Text color per kind; brackets and weights take their emphasis color instead. */
const KIND_CLASS: Record<SyntaxKind, string> = {
  plain: "text-foreground",
  separator: "text-muted-foreground",
  bracket: "",
  weight: "",
  artistPrefix: "text-syntax-artist/60",
  artist: "text-syntax-artist",
  prefix: "text-muted-foreground",
  textPrefix: "text-syntax-text/70",
  text: "text-syntax-text",
  quote: "text-syntax-text",
  error: "text-destructive underline decoration-wavy",
};

/** Tint behind emphasized text, by level (1–3). */
const EMPHASIS_BG: Record<EmphasisDirection, string[]> = {
  up: ["", "bg-syntax-up/15", "bg-syntax-up/25", "bg-syntax-up/40"],
  down: ["", "bg-syntax-down/15", "bg-syntax-down/25", "bg-syntax-down/40"],
  negative: ["", "bg-syntax-negative/25", "bg-syntax-negative/25", "bg-syntax-negative/25"],
};

const MARK_TEXT: Record<EmphasisDirection, string> = {
  up: "text-syntax-up",
  down: "text-syntax-down",
  negative: "text-syntax-negative",
};

/** Wildcard tokens (random prompt groups) keep their own chip look. */
const TOKEN_CLASS = "rounded bg-primary/25 text-primary";

function spanClass(span: SyntaxSpan): string {
  const emphasis = emphasisOf(span.weight);
  const isMark = span.kind === "bracket" || span.kind === "weight";
  const color = isMark ? (emphasis ? MARK_TEXT[emphasis.direction] : "text-muted-foreground") : KIND_CLASS[span.kind];
  return emphasis ? `${color} ${EMPHASIS_BG[emphasis.direction][emphasis.level]}` : color;
}

function tokenRanges(value: string, tokens: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (const token of tokens) {
    for (let i = value.indexOf(token); i !== -1; i = value.indexOf(token, i + token.length)) out.push([i, i + token.length]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

interface Props {
  value: string;
  /** Wildcard tokens to mark wherever they appear */
  tokens: string[];
  /** false: plain text, only the tokens marked */
  syntax: boolean;
}

/**
 * The prompt's text, colored by syntax (see `prompt-syntax.ts`), for the
 * overlay under a transparent textarea. Changes only colors, never glyph
 * widths, so it stays aligned with the textarea's own layout.
 */
export default function PromptHighlight({ value, tokens, syntax }: Props) {
  const ranges = tokenRanges(value, tokens);
  const spans: SyntaxSpan[] = syntax ? highlightPrompt(value) : [{ text: value, kind: "plain", weight: 1 }];
  const nodes: React.ReactNode[] = [];
  let offset = 0;
  for (const span of spans) {
    const end = offset + span.text.length;
    const cls = syntax ? spanClass(span) : "";
    // Split the span where wildcard tokens start or end
    let at = offset;
    for (const [s, e] of ranges) {
      if (e <= at || s >= end) continue;
      if (s > at) nodes.push(<span key={nodes.length} className={cls}>{value.slice(at, s)}</span>);
      const stop = Math.min(e, end);
      nodes.push(<span key={nodes.length} className={TOKEN_CLASS}>{value.slice(Math.max(s, at), stop)}</span>);
      at = stop;
    }
    if (at < end) nodes.push(<span key={nodes.length} className={cls}>{value.slice(at, end)}</span>);
    offset = end;
  }
  // A trailing newline needs a character after it to keep its line height
  if (value.endsWith("\n")) nodes.push(" ");
  return <>{nodes}</>;
}
