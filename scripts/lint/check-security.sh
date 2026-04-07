#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

errors=0

echo "=== Security Check ==="

# Check for SQL injection risk: format! near SQL keywords in Rust code
if [[ -d "$ROOT/src-tauri/src" ]]; then
  while IFS= read -r line; do
    echo "SQL INJECTION RISK: $line"
    errors=$((errors + 1))
  done < <(grep -rn 'format!' "$ROOT/src-tauri/src" 2>/dev/null \
    | grep -iE '(SELECT|INSERT|UPDATE|DELETE|WHERE)' || true)
fi

# Check for unsafe HTML injection patterns in frontend code
UNSAFE_HTML_PATTERN='innerHTML|dangerouslySetInner''HTML'
if [[ -d "$ROOT/src" ]]; then
  while IFS= read -r line; do
    echo "XSS RISK: $line"
    errors=$((errors + 1))
  done < <(grep -rn -E "$UNSAFE_HTML_PATTERN" "$ROOT/src" 2>/dev/null || true)
fi

if [[ $errors -gt 0 ]]; then
  echo "FAIL: $errors security issue(s) found"
  exit 1
fi

echo "PASS: No security issues detected."
