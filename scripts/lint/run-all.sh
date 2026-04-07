#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

linters=(
  check-structure.sh
  check-layer-deps.sh
  check-line-count.sh
  check-naming.sh
  check-security.sh
  check-design-tokens.sh
)

passed=0
failed=0
failed_names=()

echo "==============================="
echo "  Running all custom linters"
echo "==============================="
echo ""

for linter in "${linters[@]}"; do
  if bash "$SCRIPT_DIR/$linter"; then
    passed=$((passed + 1))
  else
    failed=$((failed + 1))
    failed_names+=("$linter")
  fi
  echo ""
done

echo "==============================="
echo "  Summary: $passed passed, $failed failed"
echo "==============================="

if [[ $failed -gt 0 ]]; then
  echo "Failed linters:"
  for name in "${failed_names[@]}"; do
    echo "  - $name"
  done
  exit 1
fi

echo "All linters passed."
