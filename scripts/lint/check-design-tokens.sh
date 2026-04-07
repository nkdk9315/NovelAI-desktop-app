#!/usr/bin/env bash
# check-design-tokens.sh — TSX ファイル内のハードコードされた色値・ピクセル値を検出
# components/ui/ (shadcn 生成) と index.css は除外

set -euo pipefail

errors=0

# ハードコードされた色値を検出 (#hex, rgb(, rgba(, hsl(, oklch( in className or style)
while IFS= read -r file; do
  # className 内の直接的な色指定を検出（bg-[#...], text-[#...] など）
  if grep -nE '\[(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\()' "$file" | grep -v '// lint-ignore-token' > /dev/null 2>&1; then
    echo "ERROR: Hardcoded color value in $file:"
    grep -nE '\[(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|oklch\()' "$file" | grep -v '// lint-ignore-token'
    errors=$((errors + 1))
  fi
done < <(find src -name '*.tsx' -not -path 'src/components/ui/*' -not -name 'index.css')

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "Found $errors file(s) with hardcoded color values."
  echo "Use CSS variables via Tailwind classes (e.g., bg-background, text-primary) instead."
  exit 1
fi

echo "Design token check passed."
