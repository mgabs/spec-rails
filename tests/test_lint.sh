#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"

FAILED=0
PASSED=0

pass() {
  echo "  ✓ $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo "  ✗ $1 ($2)"
  FAILED=$((FAILED + 1))
}

echo "=== Running Shell Syntax & Spec Sanity Checks ==="

# 1. POSIX shell syntax validation
for script in \
  "$REPO_ROOT"/tests/*.sh; do
  rel="${script#"$REPO_ROOT/"}"
  if sh -n "$script"; then
    pass "Syntax valid: $rel"
  else
    fail "Syntax error: $rel" "sh -n failed"
  fi
done

# 2. Template integrity checks
for template in bug-report.md spec-rails-ci.yml .pre-commit-config.yaml mutation/cargo-mutants.toml mutation/stryker.config.json mutation/mutmut.ini; do
  path="$REPO_ROOT/templates/$template"
  if [ -s "$path" ]; then
    pass "Template present and non-empty: $template"
  else
    fail "Template missing or empty: $template" "file empty or not found"
  fi
done

# 3. YAML & JSON syntax validation
if python3 -c "import yaml" >/dev/null 2>&1; then
  for yml in \
    "$REPO_ROOT/.pre-commit-config.yaml" \
    "$REPO_ROOT/templates/.pre-commit-config.yaml" \
    "$REPO_ROOT/templates/spec-rails-ci.yml" \
    "$REPO_ROOT/.github/workflows/test.yml" \
    "$REPO_ROOT/.github/workflows/spec-rails-ci.yml" \
    "$REPO_ROOT/schemas/spec-rails/schema.yaml" \
    "$REPO_ROOT/openspec/config.yaml"; do
    if [ -f "$yml" ]; then
      rel="${yml#"$REPO_ROOT/"}"
      if python3 -c 'import sys, yaml; yaml.safe_load(open(sys.argv[1]))' "$yml" >/dev/null 2>&1; then
        pass "YAML valid: $rel"
      else
        fail "YAML invalid: $rel" "safe_load failed"
      fi
    fi
  done
fi

if command -v python3 >/dev/null 2>&1; then
  if python3 -c 'import json, sys; json.load(open(sys.argv[1]))' "$REPO_ROOT/plugin.json" >/dev/null 2>&1; then
    pass "JSON valid: plugin.json"
  else
    fail "JSON invalid: plugin.json" "json.load failed"
  fi
fi

# 4. Shellcheck if installed
if command -v shellcheck >/dev/null 2>&1; then
  if shellcheck \
    "$REPO_ROOT"/tests/*.sh; then
    pass "ShellCheck passed"
  else
    fail "ShellCheck failed" "issues found"
  fi
else
  echo "  - ShellCheck not found in PATH (skipped locally, runs in CI)"
fi

# 5. Docs-link and unused-helper hygiene (REQ-OSA-23, REQ-OSA-24, REQ-OSA-30)
if out="$(sh "$REPO_ROOT/tests/check_hygiene.sh" "$REPO_ROOT")"; then
  pass "Hygiene: doc links and shell helpers"
else
  fail "Hygiene check failed" "$out"
fi

# Bundled libraries are build-time only (NFR-OSA-1)
if node -e 'const d=require(process.argv[1]).dependencies||{};process.exit(["zod","cac","fast-glob"].some(k=>k in d)?1:0)' "$REPO_ROOT/package.json"; then
  pass "Bundled libraries are not runtime dependencies"
else
  fail "Bundled libraries listed under dependencies" "move zod, cac, fast-glob to devDependencies"
fi

# Fixtures prove each hygiene rule can fail
FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/docs" "$FIX/rules" "$FIX/bin" "$FIX/tests"
printf '[x](missing.md)\n' > "$FIX/docs/a.md"
printf 'cp openspec/schemas/spec-rails/templates/research.md x\n' > "$FIX/docs/b.md"
printf 'see specs/ROADMAP.md\n' > "$FIX/docs/c.md"
printf 'see specs/WORKFLOW.md\n' > "$FIX/rules/r.md"
printf 'A human ticks it and commits it before the next artifact.\n' > "$FIX/docs/d.md"
printf 'orphan() {\n  :\n}\n' > "$FIX/tests/x.sh"
printf 'Require a > 90%% mutation kill score.\n' > "$FIX/docs/e.md"
printf 'Mutation testing needs 100%% kill.\n' > "$FIX/docs/f.md"
printf '# dead_fn\ndead_fn() {\n  :\n}\n' > "$FIX/tests/y.sh"
fixture_out="$(sh "$REPO_ROOT/tests/check_hygiene.sh" "$FIX" || true)"
for expected in \
  "docs/a.md -> missing.md" \
  "docs/b.md instructs manual template copy" \
  "docs/c.md references a legacy specs/ path" \
  "rules/r.md references a legacy specs/ path" \
  "docs/d.md tells the reader to commit a gate tick" \
  "docs/e.md states a mutation threshold other than 95" \
  "docs/f.md states a mutation threshold other than 95" \
  "tests/x.sh defines unused function orphan" \
  "tests/y.sh defines unused function dead_fn"; do
  case "$fixture_out" in
    *"$expected"*) pass "Hygiene detects: $expected" ;;
    *) fail "Hygiene missed: $expected" "$fixture_out" ;;
  esac
done

echo ""
echo "Lint Summary: Passed: $PASSED, Failed: $FAILED"

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi
