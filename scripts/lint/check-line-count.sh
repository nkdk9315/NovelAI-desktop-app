#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MAX_LINES=300
errors=0

echo "=== Line Count Check (max $MAX_LINES) ==="

is_excluded() {
  local file="$1"
  case "$file" in
    */migrations/*.sql) return 0 ;;
    */src/types/index.ts) return 0 ;;
    */src-tauri/src/models/dto.rs) return 0 ;;
  esac
  return 1
}

while IFS= read -r file; do
  if is_excluded "$file"; then
    continue
  fi

  count=$(wc -l < "$file")
  if [[ $count -gt $MAX_LINES ]]; then
    rel="${file#"$ROOT/"}"
    echo "OVER LIMIT: $rel ($count lines)"
    errors=$((errors + 1))
  fi
done < <(find "$ROOT/src-tauri/src" "$ROOT/src" -type f \( -name '*.rs' -o -name '*.ts' -o -name '*.tsx' \) 2>/dev/null || true)

if [[ $errors -gt 0 ]]; then
  echo "FAIL: $errors file(s) exceed $MAX_LINES lines"
  exit 1
fi

echo "PASS: All files within $MAX_LINES line limit."
