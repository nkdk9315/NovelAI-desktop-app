#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

errors=0

echo "=== Naming Convention Check ==="

# Check Rust files: must match ^[a-z][a-z0-9_]*\.rs$
# Exclude: mod.rs, lib.rs, main.rs
if [[ -d "$ROOT/src-tauri/src" ]]; then
  while IFS= read -r file; do
    basename=$(basename "$file")
    case "$basename" in
      mod.rs|lib.rs|main.rs) continue ;;
    esac
    if [[ ! "$basename" =~ ^[a-z][a-z0-9_]*\.rs$ ]]; then
      rel="${file#"$ROOT/"}"
      echo "NAMING (Rust): $rel — expected snake_case"
      errors=$((errors + 1))
    fi
  done < <(find "$ROOT/src-tauri/src" -type f -name '*.rs' 2>/dev/null || true)
fi

# Check TS files (non-tsx): must match ^[a-z][a-z0-9-]*\.ts$
# Exclude: index.ts, index.css, vite-env.d.ts
if [[ -d "$ROOT/src" ]]; then
  while IFS= read -r file; do
    basename=$(basename "$file")
    case "$basename" in
      index.ts|index.css|vite-env.d.ts) continue ;;
    esac
    if [[ ! "$basename" =~ ^[a-z][a-z0-9-]*(\.(test|spec))?\.ts$ ]]; then
      rel="${file#"$ROOT/"}"
      echo "NAMING (TS): $rel — expected kebab-case"
      errors=$((errors + 1))
    fi
  done < <(find "$ROOT/src" -type f -name '*.ts' 2>/dev/null || true)
fi

# Check TSX files: must match ^[A-Z][A-Za-z0-9]*\.tsx$
# Exclude: main.tsx
if [[ -d "$ROOT/src" ]]; then
  while IFS= read -r file; do
    basename=$(basename "$file")
    case "$basename" in
      main.tsx) continue ;;
    esac
    if [[ ! "$basename" =~ ^[A-Z][A-Za-z0-9]*\.tsx$ ]]; then
      rel="${file#"$ROOT/"}"
      echo "NAMING (TSX): $rel — expected PascalCase"
      errors=$((errors + 1))
    fi
  done < <(find "$ROOT/src" -type f -name '*.tsx' -not -path '*/components/ui/*' 2>/dev/null || true)
fi

if [[ $errors -gt 0 ]]; then
  echo "FAIL: $errors naming convention violation(s)"
  exit 1
fi

echo "PASS: All file names follow conventions."
