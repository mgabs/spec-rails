# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - 2026-11-09

### Added
- `spec-rails init` upgrade hygiene (W7.1): prunes legacy shell binaries, modernizes the installed pre-commit config, and detects Gradle projects.

### Fixed
- CI (`test.yml`) builds `dist/cli.js` before lint and tests; the `--version`/`--help` subprocess tests no longer fail with `Cannot find module dist/cli.js`.

### Changed
- `actions/setup-node` bumped from `v4` to `v7` in `test.yml`, `spec-rails-ci.yml` and `templates/spec-rails-ci.yml`, clearing the Node 20 deprecation warning.
- CLI version is read from `package.json` (single source of truth) instead of being hardcoded in `src/cli.ts`.

### Documentation
- Documented the full command reference and the local pre-commit to CI flow (README, Way of Working, Wiki).

## [0.2.0] - 2026-11-08

Native TypeScript CLI and completion of Wave 6 (Pure OpenSpec Addon & Simplification). Tag `v0.2.0` (`30cdc66`).

### Added
- Zero-runtime-dependency `spec-rails` CLI with `init`, `check`, `verify` and `audit`, replacing the POSIX shell scripts.
- Multi-stack auto-detection (`ts`, `python`, `go`, `rust`) with Stryker, Mutmut, Gremlins and cargo-mutants presets and CI workflow scaffolding.
- Sequential human review gates (0 -> 1 -> 2 -> 3) with step-by-step review pauses.
- `spec-rails check` strict validation (`openspec validate --strict`, `REQ-*`/`NFR-*` keys, EOF newline and trailing whitespace hygiene); `spec-rails verify` accepts free-text `Evidence:` notes and enforces coverage and mutation kill >= 95%.
- Single asset tree resolution, fail-fast installer when `openspec/` is missing, and scaffolded developer guidance (`docs/spec-rails/WORKFLOW.md`, `COMMANDS.md`, `RAILS.md`).
- Worktree execution rails: atomic slice commits, zero-bypass verification before stream merge, subagent zero-polling invariant.

### Changed
- Delta specs are pure (no `## Review Gate` footers); test strategy and verification plans live in `design.md` (Gate 2).
- Unified Vitest harness (13 suites); legacy `.sh` runners and `Makefile` removed.

## [0.1.0] - 2026-11-08

Final pure-shell release before the TypeScript rewrite. Tag `v0.1.0` (`825d7c4`).

### Added
- POSIX `sh` engine: `bin/spec-rails`, `bin/spec-rails-check`, `bin/spec-rails-verify`.
- `spec-rails` OpenSpec schema with artifact validation and transitive gate DAG enforcement.
- Language-agnostic workflow, agent guardrails (`AGENTS.md`) and fast-track bugfix isolation.
- Pre-commit hooks and GitHub Actions CI rails; shell and BDD test suites via `Makefile`.
