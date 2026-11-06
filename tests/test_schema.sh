#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
SCHEMA_DIR="${SPEC_RAILS_SCHEMA_DIR:-$REPO_ROOT/schemas/spec-rails}"
SCHEMA="$SCHEMA_DIR/schema.yaml"

FAILED=0
PASSED=0

assert_eq() {
  if [ "$1" != "$2" ]; then
    echo "FAIL: $3 (expected '$1', got '$2')"
    FAILED=$((FAILED + 1))
  else
    PASSED=$((PASSED + 1))
  fi
}

# Prints "id:dep,dep" per artifact, in declaration order.
artifact_deps() {
  awk '
    function flush() { if (id != "") print id ":" deps }
    /^  - id: / { flush(); id = $3; deps = ""; inreq = 0; next }
    /^    requires: \[\]/ { inreq = 0; next }
    /^    requires:/ { inreq = 1; next }
    inreq && /^      - / { deps = (deps == "" ? $2 : deps "," $2); next }
    /^[a-z]/ { inreq = 0 }
    END { flush() }
  ' "$SCHEMA"
}

# Prints the footer (from "## Review Gate" to EOF) of a template.
footer() {
  awk '/^## Review Gate$/ { on = 1 } on' "$1"
}

echo "=== Running spec-rails OpenSpec schema checks ==="

if [ ! -f "$SCHEMA" ]; then
  echo "FAIL: schema missing at $SCHEMA"
  exit 1
fi

assert_eq "spec-rails" "$(sed -n 's/^name: //p' "$SCHEMA")" "REQ-OSA-1 schema name"

assert_eq "research:
proposal:research
specs:proposal
design:specs
tasks:design" "$(artifact_deps)" "REQ-OSA-2/3 artifact DAG"

assert_eq "research.md proposal.md specs/**/*.md design.md tasks.md" \
  "$(sed -n 's/^    generates: //p' "$SCHEMA" | tr -d '"' | tr '\n' ' ' | sed 's/ $//')" \
  "artifact outputs"

assert_eq "  requires: [tasks]
  tracks: tasks.md" "$(awk '/^apply:/ { on = 1; next } on && /^  (requires|tracks):/' "$SCHEMA")" \
  "REQ-OSA-6 apply requires/tracks"

apply_text="$(awk '/^apply:/ { on = 1 } on' "$SCHEMA")"
order="$(printf '%s\n' "$apply_text" | grep -n -i -o 'BDD\|Gate 5\.x\|Red\|Green\|coverage\|mutation' | awk -F: '!seen[tolower($2)]++ { print tolower($2) }' | tr '\n' ' ')"
assert_eq "bdd gate 5.x red green coverage mutation " "$order" "REQ-OSA-6 slice loop order"

for term in "Tradeoff Matrix:research" "Breaking Changes:research" "Out-of-Scope (YAGNI):proposal" "Pure Core vs. I/O Shell:design"; do
  text="${term%%:*}"
  id="${term##*:}"
  body="$(awk -v id="$id" '$0 == "  - id: " id { on = 1; next } /^  - id: / { on = 0 } /^apply:/ { on = 0 } on' "$SCHEMA")"
  case "$body" in
    *"$text"*) PASSED=$((PASSED + 1)) ;;
    *) echo "FAIL: REQ-OSA-5 '$id' instruction lacks '$text'"; FAILED=$((FAILED + 1)) ;;
  esac
done

for name in research proposal spec design tasks; do
  tpl="$SCHEMA_DIR/templates/$name.md"
  if [ ! -f "$tpl" ]; then
    echo "FAIL: REQ-OSA-4 template missing: $name.md"
    FAILED=$((FAILED + 1))
    continue
  fi
  f="$(footer "$tpl")"
  assert_eq "1" "$(printf '%s\n' "$f" | grep -c '^- \[ \] \*\*Gate [0-4] ')" "REQ-OSA-4 $name.md has one unticked gate box"
  assert_eq "0" "$(printf '%s\n' "$f" | grep -c '^- \[[xX]\]')" "REQ-OSA-4 $name.md has no ticked box"
  assert_eq "1" "$(tail -n 1 "$tpl" | grep -c '^- \[ \] \*\*Gate [0-4] ')" "REQ-OSA-4 $name.md ends with the gate box"
done

assert_eq "0" "$(grep -c 'Evidence:' "$SCHEMA_DIR/templates/tasks.md" || true)" \
  "tasks.md template has no self-matching Evidence: literal"

assert_eq "2" "$(grep -c '^- \*\*GIVEN\*\*' "$SCHEMA_DIR/templates/spec.md" || true)" \
  "REQ-OSA-41 spec.md template has GIVEN steps"

for term in "**[DEPRECATED by <change>]**:specs" "MODIFIED Requirements:specs" "GIVEN/WHEN/THEN:specs" "unprefixed:specs" "assigned at Gate 2:proposal" "MUST NOT be ticked by \`/opsx-apply\`:tasks"; do
  text="${term%%:*}"
  id="${term##*:}"
  body="$(awk -v id="$id" '$0 == "  - id: " id { on = 1; next } /^  - id: / { on = 0 } /^apply:/ { on = 0 } on' "$SCHEMA")"
  case "$body" in
    *"$text"*) PASSED=$((PASSED + 1)) ;;
    *) echo "FAIL: '$id' instruction lacks '$text'"; FAILED=$((FAILED + 1)) ;;
  esac
done

case "$apply_text" in
  *"MUST NOT be ticked by \`/opsx-apply\`"*) PASSED=$((PASSED + 1)) ;;
  *) echo "FAIL: apply instruction lacks '/opsx-apply' gate prohibition"; FAILED=$((FAILED + 1)) ;;
esac

echo "Schema checks: $PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
