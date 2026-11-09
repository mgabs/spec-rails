# Proposal

## Intent
Make `spec-rails init` a clean, repeatable upgrade that wires OpenSpec only, leaves quality gates to the developer, and leaves no runtime dependency on spec-rails or mutmut in the target repo.

## Problem Statement
Upgrading `voc-eval` showed: (1) `modernizePreCommitConfig` swallows `language: system` and `pass_filenames: false`, producing an invalid hook; (2) the existing `spec-rails-ci.yml` is never refreshed and still calls deleted `sh openspec/spec-rails/spec-rails-*` scripts; (3) generated hooks and CI require `npx --no-install spec-rails`, which fails in any repo without spec-rails installed (not on npm, `dist/` gitignored); (4) the python preset copies a root `mutmut.ini`; (5) `WORKFLOW.md` still references `rails.conf` and "checks".

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `openspec-addon`: installer behavior for pre-commit, CI template, presets, TODO file, and stale cleanup (exact requirement keys assigned at Gate 2; candidates REQ-OSA-28, REQ-OSA-36, REQ-OSA-46, REQ-OSA-49).

## Scope

### In-Scope
- `init` keeps requiring an existing OpenSpec (`openspec/` dir, CLI on PATH, >= 1.15.0); it modifies that setup or fails with a clear error (REQ-OSA-11 unchanged).
- Generated/modernized `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` never call or depend on spec-rails.
- Fix the pre-commit modernization regex so sibling keys and blank lines are preserved.
- `spec-rails-ci.yml` becomes a language-agnostic, commented skeleton (unit tests, coverage, mutation) that does nothing until the developer fills it in; stale copies are replaced on upgrade.
- Generate a TODO file (created if absent, never overwritten) prompting the developer to set up coverage and mutation checks.
- Drop mutmut entirely (root and `openspec/spec-rails/mutation/` copies, python preset reference, docs).
- Remove all other stale artifacts on upgrade: `spec-rails-check` hook, legacy hooks/workflow, and stale `rails.conf`/"checks" text in `rules/WORKFLOW.md` and `openspec/spec-rails/WORKFLOW.md`.
- Simplify the code and docs touched; delete rather than migrate.
- Bump the minor version to 0.4.0 (`package.json`, `CHANGELOG.md`) as the last task of the change.

### Out-of-Scope (YAGNI)
- Publishing spec-rails to npm, adding a `prepare` script, or vendoring `dist/cli.js` into target repos.
- Replacement mutation or coverage tooling, or enforcing any gate in generated hooks/CI.
- Downgrading the OpenSpec prerequisite to a warning.
- Changes to the spec-rails CLI's own `check`/`verify` commands beyond what stale removal requires.

## Assumptions
- **ASM-GEN-1**: Developers own and wire their own test, coverage, and mutation commands per stack.
- **ASM-GEN-2**: Existing adopters accept hook/workflow replacement on re-running `init`; user-added custom hooks in `.pre-commit-config.yaml` are preserved.
- **ASM-GEN-3**: The TODO file lives at `openspec/spec-rails/TODO.md` (confirmed in design).

## Success Metrics
- Re-running `init` on `voc-eval` yields a valid `.pre-commit-config.yaml` (`pre-commit validate-config` passes) and a workflow with no spec-rails or mutmut references.
- `grep -ri "spec-rails check\|spec-rails verify\|mutmut\|rails.conf"` over generated target files returns nothing.
- A second `init` run produces no diff (idempotent).

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
