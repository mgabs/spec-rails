#!/usr/bin/env sh
# check_hygiene.sh [root]: fails on broken relative doc links, manual template copies,
# legacy specs/ paths, per-gate commit instructions (REQ-OSA-40), and shell functions that are defined but never used (REQ-OSA-23, REQ-OSA-24, REQ-OSA-30).
set -eu

ROOT="${1:-$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)}"
cd "$ROOT"
FAILED=0

while IFS= read -r doc; do
  [ -n "$doc" ] && [ -f "$doc" ] || continue
  if grep -qE 'cp openspec/schemas/spec-rails/templates|Copy \[schemas/spec-rails/templates' "$doc"; then
    echo "FAIL: $doc instructs manual template copy"
    FAILED=1
  fi
  dir="$(dirname "$doc")"
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    if [ ! -e "$dir/$link" ]; then
      echo "FAIL: $doc -> $link (missing)"
      FAILED=1
    fi
  done <<EOF_LINKS
$(grep -oE '\]\([^)#[:space:]]+' "$doc" | sed 's/^](//' | grep -v '^[a-z]*:' || true)
EOF_LINKS
done <<EOF_DOCS
README.md
$(find docs skills -name '*.md' 2>/dev/null || true)
EOF_DOCS

while IFS= read -r item; do
  [ -n "$item" ] && [ -f "$item" ] || continue
  if grep -qE 'specs/(ROADMAP|WORKFLOW|bug-reports)' "$item"; then
    echo "FAIL: $item references a legacy specs/ path (REQ-OSA-30)"
    FAILED=1
  fi
done <<EOF_LEGACY
README.md
$(find docs skills rules templates -type f 2>/dev/null || true)
EOF_LEGACY

while IFS= read -r item; do
  [ -n "$item" ] && [ -f "$item" ] || continue
  if grep -qiE 'tick[a-z]* [^.]*and (commits? (it|before)|committed)' "$item"; then
    echo "FAIL: $item tells the reader to commit a gate tick (REQ-OSA-40)"
    FAILED=1
  fi
done <<EOF_CADENCE
README.md
$(find docs skills rules templates schemas -type f 2>/dev/null || true)
EOF_CADENCE

while IFS= read -r script; do
  [ -n "$script" ] && [ -f "$script" ] || continue
  stripped="$(sed 's/#.*//' "$script")"
  while IFS= read -r fn; do
    [ -n "$fn" ] || continue
    count="$(printf '%s\n' "$stripped" | grep -cE "(^|[^A-Za-z0-9_])${fn}([^A-Za-z0-9_]|$)")"
    if [ "$count" -lt 2 ]; then
      echo "FAIL: $script defines unused function $fn"
      FAILED=1
    fi
  done <<EOF_FNS
$(printf '%s\n' "$stripped" | grep -oE '^[A-Za-z_][A-Za-z0-9_]*\(\)' | tr -d '()' || true)
EOF_FNS
done <<EOF_SCRIPTS
$(find bin tests -type f \( -name '*.sh' -o -path 'bin/*' \) 2>/dev/null || true)
EOF_SCRIPTS

exit "$FAILED"
