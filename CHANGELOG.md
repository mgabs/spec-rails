# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed
- The propose port drafts one gated artifact at a time and stops at each Review Gate instead of generating everything in one pass; the overlay now also replaces the generated `description:` with the port's.

### Removed
- `init` no longer writes `docs/spec-rails/GUIDE.md`, `COMMANDS.md` and `RAILS.md` (duplicates of `WORKFLOW.md`/`AGENTS.md`); existing copies are removed as legacy files.

## [0.7.0] - 2026-11-10

### Added
- `init` creates the root `AGENTS.md` or maintains only its `<!-- spec-rails:start/end -->` block, pointing agents to the always-on guardrails (REQ-OSA-59).
- `npm run sync:self` (maintainers) syncs this repository's self-copies; drifted files are kept and reported unless `-- --force`.
- Guide templates moved to `templates/spec-rails-docs/`.

### Changed
- `--no-verify` is forbidden everywhere, including stream worktrees (REQ-OSA-51 now states the prohibition).
- Merging into `main` may go through a pull request instead of a local `--ff-only`.
- Docs refer to `openspec-*` skill names; `/opsx-*` stay as command aliases.
- `docs/WAY_OF_WORKING.md` slimmed to a summary of `WORKFLOW.md`; `docs/ROADMAP.md` trimmed to open items.
- Gate ranges written as `0–4` and `B1–B3`.

### Fixed
- Generated `GUIDE.md` listed stale Gates 5/6; `RAILS.md` had broken math markup; the bugfix step no longer uses `cd`; `ROADMAP.md` is no longer listed as a created file.

### Removed
- `docs/how-tos/` (superseded by `docs/agentic-how-tos/`), `docs/designs/`, and vendor-specific (Antigravity, `~/.gemini`) and video references.

## [0.6.1] - 2026-11-10

### Added
- Rule precedence in `rules/AGENTS.md`, `rules/WORKFLOW.md` and how-to 05: the stricter rule wins; if unclear or mutually exclusive, the human decides.

### Removed
- OpenSpec-generated `.github/workflows/copilot-setup-steps.yml` from this repository.

## [0.6.0] - 2026-11-10

### Added
- `tests/unit/traceability.test.ts` fails when any `REQ-*`/`NFR-*` id in `openspec/specs/*/spec.md` is not named in `tests/unit/`; it replaces the removed `check` command. Added missing ids to tests plus docs-accuracy, layout and cleanup tests.
- `init` prints a reminder to complete `openspec/spec-rails/TODO.md` when it creates it.
- `init` writes a placeholder `Makefile` (`lint`, `test`, `coverage`, `mutation`; echo only) when none exists; generated `.pre-commit-config.yaml` calls `make lint` / `make test`, each hook only if the existing Makefile defines the target.
- `init` copies `docs/agentic-how-tos/` into target repos (managed, refreshed on every run): detailed agent runbooks 01–05 (bootstrap, feature lifecycle Gates 0–4, parallel worktrees with bake-off, fast-track bugfix, agent configuration) and a `README.md` index. Existing repos get them by re-running `npx spec-rails init`.

### Changed
- Living spec `openspec-addon` aligned with the slim `init`-only CLI. It was edited directly; the gate workflow was not run for this. Removed REQ-OSA-21 (CI audit) and REQ-OSA-31 (`--store`); reworded NFR-OSA-4/5/6/7, REQ-OSA-12, 14, 22, 23, 24 (now: `noUnusedLocals`/`noUnusedParameters` in `tsconfig.json`), 30, 40, 45, 46, 56, 57 and 58 to match current behaviour; "Gate 6" is now Gate 4. 'No code without a spec' is no longer mechanically enforced; reviewers check it.
- Package and plugin versions aligned at 0.6.0.
- Human how-tos cross-reference the agentic runbooks and use `/opsx-propose` / `/opsx-archive` instead of the `openspec` CLI.

### Fixed
- Docs: removed stale references to `check`/`verify`/`audit` in the design note, the CI "audit" in the wiki, a nonexistent `mutation/` folder in `WORKFLOW.md`, and the claim that agents tick Review Gate boxes (humans do).

## [0.5.0] - 2026-11-10

### Changed (breaking)
- `spec-rails` now has a single command, `init`. When `openspec/` is absent it bootstraps through the pinned local `openspec init --tools <list>` (`--tools`, default `agents`; version pinned in `openspec-version`, same major.minor required); otherwise no `openspec` CLI is needed.
- `init` is idempotent without flags: a second run is byte-identical, developer-edited hooks, CI and TODO are preserved, symlinked targets are refused.
- `init` overlays CLI-free bodies (`skills/ports/`) on the generated explore, propose, apply, archive, sync and update skills, commands and prompts of every agent layout; other generated workflows are left untouched and logged. After `openspec update`, re-run `init` to restore them.
- Generated `.pre-commit-config.yaml` has branch protection and test hooks (made make-based in Unreleased).
- Added `vendor/openspec/<version>/` snapshot and `scripts/upgrade-openspec.mjs` for maintainers.

### Removed
- Commands `check`, `verify`, `audit`; flags `--stack` and `--force`; stack detection, `spec-rails.config.json`, `rails.conf` and the mutation presets. `init` deletes these legacy files and `opsx-*` skills from earlier installs.
- Bundled `zod` dependency.

## [0.4.0] - 2026-11-09

### Changed
- `spec-rails init` no longer makes target repos depend on spec-rails: generated and modernized `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` never call `spec-rails`. The CI template is now an inert, commented, language-agnostic skeleton, and `openspec/spec-rails/TODO.md` prompts you to set up coverage and mutation checks.
- `init` logs each removed, replaced or created artifact.
- This repository's own `spec-rails-ci.yml` is no longer a self-copy of the template.

### Removed
- mutmut presets and the root `mutmut.ini`; `init` deletes stale `mutmut.ini`, spec-rails hooks and stale CI workflows from earlier installs.

### Fixed
- Pre-commit modernization no longer deletes sibling keys (`language`, `pass_filenames`) or blank lines, which produced an invalid hook.

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
