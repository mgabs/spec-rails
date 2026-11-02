#!/usr/bin/env sh
# check_hygiene.sh [root]: fails on broken relative doc links, manual template copies
# and shell functions that are defined but never used (REQ-OSA-23, REQ-OSA-24).
set -eu

ROOT="${1:-$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)}"
cd "$ROOT"
FAILED=0

for doc in README.md $(find docs skills -name '*.md' 2>/dev/null); do
  [ -f "$doc" ] || continue
  if grep -qE 'cp openspec/schemas/spec-rails/templates|Copy \[schemas/spec-rails/templates' "$doc"; then
    echo "FAIL: $doc instructs manual template copy"
    FAILED=1
  fi
  dir="$(dirname "$doc")"
  if grep -qE 'specs/(ROADMAP|WORKFLOW|bug-reports)' "$doc"; then
    echo "FAIL: $doc references a legacy specs/ path (REQ-OSA-30)"
    FAILED=1
  fi
  for link in $(grep -oE '\]\([^)#[:space:]]+' "$doc" | sed 's/^](//' | grep -v '^[a-z]*:'); do
    if [ ! -e "$dir/$link" ]; then
      echo "FAIL: $doc -> $link (missing)"
      FAILED=1
    fi
  done
done

for script in $(find bin tests -type f \( -name '*.sh' -o -path 'bin/*' \)); do
  for fn in $(grep -oE '^[a-z_]+\(\)' "$script" | tr -d '()'); do
    if [ "$(grep -cw "$fn" "$script")" -lt 2 ]; then
      echo "FAIL: $script defines unused function $fn"
      FAILED=1
    fi
  done
done

exit "$FAILED"
