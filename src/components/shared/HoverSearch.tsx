import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Compact inline search that shows only a magnifying glass by default and
 * expands into a text input on hover, focus, or when it holds a value.
 * Used in contexts where we want per-group filtering without wasting a
 * full row on a search bar.
 *
 * The expanded width is hardcoded to `w-24` because Tailwind JIT cannot
 * see class names assembled from template literals.
 */
export default function HoverSearch({
  value,
  onChange,
  placeholder,
  className = "",
}: Props) {
  const hasValue = value.length > 0;
  return (
    <div
      role="presentation"
      className={`group inline-flex items-center rounded ${
        hasValue ? "bg-accent/40" : "hover:bg-accent/40"
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Search className="h-3 w-3 text-muted-foreground shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={`bg-transparent outline-none text-[10px] transition-all duration-150 min-w-0 ${
          hasValue
            ? "w-24 ml-1 opacity-100 px-0.5"
            : "w-0 opacity-0 group-hover:w-24 group-hover:ml-1 group-hover:opacity-100 group-hover:px-0.5 focus:w-24 focus:ml-1 focus:opacity-100 focus:px-0.5"
        }`}
      />
    </div>
  );
}
