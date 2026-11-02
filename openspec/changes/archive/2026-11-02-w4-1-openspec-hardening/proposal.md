# Proposal

## Intent
Harden `spec-rails` for `fission-ai/openspec` v1.15/v1.16 compatibility, fail-closed gate/evidence/traceability enforcement, safe worktree/symlink installer wiring, and zero-Makefile Day-1 adopter portability.

## Problem Statement
1. `spec-rails-check` bypassed upstream gates when `skip_specs: true` or upstream files were uncreated, ignored Gate 4, broke on `openspec` `stderr` warnings, and hardcoded `openspec/changes/<c>` (breaking OpenSpec Stores).
2. `spec-rails-verify` passed unmodified `tasks.md` template lines (`Evidence: <command...>`), matched `REQ-X-1` against `REQ-X-10`, passed all keys when `RAILS_TEST_DIRS=""`, and truncated capability nesting at depth 2.
3. `bin/spec-rails` failed when symlinked on `PATH`, skipped hooks in Git worktrees, clobbered user-edited CI/mutation files, omitted `.agents/skills/spec-rails/SKILL.md`, and shipped a `Makefile`-dependent `.pre-commit-config.yaml`.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `openspec-addon`: Transitive gate/store checks, token-bounded verification, safe worktree/symlink installer, portable pre-commit/CI templates, and kebab-case change naming.

## Scope

### In-Scope
- Transitive `.requires[]` gate verification, Gate 4 enforcement, `.changeRoot`/`.artifactPaths`/`--store` resolution, and `stderr` separation in `bin/spec-rails-check`.
- Token-bounded `REQ`/`NFR` matching, deep `specs/**/*.md` scan, `--store` support, and non-self-matching `Evidence:` verification in `bin/spec-rails-verify` + `tasks.md` template.
- CLI flags (`--version`, `--help`, `--force`), `$0` symlink resolution, target symlink refusal, Git worktree hook resolution, `.agents/skills/spec-rails/SKILL.md` installation, and portable `templates/.pre-commit-config.yaml` + `templates/spec-rails-ci.yml`.
- Docs, protocol, hygiene, self-copy, E2E (`openspec validate`), and offline-safe BDD/installer test suites.

### Out-of-Scope (YAGNI)
- npm registry publishing (`package.json`).
- Custom language-specific test runners inside `spec-rails`.

## Assumptions
- **ASM-GEN-1**: OpenSpec >= 1.15.0 emits `.artifacts`, `.changeRoot`, and `.artifactPaths` in `openspec status --json`.

## Success Metrics
- `make test` passes 100% both with and without global `openspec` on `PATH` (`test-e2e` skips cleanly when absent and validates via `openspec validate` when present).
- `sh bin/spec-rails-verify` and `sh bin/spec-rails-check` exit `0` on `spec-rails` itself.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
