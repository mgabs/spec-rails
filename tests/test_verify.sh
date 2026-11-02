#!/usr/bin/env sh
# Fixture tests for bin/spec-rails-verify (REQ-OSA-26/27/28, NFR-OSA-9).
set -eu

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
VERIFY="${SPEC_RAILS_VERIFY:-$REPO_ROOT/bin/spec-rails-verify}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASSED=0
FAILED=0

[ -f "$VERIFY" ] || { echo "FAIL: $VERIFY missing"; exit 1; }

# new_repo: fresh fixture with one active change declaring REQ-X-1 (ADDED) and NFR-X-2 (MODIFIED).
new_repo() {
  rm -rf "$TMP/p"
  mkdir -p "$TMP/p/openspec/changes/demo/specs/cap" "$TMP/p/openspec/spec-rails" "$TMP/p/tests"
  printf '%s\n' '# Delta' '## ADDED Requirements' '### Requirement: REQ-X-1 One' '## MODIFIED Requirements' '### Requirement: NFR-X-2 Two' '## Review Gate' '### Requirement: REQ-X-9 Not a delta key' \
    > "$TMP/p/openspec/changes/demo/specs/cap/spec.md"
  printf '%s\n' '- [ ] 3.3 Red tests fail' > "$TMP/p/openspec/changes/demo/tasks.md"
}

# run_case NAME EXPECTED_EXIT OUTPUT_PATTERN
run_case() {
  name="$1"; want="$2"; pat="$3"
  rc=0
  out="$(cd "$TMP/p" && sh "$VERIFY" 2>&1)" || rc=$?
  if [ "$rc" -eq "$want" ] && printf '%s' "$out" | grep -qE "$pat"; then
    PASSED=$((PASSED + 1)); echo "PASS: $name"
  else
    FAILED=$((FAILED + 1)); echo "FAIL: $name (exit $rc, wanted $want, pattern '$pat')"; echo "$out"
  fi
}

new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
run_case "covered keys pass" 0 'all checks passed'

new_repo
printf '%s\n' '@REQ-X-1' > "$TMP/p/tests/a.feature"
run_case "uncovered key fails and is named" 1 'FAIL: NFR-X-2'

new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
run_case "non-delta section keys ignored" 0 'all checks passed'
if (cd "$TMP/p" && sh "$VERIFY" 2>&1 | grep -q 'REQ-X-9'); then
  FAILED=$((FAILED + 1)); echo "FAIL: REQ-X-9 should not be checked"
else
  PASSED=$((PASSED + 1)); echo "PASS: REQ-X-9 not checked"
fi

rm -rf "$TMP/p"; mkdir -p "$TMP/p/openspec/spec-rails"
run_case "no active changes passes" 0 'all checks passed'

new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
printf '%s\n' '- [x] 3.3 Red tests fail' > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "ticked task without evidence fails" 1 'without .Evidence:'

printf '%s\n' '- [x] 3.3 Red tests fail Evidence: make test -> 3 failed' > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "ticked task with evidence passes" 0 'all checks passed'

printf '%s\n' '- [x] 3.3 Red tests fail Evidence:   ' > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "empty evidence fails" 1 'without .Evidence:'

printf '%s\n' '- [ ] 3.3 Red tests fail' '- [x] 4.1 Write docs' > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "unticked and unrelated tasks ignored" 0 'all checks passed'

printf '%s\n' 'RAILS_COVERAGE="exit 1"' > "$TMP/p/openspec/spec-rails/rails.conf"
run_case "failing command is named" 1 'RAILS_COVERAGE exited non-zero'

printf '%s\n' 'RAILS_TEST="true"' 'RAILS_COVERAGE="true"' 'RAILS_MUTATION="true"' > "$TMP/p/openspec/spec-rails/rails.conf"
run_case "all commands pass" 0 'running RAILS_MUTATION'

rm "$TMP/p/openspec/spec-rails/rails.conf"
run_case "missing config warns" 0 'warning: RAILS_TEST is not defined'

printf '%s\n' 'RAILS_TEST_DIRS="spec"' > "$TMP/p/openspec/spec-rails/rails.conf"
run_case "custom test dir honoured" 1 'FAIL: REQ-X-1'

new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
start="$(date +%s)"
(cd "$TMP/p" && sh "$VERIFY" >/dev/null 2>&1)
if [ $(( $(date +%s) - start )) -le 5 ]; then
  PASSED=$((PASSED + 1)); echo "PASS: own checks within 5s"
else
  FAILED=$((FAILED + 1)); echo "FAIL: own checks exceeded 5s"
fi

# Ticking unmodified template tasks.md without real Evidence: fails
new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
sed 's/^- \[ \] 3\.3/- [x] 3.3/' "$REPO_ROOT/schemas/spec-rails/templates/tasks.md" \
  > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "ticking unmodified template tasks.md fails without evidence" 1 'without .Evidence:'

# Legacy placeholder literal Evidence: <command and result> is stripped and rejected
printf '%s\n' '- [x] 3.3 Red unit tests fail (on ticking append `Evidence: <command and result>`)' \
  > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "placeholder evidence literal fails" 1 'without .Evidence:'

# Uppercase - [X] and lowercase coverage without evidence fails
printf '%s\n' '- [X] 3.5 coverage >= 95%' > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "uppercase [X] without evidence fails" 1 'without .Evidence:'

# Word boundary: Reduce latency / Redirect do NOT require Evidence:
printf '%s\n' '- [x] 4.2 Reduce latency and Redirect requests' > "$TMP/p/openspec/changes/demo/tasks.md"
run_case "Reduce latency task does not require evidence" 0 'all checks passed'

# Token boundary: REQ-X-1 does NOT false-pass on @REQ-X-10
new_repo
printf '%s\n' '@REQ-X-10 @NFR-X-2' > "$TMP/p/tests/a.feature"
run_case "REQ-X-1 does not match @REQ-X-10" 1 'FAIL: REQ-X-1'

# Empty RAILS_TEST_DIRS="" fails instead of defaulting grep -r to .
new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
printf '%s\n' 'RAILS_TEST_DIRS=""' > "$TMP/p/openspec/spec-rails/rails.conf"
run_case "empty RAILS_TEST_DIRS fails" 1 'FAIL: RAILS_TEST_DIRS is empty'

# 3-level nested specs/a/b/c/spec.md and multi-hyphen REQ-AUTH-API-1 (with trailing :)
new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
mkdir -p "$TMP/p/openspec/changes/demo/specs/a/b/c"
printf '%s\n' '## ADDED Requirements' '### Requirement: REQ-AUTH-API-1: Multi-hyphen domain' \
  > "$TMP/p/openspec/changes/demo/specs/a/b/c/spec.md"
run_case "3-level spec and REQ-AUTH-API-1 uncovered fails" 1 'FAIL: REQ-AUTH-API-1'
printf '%s\n' '@REQ-X-1 @NFR-X-2 @REQ-AUTH-API-1' > "$TMP/p/tests/a.feature"
run_case "3-level spec and REQ-AUTH-API-1 covered passes" 0 'ok: REQ-AUTH-API-1 covered'

# openspec/changes/archive/... is ignored
new_repo
printf '%s\n' '@REQ-X-1 @NFR-X-2' > "$TMP/p/tests/a.feature"
mkdir -p "$TMP/p/openspec/changes/archive/2026-01-01-old/specs/cap"
printf '%s\n' '## ADDED Requirements' '### Requirement: REQ-ARCHIVED-99 Old' \
  > "$TMP/p/openspec/changes/archive/2026-01-01-old/specs/cap/spec.md"
printf '%s\n' '- [x] 3.3 Red tests without evidence' \
  > "$TMP/p/openspec/changes/archive/2026-01-01-old/tasks.md"
run_case "archive directory is ignored" 0 'all checks passed'

# --store flag resolves external .changeRoot via openspec CLI
rm -rf "$TMP/p" "$TMP/ext"
mkdir -p "$TMP/p/openspec/spec-rails" "$TMP/p/tests" "$TMP/ext/c1/specs/cap" "$TMP/stub"
printf '%s\n' '## ADDED Requirements' '### Requirement: REQ-EXT-1 External' > "$TMP/ext/c1/specs/cap/spec.md"
printf '%s\n' '- [x] 3.3 Red tests Evidence: pytest -> fail' > "$TMP/ext/c1/tasks.md"
cat > "$TMP/stub/openspec" <<EOF_STUB
#!/usr/bin/env sh
echo "\$*" >> "$TMP/stub/log"
case "\$1" in
  list) printf '{"changes":[{"name":"c1"}]}' ;;
  status) printf '{"changeName":"c1","changeRoot":"%s"}' "$TMP/ext/c1" ;;
esac
EOF_STUB
chmod +x "$TMP/stub/openspec"
rc=0
out="$(cd "$TMP/p" && PATH="$TMP/stub:$PATH" sh "$VERIFY" --store ext-store 2>&1)" || rc=$?
if [ "$rc" -eq 1 ] && printf '%s' "$out" | grep -q 'FAIL: REQ-EXT-1' && grep -q -- '--store ext-store' "$TMP/stub/log"; then
  PASSED=$((PASSED + 1)); echo "PASS: --store external changeRoot checked"
else
  FAILED=$((FAILED + 1)); echo "FAIL: --store external changeRoot ($rc): $out"
fi
printf '%s\n' '@REQ-EXT-1' > "$TMP/p/tests/ext.feature"
rc=0
out="$(cd "$TMP/p" && PATH="$TMP/stub:$PATH" sh "$VERIFY" --store=ext-store 2>&1)" || rc=$?
if [ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q 'ok: REQ-EXT-1 covered'; then
  PASSED=$((PASSED + 1)); echo "PASS: --store=ext-store covered passes"
else
  FAILED=$((FAILED + 1)); echo "FAIL: --store=ext-store covered ($rc): $out"
fi

echo "verify: $PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
