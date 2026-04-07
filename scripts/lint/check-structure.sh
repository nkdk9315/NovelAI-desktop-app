#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

errors=0

required_dirs=(
  src-tauri/src/commands
  src-tauri/src/services
  src-tauri/src/repositories
  src-tauri/src/models
  src-tauri/migrations
  src-tauri/resources
  src/lib
  src/types
  src/stores
  src/hooks
  src/components
  src/pages
  src/components/ui
  src/components/header
  src/components/left-panel
  src/components/center-panel
  src/components/right-panel
  src/components/modals
)

required_files=(
  src-tauri/Cargo.toml
  src-tauri/tauri.conf.json
  src-tauri/build.rs
  src-tauri/migrations/001_init.sql
  src-tauri/src/main.rs
  src-tauri/src/lib.rs
  src-tauri/src/state.rs
  src-tauri/src/error.rs
  src-tauri/src/db.rs
  src-tauri/src/commands/mod.rs
  src-tauri/src/services/mod.rs
  src-tauri/src/repositories/mod.rs
  src-tauri/src/models/mod.rs
  src/main.tsx
  src/App.tsx
  src/index.css
  src/types/index.ts
  src/lib/ipc.ts
)

echo "=== Structure Check ==="

for dir in "${required_dirs[@]}"; do
  if [[ ! -d "$ROOT/$dir" ]]; then
    echo "MISSING DIR:  $dir"
    errors=$((errors + 1))
  fi
done

for file in "${required_files[@]}"; do
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "MISSING FILE: $file"
    errors=$((errors + 1))
  fi
done

if [[ $errors -gt 0 ]]; then
  echo "FAIL: $errors missing item(s)"
  exit 1
fi

echo "PASS: All required directories and files exist."
