#!/usr/bin/env sh
# Runs the CI "Audit Spec-to-Code Mapping" step extracted from templates/spec-rails-ci.yml
# against throwaway git repos (REQ-OSA-21).
set -eu

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
CI="${SPEC_RAILS_CI_TEMPLATE:-$REPO_ROOT/templates/spec-rails-ci.yml}"

# Drop GIT_DIR/GIT_INDEX_FILE etc. leaked by git hooks so scratch repos stay isolated.
# shellcheck disable=SC2046
unset $(git rev-parse --local-env-vars)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FAILED=0
PASSED=0

awk '/- name: Audit Spec-to-Code Mapping/ { a = 1; next }
     a && /run: \|/ { r = 1; next }
     r && /- name:/ { exit }
     r { sub(/^ {10}/, ""); print }' "$CI" > "$TMP/audit.sh"

[ -s "$TMP/audit.sh" ] || { echo "FAIL: audit step not found in $CI"; exit 1; }
if grep -q '\$[{][{]' "$TMP/audit.sh"; then
  echo "FAIL: audit step run block must not interpolate GitHub expressions directly"
  FAILED=$((FAILED + 1))
else
  PASSED=$((PASSED + 1))
fi

# audit_case NAME EXPECTED_EXIT HEAD_REF FILE...
audit_case() {
  name="$1"; expected="$2"; ref="$3"; shift 3
  d="$TMP/repo"
  rm -rf "$d"
  git init -q "$d"
  (
    cd "$d"
    git config user.email t@t; git config user.name t
    git commit -q --allow-empty -m base
    git update-ref refs/remotes/origin/main HEAD
    for f in "$@"; do mkdir -p "$(dirname "$f")"; echo x > "$f"; done
    git add -A; git commit -q -m change
  )
  rc=0
  out="$(cd "$d" && BASE_REF="main" HEAD_REF="$ref" sh "$TMP/audit.sh" 2>&1)" || rc=$?
  if [ "$rc" != "$expected" ]; then
    echo "FAIL: $name (expected exit $expected, got $rc)"
    FAILED=$((FAILED + 1))
  else
    PASSED=$((PASSED + 1))
  fi
  LAST_OUT="$out"
}

audit_case "openspec change passes" 0 feat/x src/app.sh openspec/changes/w1-1-x/proposal.md
audit_case "living spec passes" 0 feat/x src/app.sh openspec/specs/core/spec.md
audit_case "bug report passes" 0 fix/x src/app.sh docs/bug-reports/2026-01-01-x.md
audit_case "legacy specs/bug-reports path fails" 1 fix/x src/app.sh specs/bug-reports/2026-01-01-x.md
audit_case "code without spec fails" 1 feat/x src/app.sh
case "$LAST_OUT" in
  *src/app.sh*) PASSED=$((PASSED + 1)) ;;
  *) echo "FAIL: failure output lists src/app.sh"; FAILED=$((FAILED + 1)) ;;
esac
audit_case "legacy specs/features path fails" 1 feat/x src/app.sh specs/features/x/spec.md
audit_case "openspec yaml alone is not code" 0 feat/x openspec/changes/w1-1-x/.openspec.yaml
audit_case "chore lane exempt" 0 chore/tidy src/app.sh
audit_case "specs/foo.py alone fails (REQ-OSA-21)" 1 feat/x specs/foo.py
audit_case "openspec/spec-rails/rails.conf without spec fails" 1 feat/x openspec/spec-rails/rails.conf
audit_case ".github workflow edit without spec fails" 1 feat/x .github/workflows/spec-rails-ci.yml
audit_case "archive-only touch with code fails" 1 feat/x src/app.sh openspec/changes/archive/old/notes.txt
audit_case "Gate 6 archive with living spec passes" 0 feat/x src/app.sh openspec/specs/core/spec.md openspec/changes/archive/2026-11-02-w1-1-x/proposal.md

# Gate 6 archive where active change existed on base and was moved to archive/
d="$TMP/repo-archive"
rm -rf "$d"
git init -q "$d"
(
  cd "$d"
  git config user.email t@t; git config user.name t
  mkdir -p openspec/changes/w1-1-x
  echo "schema: spec-rails" > openspec/changes/w1-1-x/.openspec.yaml
  git add -A; git commit -q -m base
  git update-ref refs/remotes/origin/main HEAD
  mkdir -p openspec/changes/archive/2026-11-02-w1-1-x src
  git mv openspec/changes/w1-1-x/.openspec.yaml openspec/changes/archive/2026-11-02-w1-1-x/.openspec.yaml
  echo x > src/app.sh
  git add -A; git commit -q -m archive
)
rc=0
(cd "$d" && BASE_REF="main" HEAD_REF="feat/w1-1-x" sh "$TMP/audit.sh" >/dev/null 2>&1) || rc=$?
if [ "$rc" != "0" ]; then
  echo "FAIL: Gate 6 git mv archive from base change passes (got $rc)"
  FAILED=$((FAILED + 1))
else
  PASSED=$((PASSED + 1))
fi

echo "ci audit: $PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
