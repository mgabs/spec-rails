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
for script in "$REPO_ROOT/bin/spec-rails" "$REPO_ROOT/tests/test_installer.sh" "$REPO_ROOT/tests/test_schema.sh" "$REPO_ROOT/bin/spec-rails-check" "$REPO_ROOT/tests/test_check.sh" "$REPO_ROOT/tests/bdd/test_bdd.sh" "$REPO_ROOT/tests/check_hygiene.sh" "$REPO_ROOT/tests/test_ci_audit.sh" "$REPO_ROOT/tests/test_selfcopy.sh" "$REPO_ROOT/tests/test_e2e.sh" "$REPO_ROOT/bin/spec-rails-verify" "$REPO_ROOT/tests/test_verify.sh"; do
  if sh -n "$script"; then
    pass "Syntax valid: $(basename "$script")"
  else
    fail "Syntax error: $(basename "$script")" "sh -n failed"
  fi
done

# 2. Template integrity checks
for template in roadmap.md bug-report.md spec-rails-ci.yml .pre-commit-config.yaml mutation/cargo-mutants.toml mutation/stryker.config.json mutation/mutmut.ini; do
  path="$REPO_ROOT/templates/$template"
  if [ -s "$path" ]; then
    pass "Template present and non-empty: $template"
  else
    fail "Template missing or empty: $template" "file empty or not found"
  fi
done

# 3. YAML syntax validation
if python3 -c "import yaml" >/dev/null 2>&1; then
  for yml in "$REPO_ROOT/.pre-commit-config.yaml" "$REPO_ROOT/templates/.pre-commit-config.yaml" "$REPO_ROOT/templates/spec-rails-ci.yml" "$REPO_ROOT/.github/workflows/test.yml"; do
    if [ -f "$yml" ]; then
      if python3 -c "import yaml; yaml.safe_load(open('$yml'))" >/dev/null 2>&1; then
        pass "YAML valid: $(basename "$yml")"
      else
        fail "YAML invalid: $(basename "$yml")" "safe_load failed"
      fi
    fi
  done
fi

# 4. Shellcheck if installed
if command -v shellcheck >/dev/null 2>&1; then
  if shellcheck "$REPO_ROOT/bin/spec-rails" "$REPO_ROOT/tests/test_installer.sh" "$REPO_ROOT/tests/bdd/test_bdd.sh" "$REPO_ROOT/tests/test_lint.sh"; then
    pass "ShellCheck passed"
  else
    fail "ShellCheck failed" "issues found"
  fi
else
  echo "  - ShellCheck not found in PATH (skipped locally, runs in CI)"
fi

# 5. Docs-link and unused-helper hygiene (REQ-OSA-23, REQ-OSA-24)
if out="$(sh "$REPO_ROOT/tests/check_hygiene.sh" "$REPO_ROOT")"; then
  pass "Hygiene: doc links and shell helpers"
else
  fail "Hygiene check failed" "$out"
fi

# Fixtures prove each hygiene rule can fail
FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/docs" "$FIX/bin" "$FIX/tests"
printf '[x](missing.md)\n' > "$FIX/docs/a.md"
printf 'cp openspec/schemas/spec-rails/templates/research.md x\n' > "$FIX/docs/b.md"
printf 'see specs/ROADMAP.md\n' > "$FIX/docs/c.md"
printf 'orphan() {\n  :\n}\n' > "$FIX/tests/x.sh"
fixture_out="$(sh "$REPO_ROOT/tests/check_hygiene.sh" "$FIX" || true)"
for expected in "docs/a.md -> missing.md" "docs/b.md instructs manual template copy" "docs/c.md references a legacy specs/ path" "tests/x.sh defines unused function orphan"; do
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
