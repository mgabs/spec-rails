#!/usr/bin/env sh
# End-to-end: real OpenSpec CLI + spec-rails installer in a brand-new repo (REQ-OSA-25, NFR-OSA-8).
set -eu

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
BIN="$REPO_ROOT/bin/spec-rails"

for tool in openspec jq git; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "SKIP: '$tool' not found on PATH; end-to-end test not run"
    exit 0
  fi
done

# Drop GIT_DIR/GIT_INDEX_FILE etc. leaked by git hooks so scratch repos stay isolated.
# shellcheck disable=SC2046
unset $(git rev-parse --local-env-vars)

START_TS="$(date +%s)"
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

assert_contains() {
  case "$2" in
    *"$1"*) PASSED=$((PASSED + 1)) ;;
    *) echo "FAIL: $3 (missing '$1' in '$2')"; FAILED=$((FAILED + 1)) ;;
  esac
}

SCRATCH="$(mktemp -d /tmp/spec-rails-e2e-XXXXXX)"
trap 'rm -rf "$SCRATCH"' EXIT

# ---- Sub-test: missing openspec on PATH skips cleanly with exit 0 ----
NO_OS_BIN="$SCRATCH/no-openspec-bin"
mkdir -p "$NO_OS_BIN"
for util in sh dirname; do
  ln -s "$(command -v "$util")" "$NO_OS_BIN/$util"
done
SKIP_RC=0
SKIP_OUT="$(PATH="$NO_OS_BIN" sh "$REPO_ROOT/tests/test_e2e.sh" 2>&1)" || SKIP_RC=$?
assert_eq "0" "$SKIP_RC" "missing openspec exits 0"
assert_contains "SKIP:" "$SKIP_OUT" "missing openspec prints SKIP:"

P="$SCRATCH/proj"
mkdir -p "$P"
cd "$P"

git init -q -b main
git config user.name e2e
git config user.email e2e@example.com
openspec init --tools none >/dev/null 2>&1 || { echo "FAIL: openspec init failed"; exit 1; }
sh "$BIN" "$P" >/dev/null 2>&1 || { echo "FAIL: spec-rails install failed"; exit 1; }

git checkout -q -b feat/demo
openspec new change demo >/dev/null 2>&1 || { echo "FAIL: openspec new change failed"; exit 1; }

# ---- Schema resolved, artifact order ----
STATUS="$(openspec status --change demo --json)"
assert_eq "spec-rails" "$(printf '%s' "$STATUS" | jq -r '.schemaName')" "schema resolved"
assert_eq "research proposal specs design tasks" \
  "$(printf '%s' "$STATUS" | jq -r '[.artifacts[].id] | join(" ")')" "artifact order"

# ---- Gates: unticked blocks, ticked allows ----
D="openspec/changes/demo"
printf '# Research\n\n## Review Gate\n- [ ] **Gate 0 Decision**: x\n' > "$D/research.md"
printf '# Proposal\n\n## Review Gate\n- [ ] **Gate 1 Approval**: x\n' > "$D/proposal.md"
git add "$D/research.md" "$D/proposal.md"
RC=0
OUT="$(git commit -q -m "proposal before gate 0" 2>&1)" || RC=$?
assert_eq "1" "$RC" "unticked gate blocks commit"
assert_contains "Gate 0 (research) unticked" "$OUT" "hook names the unticked gate"

printf '# Research\n\n## Review Gate\n- [x] **Gate 0 Decision**: x\n' > "$D/research.md"
git add "$D/research.md"
RC=0
OUT="$(git commit -q -m "tick gate 0" 2>&1)" || RC=$?
assert_eq "0" "$RC" "ticked gate allows commit"

# ---- Complete Gates 1-3 + tasks.md and validate with real OpenSpec CLI ----
cat <<'EOF' > "$D/proposal.md"
# Proposal

## Intent
Add demo capability for end-to-end verification.

## Capabilities

### New Capabilities
- `demo-cap`: Demo capability behavior.

## Scope

### In-Scope
- Demo behavior.

### Out-of-Scope (YAGNI)
- Extra features.

## Review Gate
- [x] **Gate 1 Approval**: x
EOF
mkdir -p "$D/specs/demo-cap"
cat <<'EOF' > "$D/specs/demo-cap/spec.md"
# Spec Delta

## Purpose
Defines the demo capability behavior and verification rules for fresh-repository end-to-end validation.

## ADDED Requirements

### Requirement: REQ-DEMO-1 Demo behavior
The system MUST work.

#### Scenario: Happy path
- **GIVEN** setup
- **WHEN** action
- **THEN** result

## Review Gate
- [x] **Gate 2 Approval**: x
EOF
printf '# Architecture & Technical Design\n\n## 1. Overview & Invariants\nPure core vs. I/O shell.\n\n## Review Gate\n- [x] **Gate 3 Approval**: x\n' > "$D/design.md"
printf '# Tasks\n\n## 3. Slice 1: Demo\n- [ ] 3.1 Implement demo\n\n## Review Gate\n- [ ] **Gate 4 Approval**: x\n' > "$D/tasks.md"

git add "$D/proposal.md" "$D/specs/demo-cap/spec.md" "$D/design.md" "$D/tasks.md"
RC=0
OUT="$(git commit -q -m "complete planning gates 1-4" 2>&1)" || RC=$?
assert_eq "0" "$RC" "ticked gates 1-3 allow downstream artifacts"

RC=0
OUT="$(openspec validate demo 2>&1)" || RC=$?
assert_eq "0" "$RC" "openspec validate accepts demo change ($OUT)"

ELAPSED=$(( $(date +%s) - START_TS ))
if [ "$ELAPSED" -le 20 ]; then
  PASSED=$((PASSED + 1))
else
  echo "FAIL: NFR-OSA-8 budget exceeded (${ELAPSED}s > 20s)"
  FAILED=$((FAILED + 1))
fi

echo "E2E Summary: Passed: $PASSED, Failed: $FAILED"
[ "$FAILED" -eq 0 ]
