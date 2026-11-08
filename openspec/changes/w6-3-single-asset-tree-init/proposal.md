# Proposal

## Intent

Harden `spec-rails init` by failing fast when `openspec/` is absent, consolidating asset resolution to the single canonical asset tree (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/`), scaffolding developer guidance in `docs/spec-rails/`, renaming `package.json` to `spec-rails`, and updating generated pre-commit and CI templates to use `npx --no-install spec-rails` while dropping legacy external review hooks and non-existent `$schema` URLs.

## Problem Statement

Currently:
1. Running `spec-rails init` in a directory without `openspec/` writes `spec-rails.config.json` and silently exits 0 without configuring schemas, rules, skills, or hooks, leaving repositories in a broken, half-wired state.
2. `findAssetRoot()` resolves assets from duplicate legacy root directories (`schemas/spec-rails/`, `rules/`, `skills/`, `templates/mutation/`) rather than the canonical single source of truth under `openspec/` and `.agents/skills/`.
3. `package.json` is published as `@openspec/spec-rails`, but generated hooks and CI workflows invoke `npx spec-rails` (without `--no-install`), risking registry queries and version drift.
4. Generated templates still include legacy review hooks (`check-lgtm-directives`) and reference a non-existent GitHub raw `$schema` URL.
5. Initialized projects receive no local developer guide on how to run gates, lanes, commands, or testing rails.

## Capabilities

### Modified Capabilities
- `openspec-addon`: Update `REQ-OSA-32` (Installer CLI Flags and Asset Resolution) to fail fast when `openspec/` is absent, copy from canonical asset trees, and scaffold `docs/spec-rails/`; update `REQ-OSA-46` (Pre-Commit Framework Standard) to eliminate `check-lgtm-directives` and use `npx --no-install spec-rails`.

## Scope

### In-Scope
- Enforce fail-fast check in `src/commands/init.ts`: throw error if `openspec/` does not exist in target directory.
- Update asset resolution in `src/commands/init.ts` to source files from canonical locations (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/`).
- Scaffold developer documentation in target repositories under `docs/spec-rails/`:
  - `docs/spec-rails/WORKFLOW.md`: Gate execution, feature/bugfix/chore lanes.
  - `docs/spec-rails/COMMANDS.md`: CLI command usage (`init`, `check`, `verify`, `audit`).
  - `docs/spec-rails/RAILS.md`: Testing rails, thresholds ($\ge 95\%$), stack detection.
- Rename `package.json` package name from `@openspec/spec-rails` to `spec-rails`.
- Update `generatePreCommitConfig` and `templates/spec-rails-ci.yml`:
  - Use `npx --no-install spec-rails` instead of `npx spec-rails`.
  - Remove `check-lgtm-directives` hook and external review tool references.
- Remove non-existent `$schema` URL from generated `spec-rails.config.json`.
- Update tests in `tests/unit/init.test.ts` to assert fail-fast behavior and canonical asset copying.

### Out-of-Scope (YAGNI)
- Modifying test execution logic in `src/commands/verify.ts` or `src/commands/check.ts`.
- Deleting root legacy test scripts or Makefile (handled in W6.4 / W6.6).
- Creating interactive CLI prompt wizards.

## Assumptions
- **ASM-GEN-1**: Users run `openspec init` before `spec-rails init` in target repositories.
- **ASM-GEN-2**: Node.js >= 18 is available in the target environment.

## Success Metrics
- `spec-rails init` throws an error with non-zero exit when `openspec/` directory is absent.
- `spec-rails init` scaffolds `docs/spec-rails/WORKFLOW.md`, `COMMANDS.md`, and `RAILS.md` in target repos.
- All generated hooks in `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` invoke `npx --no-install spec-rails` with zero LGTM directives.
- Generated `spec-rails.config.json` contains no invalid `$schema` URL.
- All unit tests pass with $\ge 95\%$ coverage.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
