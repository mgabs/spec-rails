#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
BIN="${SPEC_RAILS_BIN:-$REPO_ROOT/bin/spec-rails}"

# Drop GIT_DIR/GIT_INDEX_FILE etc. leaked by git hooks so scratch repos stay isolated.
# shellcheck disable=SC2046
unset $(git rev-parse --local-env-vars)

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

assert_file_exists() {
  if [ ! -f "$1" ]; then
    echo "FAIL: $2 (missing file '$1')"
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

# Fresh scratch root with a stub `openspec` on PATH (version via STUB_OPENSPEC_VERSION).
SCRATCH="$(mktemp -d /tmp/spec-rails-installer-XXXXXX)"
trap 'rm -rf "$SCRATCH"' EXIT
STUB="$SCRATCH/stub"
mkdir -p "$STUB"
cat <<'EOF' > "$STUB/openspec"
#!/bin/sh
case "${1:-}" in
  --version) echo "${STUB_OPENSPEC_VERSION:-1.15.0}" ;;
  list) echo '{"changes":[]}' ;;
esac
exit 0
EOF
chmod +x "$STUB/openspec"
STUB_PATH="$STUB:$PATH"
# Hooks run with the stub too, so results do not depend on a locally installed openspec.
PATH="$STUB_PATH"
NO_OPENSPEC_PATH="/usr/bin:/bin"

newdir() {
  mktemp -d "$SCRATCH/p-XXXXXX"
}

newproj() {
  d="$(newdir)"
  mkdir -p "$d/openspec"
  echo "$d"
}

snapshot() {
  (cd "$1" && find . | sort && find . -type f -exec cksum {} + | sort)
}

# run_install <args...>: sets RC and OUT, never aborts the test script.
run_install() {
  RC=0
  OUT="$(PATH="$STUB_PATH" /bin/sh "$BIN" "$@" 2>&1)" || RC=$?
}

# ---- Unit: version_ge / set_schema_line ----
SPEC_RAILS_SOURCE_ONLY=1
export SPEC_RAILS_SOURCE_ONLY
# shellcheck disable=SC1090
. "$BIN"
unset SPEC_RAILS_SOURCE_ONLY

vge() {
  rc=0
  version_ge "$1" "$2" || rc=$?
  assert_eq "$3" "$rc" "version_ge $1 $2"
}
vge 1.14.9 1.15.0 1
vge 1.15.0 1.15.0 0
vge 1.15.1 1.15.0 0
vge 2.0.0 1.15.0 0
vge 1.9.0 1.15.0 1
vge 1.100.0 1.15.0 0
vge 1.15.0-alpha.1 1.15.0 1
vge 1.16.0-alpha.1 1.15.0 0
vge 1.15.0 1.15.0-alpha.1 0

assert_eq "schema: spec-rails" "$(printf 'schema: spec-driven\n' | set_schema_line)" "set_schema_line replaces"
assert_eq "a: 1
schema: spec-rails
b: 2" "$(printf 'a: 1\nschema: x\nb: 2\n' | set_schema_line)" "set_schema_line preserves others"
assert_eq "a: 1
schema: spec-rails" "$(printf 'a: 1\n' | set_schema_line)" "set_schema_line adds when absent"
assert_eq "schema: spec-rails" "$(printf '' | set_schema_line)" "set_schema_line empty input"

# ---- Scenario: fresh install (REQ-OSA-11, 12, 15) ----
P="$(newproj)"
git init -q -b main "$P"
run_install "$P"
assert_eq "0" "$RC" "fresh install exits 0"
assert_file_exists "$P/openspec/schemas/spec-rails/schema.yaml" "schema copied"
assert_file_exists "$P/openspec/schemas/spec-rails/templates/proposal.md" "schema templates copied"
assert_eq "schema: spec-rails" "$(cat "$P/openspec/config.yaml")" "config created with schema only"
assert_file_exists "$P/.pre-commit-config.yaml" "pre-commit config installed"
assert_file_exists "$P/.github/workflows/spec-rails-ci.yml" "CI workflow installed"
assert_file_exists "$P/openspec/spec-rails/mutation/cargo-mutants.toml" "mutation template installed"
assert_file_exists "$P/openspec/spec-rails/bug-report.md" "bug-report template installed"
assert_file_exists "$P/openspec/spec-rails/mutation/stryker.config.json" "stryker template installed"
assert_file_exists "$P/openspec/spec-rails/mutation/mutmut.ini" "mutmut template installed"
assert_file_exists "$P/.git/hooks/pre-commit" "git hook installed"
assert_eq "1" "$(grep -c '^\.worktrees/$' "$P/.gitignore")" ".worktrees/ once"
assert_eq "" "$(cmp "$REPO_ROOT/rules/AGENTS.md" "$P/openspec/spec-rails/AGENTS.md" 2>&1)" "agent rules copied outside openspec-generated files"
assert_eq "" "$(cmp "$REPO_ROOT/rules/WORKFLOW.md" "$P/openspec/spec-rails/WORKFLOW.md" 2>&1)" "workflow protocol shipped with the addon"
assert_file_exists "$P/.agents/skills/spec-rails/SKILL.md" "spec-rails agent skill installed"
assert_eq "" "$(cmp "$REPO_ROOT/skills/spec-rails/SKILL.md" "$P/.agents/skills/spec-rails/SKILL.md" 2>&1)" "spec-rails skill matches source"
if [ ! -e "$P/specs" ]; then PASSED=$((PASSED + 1)); else echo "FAIL: legacy specs/ must not be created"; FAILED=$((FAILED + 1)); fi

# ---- Scenario: idempotent re-run (REQ-OSA-13) ----
before="$(snapshot "$P")"
run_install "$P"
assert_eq "0" "$RC" "re-run exits 0"
assert_eq "$before" "$(snapshot "$P")" "re-run changes nothing"
# drifted schema file is restored, then stable again
printf 'drift\n' > "$P/openspec/schemas/spec-rails/schema.yaml"
run_install "$P"
assert_eq "" "$(cmp "$REPO_ROOT/schemas/spec-rails/schema.yaml" "$P/openspec/schemas/spec-rails/schema.yaml" 2>&1)" "drifted schema restored"

# ---- Scenario: missing prerequisite openspec/ ----
P="$(newdir)"
run_install "$P"
assert_eq "1" "$RC" "no openspec/ exits 1"
assert_contains "openspec" "$OUT" "no openspec/ message"
assert_eq "" "$(ls -A "$P")" "no openspec/ writes nothing"

# ---- Scenario: old / absent / unparseable CLI ----
P="$(newproj)"
before="$(snapshot "$P")"
RC=0
OUT="$(STUB_OPENSPEC_VERSION=1.14.9 PATH="$STUB_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "1" "$RC" "old openspec exits 1"
assert_contains "1.15.0" "$OUT" "old openspec names required version"
assert_eq "$before" "$(snapshot "$P")" "old openspec writes nothing"

RC=0
OUT="$(PATH="$NO_OPENSPEC_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "1" "$RC" "absent openspec exits 1"
assert_contains "1.15.0" "$OUT" "absent openspec names required version"
assert_eq "$before" "$(snapshot "$P")" "absent openspec writes nothing"

RC=0
OUT="$(STUB_OPENSPEC_VERSION=garbage PATH="$STUB_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "1" "$RC" "unparseable version exits 1"
assert_eq "$before" "$(snapshot "$P")" "unparseable version writes nothing"

RC=0
OUT="$(STUB_OPENSPEC_VERSION=1.15.0 PATH="$STUB_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "0" "$RC" "exactly 1.15.0 accepted"

# ---- Scenario: config preservation (REQ-OSA-14) ----
P="$(newproj)"
printf 'context: |\n  my ctx\nrules:\n  proposal:\n    - keep it short\n' > "$P/openspec/config.yaml"
run_install "$P"
assert_eq "context: |
  my ctx
rules:
  proposal:
    - keep it short
schema: spec-rails" "$(cat "$P/openspec/config.yaml")" "config keys preserved, schema added"

# ---- Scenario: existing pre-commit kept ----
P="$(newproj)"
printf 'custom: pre-commit\n' > "$P/.pre-commit-config.yaml"
run_install "$P"
assert_eq "custom: pre-commit" "$(cat "$P/.pre-commit-config.yaml")" "existing pre-commit config untouched"

# ---- Scenario: another schema already set ----
P="$(newproj)"
printf 'schema: spec-driven\ncontext: x\n' > "$P/openspec/config.yaml"
run_install "$P"
assert_eq "schema: spec-rails
context: x" "$(cat "$P/openspec/config.yaml")" "schema replaced in place"
assert_contains "spec-driven" "$OUT" "previous schema printed"
before="$(snapshot "$P")"
run_install "$P"
assert_eq "$before" "$(snapshot "$P")" "same schema re-run stable"
case "$OUT" in *spec-driven*) echo "FAIL: previous schema printed when unchanged"; FAILED=$((FAILED + 1)) ;; *) PASSED=$((PASSED + 1)) ;; esac

# ---- Scenario: not a git repository ----
P="$(newproj)"
run_install "$P"
assert_eq "0" "$RC" "non-git exits 0"
assert_contains "warning" "$OUT" "non-git warns"
assert_eq "schema: spec-rails" "$(cat "$P/openspec/config.yaml")" "non-git still wires config"
if [ ! -e "$P/.git" ]; then PASSED=$((PASSED + 1)); else echo "FAIL: .git created"; FAILED=$((FAILED + 1)); fi

# ---- Scenario: rules outside openspec-regenerated files (REQ-OSA-15) ----
case "$P/openspec/spec-rails/AGENTS.md" in
  */openspec/spec-rails/*) PASSED=$((PASSED + 1)) ;;
  *) echo "FAIL: rules path"; FAILED=$((FAILED + 1)) ;;
esac
assert_file_exists "$P/openspec/spec-rails/AGENTS.md" "rules present for completed install"

# ---- Arg forms: no args (cwd), init, init dir ----
P="$(newproj)"
RC=0
(cd "$P" && PATH="$STUB_PATH" /bin/sh "$BIN" >/dev/null 2>&1) || RC=$?
assert_eq "0" "$RC" "no-arg install uses cwd"
assert_file_exists "$P/openspec/schemas/spec-rails/schema.yaml" "no-arg install wired"
P="$(newproj)"
(cd "$P" && PATH="$STUB_PATH" /bin/sh "$BIN" init >/dev/null 2>&1) || true
assert_file_exists "$P/openspec/schemas/spec-rails/schema.yaml" "bare init uses cwd"
P="$(newproj)"
run_install init "$P"
assert_file_exists "$P/openspec/schemas/spec-rails/schema.yaml" "init <dir> wired"

# ---- .gitignore handling ----
P="$(newproj)"
printf '# Existing rules\ntarget/\n.worktrees/\n' > "$P/.gitignore"
run_install "$P"
assert_eq "1" "$(grep -c '^\.worktrees/$' "$P/.gitignore")" ".gitignore not duplicated"
P="$(newproj)"
printf 'target/\n' > "$P/.gitignore"
run_install "$P"
assert_eq "target/
.worktrees/" "$(grep -v '^$' "$P/.gitignore")" ".worktrees/ appended to existing .gitignore"
run_install "$P"
assert_eq "1" "$(grep -c '^\.worktrees/$' "$P/.gitignore")" ".gitignore stable on re-run"

# ---- Git hook behaviour ----
P="$(newproj)"
git init -q -b main "$P"
run_install "$P"
BLOCKED_MAIN=0
(cd "$P" && PATH="$STUB_PATH" sh .git/hooks/pre-commit >/dev/null 2>&1) || BLOCKED_MAIN=1
assert_eq "1" "$BLOCKED_MAIN" "hook blocks direct commits to main"

(cd "$P" && git checkout -q -b feat/test-branch)
mkdir -p "$P/.lgtm/reviews"
printf '#ref src/lib.rs:42 fix mutation survivor\n' > "$P/.lgtm/reviews/review1.md"
BLOCKED_REF=0
(cd "$P" && PATH="$STUB_PATH" sh .git/hooks/pre-commit >/dev/null 2>&1) || BLOCKED_REF=1
assert_eq "1" "$BLOCKED_REF" "hook blocks on active #ref directive"

printf 'resolved: all clear\n' > "$P/.lgtm/reviews/review1.md"
PASSED_CLEAR=0
(cd "$P" && PATH="$STUB_PATH" sh .git/hooks/pre-commit >/dev/null 2>&1) && PASSED_CLEAR=1
assert_eq "1" "$PASSED_CLEAR" "hook passes on feature branch when cleared"

# existing hook never overwritten
P="$(newproj)"
git init -q -b main "$P"
mkdir -p "$P/.git/hooks"
printf '#!/bin/sh\n# user hook\n' > "$P/.git/hooks/pre-commit"
run_install "$P"
assert_contains "# user hook" "$(cat "$P/.git/hooks/pre-commit")" "existing hook content kept"
assert_contains "openspec/spec-rails/spec-rails-check" "$(cat "$P/.git/hooks/pre-commit")" "existing hook gets spec-rails-check"
assert_contains ".lgtm/reviews" "$(cat "$P/.git/hooks/pre-commit")" "existing hook gets #ref check"
assert_eq "yes" "$([ -x "$P/.git/hooks/pre-commit" ] && echo yes || echo no)" "existing hook made executable"
assert_eq "#!/bin/sh" "$(sed -n 1p "$P/.git/hooks/pre-commit")" "existing hook shebang stays first"
cp "$P/.git/hooks/pre-commit" "$P/hook.before"
run_install "$P"
assert_eq "" "$(cmp "$P/hook.before" "$P/.git/hooks/pre-commit" 2>&1)" "existing hook not duplicated on re-run"
printf '#!/bin/sh\nexit 0\n' > "$P/.git/hooks/pre-commit"
run_install "$P"
printf '#!/bin/sh\nexit 1\n' > "$P/openspec/spec-rails/spec-rails-check"
HOOK_RC=0
(cd "$P" && git checkout -q -b feat/y && PATH="$STUB_PATH" sh .git/hooks/pre-commit >/dev/null 2>&1) || HOOK_RC=$?
assert_eq "1" "$HOOK_RC" "check runs even when user hook ends with exit 0"
printf 'no shebang\n' > "$P/.git/hooks/pre-commit"
run_install "$P"
assert_eq "no shebang" "$(tail -n 1 "$P/.git/hooks/pre-commit")" "shebang-less hook content kept"
assert_contains "openspec/spec-rails/spec-rails-check" "$(cat "$P/.git/hooks/pre-commit")" "shebang-less hook gets spec-rails-check"

# non-sh existing hook is warned and never corrupted
P="$(newproj)"
git init -q -b main "$P"
mkdir -p "$P/.git/hooks"
printf '#!/usr/bin/env python3\nimport sys\nsys.exit(0)\n' > "$P/.git/hooks/pre-commit"
cp "$P/.git/hooks/pre-commit" "$P/pyhook.before"
run_install "$P"
assert_eq "0" "$RC" "non-sh hook install exits 0"
assert_contains "non-sh interpreter" "$OUT" "non-sh hook emits warning"
assert_eq "" "$(cmp "$P/pyhook.before" "$P/.git/hooks/pre-commit" 2>&1)" "non-sh hook not corrupted"

# ---- Slice 5: hook and CI wiring (REQ-OSA-12, 16, 17) ----
P="$(newproj)"
git init -q -b main "$P"
run_install "$P"
assert_file_exists "$P/openspec/spec-rails/spec-rails-check" "spec-rails-check installed"
assert_eq "yes" "$([ -x "$P/openspec/spec-rails/spec-rails-check" ] && echo yes || echo no)" "spec-rails-check executable"
assert_eq "yes" "$([ -x "$P/openspec/spec-rails/spec-rails-verify" ] && echo yes || echo no)" "spec-rails-verify executable"
assert_eq "" "$(cmp "$REPO_ROOT/bin/spec-rails-check" "$P/openspec/spec-rails/spec-rails-check" 2>&1)" "spec-rails-check identical to source"
assert_eq "" "$(cmp "$REPO_ROOT/bin/spec-rails-verify" "$P/openspec/spec-rails/spec-rails-verify" 2>&1)" "spec-rails-verify identical to source"
assert_contains "spec-rails-verify" "$(cat "$P/.github/workflows/spec-rails-ci.yml")" "CI runs spec-rails-verify"
assert_eq "0" "$(grep -c spec-rails-verify "$P/.git/hooks/pre-commit" || true)" "hook does not call spec-rails-verify"
printf 'RAILS_TEST="edited"\n' > "$P/openspec/spec-rails/rails.conf"
run_install "$P"
assert_eq 'RAILS_TEST="edited"' "$(cat "$P/openspec/spec-rails/rails.conf")" "rails.conf not overwritten"
assert_contains "openspec/spec-rails/spec-rails-check" "$(cat "$P/.git/hooks/pre-commit")" "hook invokes spec-rails-check"
assert_contains "openspec/spec-rails/spec-rails-check" "$(cat "$P/.github/workflows/spec-rails-ci.yml")" "CI runs spec-rails-check"
assert_contains "make test" "$(cat "$P/.github/workflows/spec-rails-ci.yml")" "CI still runs make test"
assert_contains "Audit Spec-to-Code Mapping" "$(cat "$P/.github/workflows/spec-rails-ci.yml")" "CI keeps spec-to-code audit"

# chmod +x restored on re-run even when content matches, and hook checks -f (core.fileMode=false safe)
chmod -x "$P/openspec/spec-rails/spec-rails-check" "$P/openspec/spec-rails/spec-rails-verify"
run_install "$P"
assert_eq "yes" "$([ -x "$P/openspec/spec-rails/spec-rails-check" ] && echo yes || echo no)" "spec-rails-check +x restored on re-run"
assert_eq "yes" "$([ -x "$P/openspec/spec-rails/spec-rails-verify" ] && echo yes || echo no)" "spec-rails-verify +x restored on re-run"

# hook blocks on a failing check, passes when check passes (stub check on a feature branch)
(cd "$P" && git checkout -q -b feat/x)
printf '#!/bin/sh\necho "stub gate violation" >&2\nexit 1\n' > "$P/openspec/spec-rails/spec-rails-check"
chmod -x "$P/openspec/spec-rails/spec-rails-check"
HOOK_RC=0
HOOK_OUT="$(cd "$P" && PATH="$STUB_PATH" sh .git/hooks/pre-commit 2>&1)" || HOOK_RC=$?
assert_eq "1" "$HOOK_RC" "hook fails when spec-rails-check fails (even without +x)"
assert_contains "stub gate violation" "$HOOK_OUT" "hook surfaces spec-rails-check output"
printf '#!/bin/sh\nexit 0\n' > "$P/openspec/spec-rails/spec-rails-check"
HOOK_RC=0
(cd "$P" && PATH="$STUB_PATH" sh .git/hooks/pre-commit >/dev/null 2>&1) || HOOK_RC=$?
assert_eq "0" "$HOOK_RC" "hook passes when spec-rails-check passes"
rm "$P/openspec/spec-rails/spec-rails-check"
HOOK_RC=0
(cd "$P" && PATH="$STUB_PATH" sh .git/hooks/pre-commit >/dev/null 2>&1) || HOOK_RC=$?
assert_eq "0" "$HOOK_RC" "hook skips check when spec-rails-check absent"

# ---- CLI flags: --version, --help, unknown option ----
RC=0
OUT="$(PATH="$NO_OPENSPEC_PATH" /bin/sh "$BIN" --version 2>&1)" || RC=$?
assert_eq "0" "$RC" "--version exits 0 without openspec"
assert_eq "spec-rails 1.0.0" "$OUT" "--version prints version"
RC=0
OUT="$(PATH="$NO_OPENSPEC_PATH" /bin/sh "$BIN" -V 2>&1)" || RC=$?
assert_eq "0" "$RC" "-V exits 0"
assert_eq "spec-rails 1.0.0" "$OUT" "-V prints version"

RC=0
OUT="$(PATH="$NO_OPENSPEC_PATH" /bin/sh "$BIN" --help 2>&1)" || RC=$?
assert_eq "0" "$RC" "--help exits 0"
assert_contains "Usage: spec-rails [init] [--force] [target-dir]" "$OUT" "--help prints usage"
RC=0
OUT="$(PATH="$NO_OPENSPEC_PATH" /bin/sh "$BIN" -h 2>&1)" || RC=$?
assert_eq "0" "$RC" "-h exits 0"

P="$(newdir)"
RC=0
OUT="$(PATH="$STUB_PATH" /bin/sh "$BIN" --unknown-flag "$P" 2>&1)" || RC=$?
assert_eq "1" "$RC" "unknown flag exits 1"
assert_eq "" "$(ls -A "$P")" "unknown flag writes nothing"

# ---- SemVer pre-release & multi-digit major CLI checks ----
P="$(newproj)"
RC=0
OUT="$(STUB_OPENSPEC_VERSION=1.15.0-alpha.1 PATH="$STUB_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "1" "$RC" "1.15.0-alpha.1 rejected (< 1.15.0)"
RC=0
OUT="$(STUB_OPENSPEC_VERSION='@fission-ai/openspec/1.16.0-rc.1 darwin-arm64 node-v22.12.0' PATH="$STUB_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "0" "$RC" "1.16.0-rc.1 accepted"
P="$(newproj)"
RC=0
OUT="$(STUB_OPENSPEC_VERSION=10.0.0 PATH="$STUB_PATH" /bin/sh "$BIN" "$P" 2>&1)" || RC=$?
assert_eq "0" "$RC" "10.0.0 multi-digit major accepted"

# ---- Quoted / commented schema in config.yaml does not falsely warn ----
P="$(newproj)"
printf 'schema: "spec-rails" # keep\n' > "$P/openspec/config.yaml"
run_install "$P"
assert_eq "0" "$RC" "quoted/commented schema exits 0"
case "$OUT" in
  *"Replaced previous schema"*) echo "FAIL: quoted/commented spec-rails printed false replacement"; FAILED=$((FAILED + 1)) ;;
  *) PASSED=$((PASSED + 1)) ;;
esac

# ---- Customizable CI & mutation templates preserved on default re-run, overwritten with --force ----
P="$(newproj)"
run_install "$P"
printf '# custom adopter ci\n' > "$P/.github/workflows/spec-rails-ci.yml"
printf '# custom mutants\n' > "$P/openspec/spec-rails/mutation/cargo-mutants.toml"
run_install "$P"
assert_eq "# custom adopter ci" "$(cat "$P/.github/workflows/spec-rails-ci.yml")" "user-edited CI preserved without --force"
assert_eq "# custom mutants" "$(cat "$P/openspec/spec-rails/mutation/cargo-mutants.toml")" "user-edited mutation config preserved without --force"
run_install --force "$P"
assert_eq "0" "$RC" "--force exits 0"
assert_eq "" "$(cmp "$REPO_ROOT/templates/spec-rails-ci.yml" "$P/.github/workflows/spec-rails-ci.yml" 2>&1)" "--force restores CI template"
assert_eq "" "$(cmp "$REPO_ROOT/templates/mutation/cargo-mutants.toml" "$P/openspec/spec-rails/mutation/cargo-mutants.toml" 2>&1)" "--force restores mutation template"

# ---- Symlinked bin/spec-rails on PATH ----
LINKBIN="$SCRATCH/linkbin"
mkdir -p "$LINKBIN"
ln -s "$BIN" "$LINKBIN/spec-rails"
P="$(newproj)"
RC=0
OUT="$(PATH="$LINKBIN:$STUB_PATH" spec-rails "$P" 2>&1)" || RC=$?
assert_eq "0" "$RC" "symlinked spec-rails on PATH exits 0"
assert_file_exists "$P/openspec/schemas/spec-rails/schema.yaml" "symlinked spec-rails resolves repo assets"

# ---- Git worktree (.git file via git worktree add) ----
WT_MAIN="$(newdir)"
git init -q -b main "$WT_MAIN"
git -C "$WT_MAIN" config user.email wt@example.com
git -C "$WT_MAIN" config user.name wt
git -C "$WT_MAIN" commit -q --allow-empty -m "init"
WT_DIR="$SCRATCH/wt-proj"
git -C "$WT_MAIN" worktree add -q "$WT_DIR" -b feat/wt-test
mkdir -p "$WT_DIR/openspec"
run_install "$WT_DIR"
assert_eq "0" "$RC" "worktree install exits 0"
case "$OUT" in
  *"not a git repository"*) echo "FAIL: worktree treated as non-git"; FAILED=$((FAILED + 1)) ;;
  *) PASSED=$((PASSED + 1)) ;;
esac
WT_HOOK="$(git -C "$WT_DIR" rev-parse --git-path hooks/pre-commit)"
case "$WT_HOOK" in /*) ;; *) WT_HOOK="$WT_DIR/$WT_HOOK" ;; esac
assert_file_exists "$WT_HOOK" "worktree pre-commit hook installed"
mkdir -p "$WT_DIR/.lgtm/reviews"
printf '#ref app.rs:1 unresolved\n' > "$WT_DIR/.lgtm/reviews/r.md"
WT_COMMIT_RC=0
(cd "$WT_DIR" && git add openspec/config.yaml && PATH="$STUB_PATH" git commit -q -m "blocked" >/dev/null 2>&1) || WT_COMMIT_RC=$?
assert_eq "1" "$WT_COMMIT_RC" "worktree commit enforces installed hook"

# ---- Symlink clobbering protection ----
VICTIM="$SCRATCH/victim.txt"
printf 'do-not-touch\n' > "$VICTIM"
P="$(newproj)"
ln -s "$VICTIM" "$P/openspec/config.yaml"
run_install "$P"
assert_eq "1" "$RC" "pre-planted file symlink rejected"
assert_eq "do-not-touch" "$(cat "$VICTIM")" "victim file untouched through file symlink"

P="$(newproj)"
VICTIM_DIR="$SCRATCH/victim-dir"
mkdir -p "$VICTIM_DIR"
ln -s "$VICTIM_DIR" "$P/.github"
run_install "$P"
assert_eq "1" "$RC" "pre-planted directory symlink rejected"
assert_eq "" "$(ls -A "$VICTIM_DIR")" "victim directory untouched through dir symlink"

REAL_T="$(newproj)"
LINK_T="$SCRATCH/target-link"
ln -s "$REAL_T" "$LINK_T"
run_install "$LINK_T"
assert_eq "1" "$RC" "symlinked target directory itself rejected"

echo ""
echo "=== Test Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
