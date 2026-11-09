# Spec Delta

## ADDED Requirements

### Requirement: REQ-OSA-55 Developer-Owned Quality Gates
Generated `.pre-commit-config.yaml` hooks and `.github/workflows/spec-rails-ci.yml` MUST NOT invoke, install or otherwise depend on `spec-rails`. `spec-rails-ci.yml` MUST be a language-agnostic skeleton whose steps for unit tests, coverage and mutation are commented out and which performs no work until the developer edits it.

#### Scenario: Generated files have no spec-rails dependency
- **GIVEN** a repository with OpenSpec initialised and no spec-rails installed
- **WHEN** `spec-rails init` runs
- **THEN** `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` contain no `spec-rails` invocation

#### Scenario: Skeleton is inert
- **GIVEN** the generated `spec-rails-ci.yml`
- **WHEN** it is inspected
- **THEN** its test, coverage and mutation steps are comments and it contains no stack-specific command

### Requirement: REQ-OSA-56 Gate Setup TODO
`spec-rails init` MUST create `openspec/spec-rails/TODO.md` when absent, prompting the developer to configure and run coverage and mutation checks, and MUST NOT overwrite it when present.

#### Scenario: TODO created once
- **GIVEN** no `openspec/spec-rails/TODO.md`
- **WHEN** `spec-rails init` runs
- **THEN** the file exists and mentions coverage and mutation

#### Scenario: Existing TODO preserved
- **GIVEN** a developer-edited `openspec/spec-rails/TODO.md`
- **WHEN** `spec-rails init` runs again
- **THEN** its content is unchanged

### Requirement: REQ-OSA-57 Stale Artifact Cleanup
`spec-rails init` MUST remove stale artifacts from earlier versions: the `spec-rails-check` pre-commit hook, legacy `sh openspec/spec-rails/spec-rails-*` entries, a root `mutmut.ini`, `openspec/spec-rails/mutation/mutmut.ini`, and replace a stale `spec-rails-ci.yml` with the skeleton. Shipped docs (`rules/WORKFLOW.md` and `openspec/spec-rails/WORKFLOW.md`) MUST NOT reference `rails.conf`, "checks" or mutmut. Re-running `init` MUST produce no further changes.

#### Scenario: Stale workflow replaced
- **GIVEN** a `spec-rails-ci.yml` calling `sh openspec/spec-rails/spec-rails-verify`
- **WHEN** `spec-rails init` runs
- **THEN** the file is the skeleton and contains no such call

#### Scenario: mutmut files removed
- **GIVEN** a root `mutmut.ini`
- **WHEN** `spec-rails init` runs
- **THEN** it is deleted and no mutmut file is created

#### Scenario: Idempotent upgrade
- **GIVEN** a repository already upgraded
- **WHEN** `spec-rails init` runs again
- **THEN** no file changes
### Requirement: REQ-OSA-58 Init Action Log
`spec-rails init` MUST print one console line per removed, replaced, created or skipped artifact and a reminder to complete `openspec/spec-rails/TODO.md`.

#### Scenario: Actions are logged
- **GIVEN** a repository with a stale workflow and a root `mutmut.ini`
- **WHEN** `spec-rails init` runs
- **THEN** the output lists the removed `mutmut.ini`, the replaced workflow and the created `TODO.md`

## MODIFIED Requirements

### Requirement: REQ-OSA-21 CI Audit Layout
The CI spec-to-code audit in this repository's own `.github/workflows/spec-rails-ci.yml` MUST treat a PR as spec-backed when it changes any file under an active `openspec/changes/<id>/` (excluding `openspec/changes/archive/`), `openspec/specs/` or `docs/bug-reports/`, MUST treat edits to `openspec/spec-rails/` and `.github/` as audited code changes, MUST bind branch refs via `env:`, and MUST NOT reference `specs/`. Chore-lane branches remain exempt.

#### Scenario: OpenSpec change passes audit
- **WHEN** a PR changes code and a file under `openspec/changes/<id>/`
- **THEN** the audit step exits 0

#### Scenario: Bug report passes audit
- **WHEN** a fix PR changes code and a file under `docs/bug-reports/`
- **THEN** the audit step exits 0

#### Scenario: Code without spec fails audit
- **WHEN** a non-chore PR changes code and no file under `openspec/changes/<id>/`, `openspec/specs/` or `docs/bug-reports/`
- **THEN** the audit step exits 1 and lists the modified files

#### Scenario: Legacy specs path fails audit
- **WHEN** a non-chore PR changes code and a file under `specs/`
- **THEN** the audit step exits 1

### Requirement: REQ-OSA-22 Self-Copy Sync
The repo's installed self-copies (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/SKILL.md`), excluding project-configured `rails.conf`, MUST stay byte-identical to their sources in `schemas/`, `bin/`, `rules/`, `skills/` and `templates/`, and test execution (`npm test`) MUST fail when they differ. This repository's `.github/workflows/spec-rails-ci.yml` is project-owned and is not a copy of the CI template.

#### Scenario: Drift detected
- **WHEN** a source file is changed without updating its installed copy
- **THEN** `make test` fails naming the differing file

#### Scenario: In sync
- **WHEN** all self-copies match their sources
- **THEN** the sync test passes

### Requirement: REQ-OSA-36 Multi-Language Presets and Auto-Detection
`spec-rails init` MUST accept `--stack=[auto|ts|python|go|rust]`. When set to `auto` (or omitted), it MUST inspect the target repository root for package manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) and automatically select the corresponding language stack. It MUST scaffold `spec-rails.config.json` with stack-appropriate test commands, test globs and coverage commands, and copy calibrated mutation configs from `templates/presets/` except for Python, for which no mutation config is copied.

#### Scenario: Auto-detect TypeScript project
- **GIVEN** a repository containing `package.json`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `ts` preset, creates `spec-rails.config.json` configured for npm/vitest, and copies `stryker.config.json` calibrated to 95% break threshold

#### Scenario: Auto-detect Python project
- **GIVEN** a repository containing `pyproject.toml`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `python` preset, configures `pytest`, and copies no mutation config

#### Scenario: Auto-detect Go project
- **GIVEN** a repository containing `go.mod`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `go` preset and configures `go test` and `gremlins`

#### Scenario: Auto-detect Rust project
- **GIVEN** a repository containing `Cargo.toml`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `rust` preset and configures `cargo test` and `cargo-mutants`

### Requirement: REQ-OSA-46 Pre-Commit Framework Standard
`spec-rails init` MUST NOT write standalone shell scripts directly to `.git/hooks/pre-commit`. When `.pre-commit-config.yaml` is absent, it MUST scaffold it with local hooks for branch protection on `main`/`master` and test hooks configured for the detected stack (e.g. `npm test`, `pytest`, `cargo test`, `go test`, `./gradlew test`), and MUST NOT include any `spec-rails` hook. When it already exists, it MUST surgically modernize it in-place by removing the `spec-rails-check`, `check-lgtm-directives` and `spec-rails-verify` hooks while preserving every other hook, key and blank line byte-for-byte. It MUST NOT regenerate or overwrite an existing `.pre-commit-config.yaml`, even with `--force`. It MUST NOT include external review-tool hooks. When a git repository is present and `pre-commit` is on `PATH`, it MUST run `pre-commit install` and ensure no `.git/hooks/pre-commit.legacy` file remains.

#### Scenario: Installer does not write raw git hook
- **GIVEN** a git repository initialized with `git init`
- **WHEN** `spec-rails init` runs
- **THEN** it does not write a standalone non-framework shell script to `.git/hooks/pre-commit` and leaves no `.legacy` hook file

#### Scenario: Stack-aware test hook generation
- **GIVEN** a repository detected with stack `python`
- **WHEN** `spec-rails init` scaffolds `.pre-commit-config.yaml`
- **THEN** the test hook runs `pytest` rather than `make test`

#### Scenario: Branch protection hook in pre-commit
- **GIVEN** `.pre-commit-config.yaml` generated by `spec-rails init`
- **WHEN** inspected
- **THEN** it defines a local branch protection hook that fails on direct commits to `main` and `master`

#### Scenario: Surgical upgrade of existing pre-commit configuration
- **GIVEN** an existing `.pre-commit-config.yaml` with a `spec-rails-check` hook (single-line or folded `entry:`) followed by other hooks with `language:` and `pass_filenames:` keys
- **WHEN** `spec-rails init` runs
- **THEN** the whole `spec-rails-check` hook, and `check-lgtm-directives`/`spec-rails-verify` hooks, are removed, every other hook keeps all its keys and surrounding blank lines, and the file passes `pre-commit validate-config`

#### Scenario: No-install flag on hook execution
- **GIVEN** `.pre-commit-config.yaml` generated or modernized by `spec-rails init`
- **WHEN** inspected
- **THEN** it contains no `spec-rails` command, no `npx` invocation of spec-rails, and no LGTM directives

### Requirement: REQ-OSA-49 CI Template Hygiene
The CI template MUST pin the OpenSpec CLI version when it installs OpenSpec, MUST NOT call `spec-rails`, and MUST NOT contain a Makefile-only test step. All stack-specific steps MUST be commented out.

#### Scenario: Template is pinned and derived
- **GIVEN** `templates/spec-rails-ci.yml`
- **WHEN** it is inspected
- **THEN** any OpenSpec install is pinned `@fission-ai/openspec@<version>`, there is no `spec-rails` or `make test` step, and stack steps are comments

## REMOVED Requirements

### Requirement: REQ-OSA-28 Config-Driven Test Commands in CI
**Reason**: Quality gates are developer-owned; the generated CI workflow no longer runs `spec-rails-verify`.
**Migration**: Developers uncomment and fill the test, coverage and mutation steps in `spec-rails-ci.yml`.
