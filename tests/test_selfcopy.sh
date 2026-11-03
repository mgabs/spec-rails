#!/usr/bin/env sh
# Fails when an installed self-copy in this repository differs from its source (REQ-OSA-22).
set -eu

ROOT="${SPEC_RAILS_ROOT:-$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)}"
FAILED=0

check_pair() {
  if ! out="$(diff -r "$ROOT/$1" "$ROOT/$2" 2>&1)"; then
    echo "FAIL: $2 differs from $1"
    echo "$out"
    FAILED=1
  fi
}

check_pair schemas/spec-rails openspec/schemas/spec-rails
check_pair bin/spec-rails-check openspec/spec-rails/spec-rails-check
check_pair bin/spec-rails-verify openspec/spec-rails/spec-rails-verify
check_pair rules/AGENTS.md openspec/spec-rails/AGENTS.md
check_pair rules/WORKFLOW.md openspec/spec-rails/WORKFLOW.md
check_pair templates/bug-report.md openspec/spec-rails/bug-report.md
check_pair templates/mutation openspec/spec-rails/mutation
check_pair skills/spec-rails/SKILL.md .agents/skills/spec-rails/SKILL.md
check_pair templates/spec-rails-ci.yml .github/workflows/spec-rails-ci.yml

[ "$FAILED" -eq 0 ] && echo "selfcopy: in sync"
exit "$FAILED"
