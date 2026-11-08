# Proposal

## Intent

Harden `spec-rails init` for clean upgrades of existing repositories by pruning legacy v0.1 shell binaries and duplicate configs, surgically modernizing existing `.pre-commit-config.yaml` hooks, adding native Gradle/Kotlin stack auto-detection, and disambiguating scaffolded developer documentation.

## Problem Statement

A dry run of `spec-rails init` on an existing v0.1 consumer repository revealed upgrade defects:
1. **Orphaned Shell Scripts**: `openspec/spec-rails/spec-rails-check` and `spec-rails-verify` remain as dead code because `copyDirRecursive` is additive and does not delete superseded files.
2. **Duplicate Config**: `spec-rails.config.json` is generated at root, but `openspec/spec-rails/rails.conf` is also copied into target repos, creating two competing config files.
3. **Stale Pre-Commit Hooks**: Because `initProject` leaves existing `.pre-commit-config.yaml` files untouched to protect custom hooks, existing repos retain `check-lgtm-directives` (dead review tool hook), `entry: sh ... spec-rails-check` (which fails once the shell script is removed), and `spec-rails-verify` in pre-commit (violating the rule that verification belongs in CI).
4. **Missing Stack Detection for Gradle/Kotlin**: Projects with `build.gradle.kts`, `build.gradle`, or `gradlew` fall back to `"auto"` and emit `"testCommand": "npm test"`.
5. **Basename Collision**: `docs/spec-rails/WORKFLOW.md` shares the exact filename of the internal addon protocol `openspec/spec-rails/WORKFLOW.md`.

## Capabilities

### Modified Capabilities
- `openspec-addon`:
  - `REQ-OSA-32` (Installer CLI Flags and Asset Resolution): Auto-prune `openspec/spec-rails/spec-rails-check`, `spec-rails-verify`, and `rails.conf` from target repos; exclude `rails.conf` from asset copying; scaffold `docs/spec-rails/GUIDE.md`.
  - `REQ-OSA-46` (Pre-Commit Framework Standard): Surgically modernize existing `.pre-commit-config.yaml` files in-place to update `spec-rails-check` to `npx --no-install spec-rails check` and remove `check-lgtm-directives` and `spec-rails-verify` hooks while preserving custom project hooks.
  - `REQ-OSA-54` (Gradle / Kotlin Stack Auto-Detection): Auto-detect `build.gradle.kts`, `build.gradle`, or `gradlew`, setting stack to `"gradle"` and `testCommand` to `./gradlew test` (or `make test` if `Makefile` has a `test:` target).

## Scope

### In-Scope
- Enforce active pruning of legacy binaries (`spec-rails-check`, `spec-rails-verify`) and deprecated `rails.conf` in target `openspec/spec-rails/`.
- Exclude `rails.conf` from target repository copying in `initProject`.
- Implement surgical upgrade of existing `.pre-commit-config.yaml`:
  - Update `spec-rails-check` entry to `npx --no-install spec-rails check`.
  - Strip `check-lgtm-directives` hook entry.
  - Strip `spec-rails-verify` hook entry.
  - Retain all other existing repos, hooks, and formatting.
- Add Gradle/Kotlin stack auto-detection in `detectStack`:
  - Detect `build.gradle.kts`, `build.gradle`, or `gradlew`.
  - Default `testCommand` to `./gradlew test`, or `make test` if a root `Makefile` containing `^test:` exists.
- Rename scaffolded developer guide from `docs/spec-rails/WORKFLOW.md` to `docs/spec-rails/GUIDE.md`.
- Comprehensive unit tests covering pruning, surgical YAML updates, Gradle detection, and doc generation.

### Out-of-Scope (YAGNI)
- External heavy YAML parser libraries (maintain zero runtime dependencies via robust string manipulation).
- Modifying test execution logic in `src/commands/verify.ts`.
- Interactive prompts or CLI wizards during `init`.

## Assumptions
- **ASM-GEN-1**: Target repositories have `git` and `openspec/` initialized.
- **ASM-GEN-2**: Existing `.pre-commit-config.yaml` uses standard YAML hook formatting.

## Success Metrics
- Upgrading an existing v0.1 repository leaves 0 orphaned shell scripts and 0 duplicate `rails.conf` files.
- Existing `.pre-commit-config.yaml` is upgraded in-place to `npx --no-install spec-rails check` with 0 LGTM or pre-commit verify hooks, keeping all project hooks intact.
- Gradle/Kotlin projects auto-detect stack `"gradle"` with `./gradlew test` or `make test`.
- All unit tests pass with $\ge 95\%$ coverage and $\ge 95\%$ mutation kill score on modified files.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
