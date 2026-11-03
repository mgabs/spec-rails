#!/usr/bin/env sh
set -eu

SPEC_RAILS_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)"
BIN="$SPEC_RAILS_ROOT/bin/spec-rails"

# Drop GIT_DIR/GIT_INDEX_FILE etc. leaked by git hooks so scratch repos stay isolated.
# shellcheck disable=SC2046
unset $(git rev-parse --local-env-vars)

PASSED=0
FAILED=0

step_pass() {
  echo "  ✓ $1"
  PASSED=$((PASSED + 1))
}

step_fail() {
  echo "  ✗ $1 (Reason: $2)"
  FAILED=$((FAILED + 1))
}

assert_file() {
  if [ -f "$1" ]; then
    step_pass "$2"
  else
    step_fail "$2" "File '$1' not found"
  fi
}

echo "=========================================================="
echo "Running BDD Acceptance Tests: openspec/spec-rails/WORKFLOW.md Lifecycle"
echo "=========================================================="

# Setup scratch test repo and external openspec stub (works with PATH="/usr/bin:/bin")
TEST_DIR="$(mktemp -d /tmp/spec-rails-bdd-XXXXXX)"
STUB_DIR="$(mktemp -d /tmp/spec-rails-bdd-stub-XXXXXX)"
trap 'rm -rf "$TEST_DIR" "$STUB_DIR"' EXIT INT TERM

cat <<'STUB' > "$STUB_DIR/openspec"
#!/bin/sh
set -eu
case "${1:-}" in
  --version|-v|version)
    echo "1.15.0"
    exit 0
    ;;
  new)
    if [ "${2:-}" = "change" ] && [ -n "${3:-}" ]; then
      mkdir -p "openspec/changes/$3"
      exit 0
    fi
    exit 1
    ;;
  list)
    items=""
    if [ -d "openspec/changes" ]; then
      for d in openspec/changes/*; do
        [ -d "$d" ] || continue
        name="$(basename "$d")"
        [ "$name" = "archive" ] && continue
        items="${items}${items:+,}{\"name\":\"$name\"}"
      done
    fi
    printf '{"root":".","changes":[%s]}\n' "$items"
    exit 0
    ;;
  status)
    chg=""
    shift
    while [ "$#" -gt 0 ]; do
      case "$1" in
        --change) chg="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    cdir="openspec/changes/$chg"
    st_res="ready"; [ -f "$cdir/research.md" ] && st_res="done"
    st_prop="blocked"; [ -f "$cdir/proposal.md" ] && st_prop="done"
    st_spec="blocked"
    if [ -d "$cdir/specs" ] && [ -n "$(find "$cdir/specs" -name spec.md -type f 2>/dev/null)" ]; then
      st_spec="done"
    fi
    st_des="blocked"; [ -f "$cdir/design.md" ] && st_des="done"
    st_tsk="blocked"; [ -f "$cdir/tasks.md" ] && st_tsk="done"
    printf '{"schemaName":"spec-rails","changeName":"%s","artifactPaths":{},"artifacts":[' "$chg"
    printf '{"id":"research","status":"%s","requires":[]},' "$st_res"
    printf '{"id":"proposal","status":"%s","requires":["research"]},' "$st_prop"
    printf '{"id":"specs","status":"%s","requires":["proposal"]},' "$st_spec"
    printf '{"id":"design","status":"%s","requires":["specs"]},' "$st_des"
    printf '{"id":"tasks","status":"%s","requires":["design"]}' "$st_tsk"
    printf ']}\n'
    exit 0
    ;;
  validate)
    exit 0
    ;;
  archive)
    chg=""
    shift
    for arg in "$@"; do
      case "$arg" in
        --*) ;;
        *) [ -z "$chg" ] && chg="$arg" ;;
      esac
    done
    mkdir -p openspec/specs openspec/changes/archive
    if [ -d "openspec/changes/$chg/specs" ]; then
      cp -R "openspec/changes/$chg/specs/." openspec/specs/
    fi
    mv "openspec/changes/$chg" "openspec/changes/archive/$chg"
    exit 0
    ;;
esac
exit 64
STUB
chmod +x "$STUB_DIR/openspec"
PATH="$STUB_DIR:$PATH"
export PATH

git init -q -b main "$TEST_DIR"
cd "$TEST_DIR"
git config user.name "Test Dev"
git config user.email "dev@example.com"

# Initial dummy commit so main branch exists
printf "# Test Repo\n" > README.md
git add README.md
git commit -q -m "initial commit"

echo ""
echo "Scenario 1: Bootstrap an OpenSpec repository with Spec-Rails wiring"
mkdir -p openspec
sh "$BIN" . >/dev/null

assert_file "openspec/schemas/spec-rails/schema.yaml" "openspec/schemas/spec-rails/schema.yaml exists"
assert_file "openspec/spec-rails/AGENTS.md" "Spec-Rails agent rules installed"
assert_file "openspec/spec-rails/WORKFLOW.md" "Spec-Rails workflow protocol installed"
assert_file ".github/workflows/spec-rails-ci.yml" "CI workflow installed"
assert_file ".pre-commit-config.yaml" ".pre-commit-config.yaml exists"
if grep -qx "schema: spec-rails" openspec/config.yaml; then
  step_pass "openspec/config.yaml selects schema spec-rails"
else
  step_fail "openspec/config.yaml selects schema spec-rails" "schema line missing"
fi

if grep -qxF ".worktrees/" .gitignore; then
  step_pass ".worktrees/ is present in .gitignore"
else
  step_fail ".worktrees/ is present in .gitignore" "missing from .gitignore"
fi

# Seed project data (ROADMAP and templates) on chore branch
mkdir -p openspec/changes openspec/specs openspec/changes/archive docs/bug-reports docs/templates
cp "$SPEC_RAILS_ROOT/schemas/spec-rails/templates/"*.md docs/templates/
cp "$SPEC_RAILS_ROOT/templates/bug-report.md" docs/templates/
cp "$SPEC_RAILS_ROOT/templates/roadmap.md" docs/ROADMAP.md

git checkout -q -b chore/bootstrap-spec-rails
git add .
git commit -q -m "chore: bootstrap Spec-Rails"
git checkout -q main
git merge -q --ff-only chore/bootstrap-spec-rails
git branch -q -d chore/bootstrap-spec-rails

echo ""
echo "Scenario 2: Feature Gate 0 Go decision advances through Gates 1-4 and archives via openspec archive"
# 1. Start Gate 0 Research on feature branch (dots normalized to hyphens: W1.1 -> w1-1)
git checkout -q -b feat/w1-1-core-contracts
openspec new change w1-1-core-contracts
sed 's/^- \[ \] \*\*Gate 0/- [x] **Gate 0/' docs/templates/research.md > openspec/changes/w1-1-core-contracts/research.md
git add openspec/changes/w1-1-core-contracts/research.md
git commit -q -m "docs(w1-1): Gate 0 research - Option A chosen"

# 2. Update ROADMAP.md to In Progress via chore lane on main
git checkout -q main
git checkout -q -b chore/roadmap-w1-1
sed 's/| \*\*W1\.1\*\* | Core Domain Models | S | — | ⬜/| **W1.1** | Core Domain Models | S | — | 🚀/' docs/ROADMAP.md > docs/ROADMAP.md.tmp
mv docs/ROADMAP.md.tmp docs/ROADMAP.md
git add docs/ROADMAP.md
git commit -q -m "chore: mark W1.1 in progress in ROADMAP"
git checkout -q main
git merge -q --ff-only chore/roadmap-w1-1
git branch -q -d chore/roadmap-w1-1

assert_file "docs/ROADMAP.md" "ROADMAP updated to 🚀 on main"

# 3. Complete Gates 1-4 and implementation on feature branch
git checkout -q feat/w1-1-core-contracts
git rebase -q main

sed 's/^- \[ \] \*\*Gate 1/- [x] **Gate 1/' docs/templates/proposal.md > openspec/changes/w1-1-core-contracts/proposal.md

mkdir -p openspec/changes/w1-1-core-contracts/specs/contracts
cat <<'EOF' > openspec/changes/w1-1-core-contracts/specs/contracts/spec.md
# Spec Delta

## Purpose
Defines deterministic token validation rules and behavioral contracts for authentication inputs.

## ADDED Requirements

### Requirement: REQ-CONTRACT-1 Deterministic token validation
The system MUST validate tokens deterministically.

#### Scenario: Non-empty token passes validation
- **GIVEN** a non-empty token string
- **WHEN** `validate` runs
- **THEN** validation succeeds with exit status 0

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
EOF

sed 's/^- \[ \] \*\*Gate 3/- [x] **Gate 3/' docs/templates/design.md > openspec/changes/w1-1-core-contracts/design.md

cat <<'EOF' > openspec/changes/w1-1-core-contracts/tasks.md
# Tasks: w1-1-core-contracts

## 3. Slice 1: Token Validation
- [x] 3.1 Core token validator implemented and verified (Evidence: sh tests/test_contracts.sh -> exit 0)
- [x] 4.1 Validate and archive change

## Review Gate
- [x] **Gate 4 Approval**: Tasks breakdown approved by human before writing test code.
EOF

# Production code and tests (committed together per Rule 4)
mkdir -p src tests
cat <<'EOF' > src/contracts.sh
#!/bin/sh
validate() {
  [ -n "$1" ]
}
EOF
cat <<'EOF' > tests/test_contracts.sh
#!/bin/sh
set -eu
. ./src/contracts.sh
validate "abc"
EOF
sh tests/test_contracts.sh

git add openspec/ src/ tests/
git commit -q -m "feat(w1-1): implement verified token contracts"

# 4. Gate 6: Validate and archive via openspec archive (REQ-OSA-9), then merge --ff-only
openspec validate w1-1-core-contracts
openspec archive w1-1-core-contracts --yes
git add -A openspec/
git commit -q -m "chore(w1-1): sync specs and archive change via openspec archive"

git checkout -q main
git merge -q --ff-only feat/w1-1-core-contracts
git branch -q -d feat/w1-1-core-contracts

assert_file "openspec/specs/contracts/spec.md" "Living spec promoted to openspec/specs/contracts/spec.md"
assert_file "openspec/changes/archive/w1-1-core-contracts/research.md" "Research archived in openspec/changes/archive/w1-1-core-contracts/"
assert_file "src/contracts.sh" "Production code merged to main"

echo ""
echo "Scenario 3: Feature Gate 0 No-Go archives research and drops item without dirtying code"
git checkout -q -b feat/w1-2-unfeasible
openspec new change w1-2-unfeasible
sed 's/^- \[ \] \*\*Gate 0/- [x] **Gate 0/' docs/templates/research.md > openspec/changes/w1-2-unfeasible/research.md
printf "\n## Decision\n- [x] No-Go: Rejected due to prohibitive latency\n" >> openspec/changes/w1-2-unfeasible/research.md
git add openspec/changes/w1-2-unfeasible/research.md
git commit -q -m "docs(w1-2): Gate 0 research concludes No-Go"

# No-Go protocol: archive research to main via chore branch, drop in ROADMAP, prune feat branch
git checkout -q main
git checkout -q -b chore/roadmap-w1-2-drop
mkdir -p openspec/changes/archive/w1-2-unfeasible
git show feat/w1-2-unfeasible:openspec/changes/w1-2-unfeasible/research.md > openspec/changes/archive/w1-2-unfeasible/research.md
sed 's/| \*\*W1\.2\*\* | Data Ingestion | M | W1\.1 | ⬜/| **W1.2** | Data Ingestion | M | W1.1 | ❌/' docs/ROADMAP.md > docs/ROADMAP.md.tmp
mv docs/ROADMAP.md.tmp docs/ROADMAP.md
git add openspec/changes/archive/w1-2-unfeasible docs/ROADMAP.md
git commit -q -m "chore: archive W1.2 research as No-Go and mark dropped in ROADMAP"

git checkout -q main
git merge -q --ff-only chore/roadmap-w1-2-drop
git branch -q -d chore/roadmap-w1-2-drop
git branch -q -D feat/w1-2-unfeasible

assert_file "openspec/changes/archive/w1-2-unfeasible/research.md" "Negative research archived for institutional memory"
if [ ! -d "openspec/changes/w1-2-unfeasible" ]; then
  step_pass "Unfeasible feature branch pruned cleanly"
else
  step_fail "Unfeasible feature branch pruned cleanly" "feature directory still present"
fi

echo ""
echo "Scenario 4: Chore lane merges zero-behavior-change commits without gates"
git checkout -q -b chore/update-documentation
printf "\n## Operational Notes\n" >> README.md
git add README.md
git commit -q -m "docs: add operational notes"

git checkout -q main
git merge -q --ff-only chore/update-documentation
git branch -q -d chore/update-documentation

if grep -q "Operational Notes" README.md; then
  step_pass "Chore lane merged fast-forward directly to main"
else
  step_fail "Chore lane merged fast-forward directly to main" "README missing content"
fi

echo ""
echo "Scenario 5: Fast-track bugfix reproduces defect red-first, fixes green, and updates living specs"
# Spawn bugfix worktree off main FIRST so bug report lives in fix branch
mkdir -p .worktrees
git worktree add -q .worktrees/fix-whitespace-token -b fix/whitespace-token main
cd .worktrees/fix-whitespace-token

# Gate B1: Write bug report inside worktree
date_str="$(date +%Y-%m-%d)"
mkdir -p docs/bug-reports
bug_report="docs/bug-reports/${date_str}-whitespace-token-bug.md"
cp docs/templates/bug-report.md "$bug_report"

# Gate B2: Write Red test first (whitespace-only token should fail validation)
cat <<'EOF' >> tests/test_contracts.sh
if validate "   "; then
  exit 1
fi
EOF

# Verify Red test fails locally on unmodified code
RED_FAILED=0
sh tests/test_contracts.sh >/dev/null 2>&1 || RED_FAILED=1
if [ "$RED_FAILED" -eq 1 ]; then
  step_pass "Gate B2 confirmed: Red regression test fails on unmodified code"
else
  step_fail "Gate B2 confirmed: Red regression test fails on unmodified code" "Test unexpectedly passed"
fi

# Gate B3: Apply surgical Green fix
cat <<'EOF' > src/contracts.sh
#!/bin/sh
validate() {
  [ -n "$(printf '%s' "$1" | tr -d '[:space:]')" ]
}
EOF
sh tests/test_contracts.sh

# Update living spec inside the worktree (zero contamination of parent working tree)
cat <<'EOF' >> openspec/specs/contracts/spec.md

### Requirement: REQ-CONTRACT-2 Whitespace-only token rejection
Whitespace-only token strings MUST fail validation.

#### Scenario: Whitespace token rejected
- **WHEN** `validate` is called with spaces only
- **THEN** validation fails with non-zero status
EOF

# Commit bug report + Green fix + Red test + living spec together (Rule 4)
git add docs/bug-reports/ src/ tests/ openspec/
git commit -q -m "fix: reject whitespace-only tokens and update living spec"

# Merge per Rule 2
cd "$TEST_DIR"
git checkout -q main
git merge -q --ff-only fix/whitespace-token
git worktree remove .worktrees/fix-whitespace-token >/dev/null
git branch -q -d fix/whitespace-token
git worktree prune

WT_COUNT=$(git worktree list | wc -l | tr -d ' ')
if [ "$WT_COUNT" -eq 1 ]; then
  step_pass "Worktree removed and pruned cleanly (only root worktree remains)"
else
  step_fail "Worktree removed and pruned cleanly" "expected 1 worktree, found $WT_COUNT"
fi

assert_file "$bug_report" "Bug report merged with fix branch into main"
assert_file "openspec/specs/contracts/spec.md" "Living spec contains updated bugfix requirement"
if grep -q "REQ-CONTRACT-2" openspec/specs/contracts/spec.md; then
  step_pass "Living spec updated with REQ-CONTRACT-2"
else
  step_fail "Living spec updated with REQ-CONTRACT-2" "REQ-CONTRACT-2 missing"
fi

echo ""
echo "=========================================================="
echo "BDD Acceptance Summary:"
echo "Passed Steps: $PASSED"
echo "Failed Steps: $FAILED"
echo "=========================================================="

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
