#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RUST_SRC="$ROOT/src-tauri/src"
errors=0

echo "=== Layer Dependency Check ==="

check_violation() {
  local dir="$1"
  local pattern="$2"
  local label="$3"

  if [[ ! -d "$dir" ]]; then
    return
  fi

  while IFS= read -r line; do
    echo "VIOLATION ($label): $line"
    errors=$((errors + 1))
  done < <(grep -rn "$pattern" "$dir" 2>/dev/null || true)
}

# commands/ must NOT import repositories directly
check_violation "$RUST_SRC/commands" "use crate::repositories" \
  "commands -> repositories (must go through services)"

# services/ must NOT import commands
check_violation "$RUST_SRC/services" "use crate::commands" \
  "services -> commands"

# repositories/ must NOT import commands or services
check_violation "$RUST_SRC/repositories" "use crate::commands" \
  "repositories -> commands"
check_violation "$RUST_SRC/repositories" "use crate::services" \
  "repositories -> services"

# models/ must NOT import commands, services, or repositories
check_violation "$RUST_SRC/models" "use crate::commands" \
  "models -> commands"
check_violation "$RUST_SRC/models" "use crate::services" \
  "models -> services"
check_violation "$RUST_SRC/models" "use crate::repositories" \
  "models -> repositories"

if [[ $errors -gt 0 ]]; then
  echo "FAIL: $errors layer dependency violation(s)"
  exit 1
fi

echo "PASS: No layer dependency violations found."
