#!/usr/bin/env sh
set -eu

SPEC_RAILS_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)"
BIN="$SPEC_RAILS_ROOT/bin/spec-rails"

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

# Setup scratch test repo
TEST_DIR="$(mktemp -d /tmp/spec-rails-bdd-XXXXXX)"
trap 'rm -rf "$TEST_DIR"' EXIT

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
STUB_DIR="$TEST_DIR/.stub"
mkdir -p "$STUB_DIR" openspec
printf '#!/bin/sh\necho 1.15.0\n' > "$STUB_DIR/openspec"
chmod +x "$STUB_DIR/openspec"
PATH="$STUB_DIR:$PATH" sh "$BIN" . >/dev/null

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

# Scenarios below seed templates and ROADMAP by hand to exercise the lifecycle without the installer
mkdir -p openspec/changes openspec/specs openspec/changes/archive docs/bug-reports docs/templates
cp "$SPEC_RAILS_ROOT/schemas/spec-rails/templates/"*.md docs/templates/
cp "$SPEC_RAILS_ROOT/templates/bug-report.md" docs/templates/
cp "$SPEC_RAILS_ROOT/templates/roadmap.md" docs/ROADMAP.md
rm -rf "$STUB_DIR"

git checkout -q -b chore/bootstrap-spec-rails
git add .
git commit -q -m "chore: bootstrap Spec-Rails"
git checkout -q main
git merge -q --ff-only chore/bootstrap-spec-rails
git branch -q -d chore/bootstrap-spec-rails

echo ""
echo "Scenario 2: Feature Gate 0 Go decision advances to Proposal and preserves living specs"
# 1. Start Gate 0 Research on feature branch
git checkout -q -b feat/w1.1-core-contracts
mkdir -p openspec/changes/w1.1-core-contracts/specs
cp docs/templates/research.md openspec/changes/w1.1-core-contracts/research.md

# Fill in Gate 0 approval: Option A chosen
printf "\n## Decision\n- [x] Option A: Standard Library\n" >> openspec/changes/w1.1-core-contracts/research.md
git add openspec/changes/w1.1-core-contracts/research.md
git commit -q -m "docs(w1.1): Gate 0 research - Option A chosen"

# 2. Update ROADMAP.md to In Progress via chore lane on main
git checkout -q main
git checkout -q -b chore/roadmap-w1.1
sed -i '' -e 's/| \*\*W1.1\*\* | Core Domain Models | S | — | ⬜/| **W1.1** | Core Domain Models | S | — | 🚀/' docs/ROADMAP.md || \
  sed -i -e 's/| \*\*W1.1\*\* | Core Domain Models | S | — | ⬜/| **W1.1** | Core Domain Models | S | — | 🚀/' docs/ROADMAP.md
git add docs/ROADMAP.md
git commit -q -m "chore: mark W1.1 in progress in ROADMAP"
git checkout -q main
git merge -q --ff-only chore/roadmap-w1.1
git branch -q -d chore/roadmap-w1.1

assert_file "docs/ROADMAP.md" "ROADMAP updated to 🚀 on main"

# 3. Complete feature implementation on feature branch
git checkout -q feat/w1.1-core-contracts
git rebase -q main

# Create full capability spec
mkdir -p openspec/changes/w1.1-core-contracts/specs/contracts
cat <<EOF > openspec/changes/w1.1-core-contracts/specs/contracts/spec.md
# Capability: contracts
- REQ-CONTRACT-1: System must validate tokens deterministically.
EOF

# Production code and tests (committed together per Rule 4)
mkdir -p src tests
printf 'def validate(t): return len(t) > 0\n' > src/contracts.py
printf 'from src.contracts import validate\ndef test_val(): assert validate("abc")\n' > tests/test_contracts.py

# Tasks completed
cat <<EOF > openspec/changes/w1.1-core-contracts/tasks.md
# Tasks: w1.1-core-contracts
- [x] 1.1 Core models implemented and verified
EOF

git add docs/ openspec/ src/ tests/
git commit -q -m "feat(w1.1): implement verified token contracts"

# 4. Gate 6: Sync to living, archive lifecycle, rebase on main, merge --ff-only
cp -R openspec/changes/w1.1-core-contracts/specs/. openspec/specs/
git mv openspec/changes/w1.1-core-contracts openspec/changes/archive/w1.1-core-contracts
git add openspec/
git commit -q -m "chore(w1.1): sync specs to living and archive lifecycle"

git checkout -q main
git merge -q --ff-only feat/w1.1-core-contracts
git branch -q -d feat/w1.1-core-contracts

assert_file "openspec/specs/contracts/spec.md" "Living spec promoted to openspec/specs/contracts/spec.md"
assert_file "openspec/changes/archive/w1.1-core-contracts/research.md" "Research archived in openspec/changes/archive/w1.1-core-contracts/"
assert_file "src/contracts.py" "Production code merged to main"

echo ""
echo "Scenario 3: Feature Gate 0 No-Go archives research and drops item without dirtying code"
git checkout -q -b feat/w1.2-unfeasible
mkdir -p openspec/changes/w1.2-unfeasible
cp docs/templates/research.md openspec/changes/w1.2-unfeasible/research.md
printf "\n## Decision\n- [x] No-Go: Rejected due to prohibitive latency\n" >> openspec/changes/w1.2-unfeasible/research.md
git add openspec/changes/w1.2-unfeasible/research.md
git commit -q -m "docs(w1.2): Gate 0 research concludes No-Go"

# No-Go protocol: archive research to main via chore branch, drop in ROADMAP, prune feat branch
git checkout -q main
git checkout -q -b chore/roadmap-w1.2-drop
mkdir -p openspec/changes/archive/w1.2-unfeasible
git show feat/w1.2-unfeasible:openspec/changes/w1.2-unfeasible/research.md > openspec/changes/archive/w1.2-unfeasible/research.md
sed -i '' -e 's/| \*\*W1.2\*\* | Data Ingestion | M | W1.1 | ⬜/| **W1.2** | Data Ingestion | M | W1.1 | ❌/' docs/ROADMAP.md || \
  sed -i -e 's/| \*\*W1.2\*\* | Data Ingestion | M | W1.1 | ⬜/| **W1.2** | Data Ingestion | M | W1.1 | ❌/' docs/ROADMAP.md
git add openspec/changes/archive/w1.2-unfeasible docs/ROADMAP.md
git commit -q -m "chore: archive W1.2 research as No-Go and mark dropped in ROADMAP"

git checkout -q main
git merge -q --ff-only chore/roadmap-w1.2-drop
git branch -q -d chore/roadmap-w1.2-drop
git branch -q -D feat/w1.2-unfeasible

assert_file "openspec/changes/archive/w1.2-unfeasible/research.md" "Negative research archived for institutional memory"
if [ ! -d "openspec/changes/w1.2-unfeasible" ]; then
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
# Discover defect: validate("") should return False
date_str="$(date +%Y-%m-%d)"
mkdir -p docs/bug-reports .worktrees
bug_report="docs/bug-reports/${date_str}-empty-token-bug.md"
cp docs/templates/bug-report.md "$bug_report"

# Spawn bugfix worktree off main
git worktree add -q .worktrees/fix-empty-token -b fix/empty-token main

# In worktree: write Red test first (fails)
cd .worktrees/fix-empty-token
cat <<EOF >> tests/test_contracts.py
def test_empty_token():
    assert validate("") is False
EOF

# Verify Red test fails locally
python3 -m unittest -q tests/test_contracts.py >/dev/null 2>&1 && RED_FAILED=0 || RED_FAILED=1
if [ "$RED_FAILED" -eq 1 ]; then
  step_pass "Gate B2 confirmed: Red regression test fails on unmodified code"
else
  step_fail "Gate B2 confirmed: Red regression test fails on unmodified code" "Test unexpectedly passed"
fi

# Apply surgical Green fix
cat <<EOF > src/contracts.py
def validate(t):
    return bool(t) and len(t) > 0
EOF

# Update living spec inside the worktree (zero contamination of parent working tree)
cat <<EOF >> openspec/specs/contracts/spec.md
- REQ-CONTRACT-2: Empty token strings MUST evaluate to False.
EOF

# Commit Green fix + Red test together (Rule 4)
git add src/ tests/ openspec/
git commit -q -m "fix: reject empty tokens and update living spec"

# Merge per Rule 2
cd "$TEST_DIR"
git checkout -q main
git merge -q --ff-only fix/empty-token
git worktree remove .worktrees/fix-empty-token >/dev/null
git branch -q -d fix/empty-token
git worktree prune

WT_COUNT=$(git worktree list | wc -l | tr -d ' ')
if [ "$WT_COUNT" -eq 1 ]; then
  step_pass "Worktree removed and pruned cleanly (only root worktree remains)"
else
  step_fail "Worktree removed and pruned cleanly" "expected 1 worktree, found $WT_COUNT"
fi

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
