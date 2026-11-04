# Spec-Rails Hardening: Multi-Language Rails & Anti-Drift Engine

* **Author:** Mohammed M
* **Date:** 2026-11-03

## Overview

Spec-Rails provides a gated development workflow (Gates 0–6, Red-Green-Mutation rails, Git worktree streams) paired with `mgabs/lgtm` and OpenSpec. However, real-world third-party adoption faces friction from language-specific assumptions (Python/Makefile-centric templates, rigid `RAILS_TEST_DIRS="tests"`), while autonomous AI agents drift during planning and slice implementation due to prose-only rules rather than mechanical boundaries.

This concept brief synthesizes architectural, structural, and tooling solutions to make Spec-Rails turnkey for non-shell repositories (TypeScript, Python, Go, Rust) and replace subjective agent guidelines with deterministic mechanical rails.

## Analysis

Synthesized across six Goldfish review lenses (`egm-design`, `egm-codebase-details`, `egm-zoom-out`, `egm-comprehension`, `egm-implementation-readiness`, `egm-structural`):

### 1. Third-Party Onboarding Rigidity
* **Monorepo / Symlink Failure**: `bin/spec-rails:46-96` aborts whenever target paths or parent directories contain symlinks. This breaks pnpm virtual stores, lerna/nx monorepos, and macOS `/var` / `$HOME` environments. Target canonicalization (`realpath`) must replace blanket symlink rejection.
* **Hardcoded Python/Makefile Assumptions**: Templates generate Python-biased `.pre-commit-config.yaml` and CI workflows that assume `Makefile` targets exist. Adopters with npm scripts, Cargo, or Go tooling experience immediate setup breaks.
* **Test Discovery Path Limitations**: `RAILS_TEST_DIRS="tests"` in `bin/spec-rails-verify` fails in Go (co-located `*_test.go`), Rust (`src/**` with `#[cfg(test)]`), and TypeScript (`src/**/*.test.ts`). Test discovery must support path globs or language defaults.
* **Permissive Rail Exit**: When `RAILS_MUTATION` or `RAILS_COVERAGE` is blank, `bin/spec-rails-verify` logs a warning and exits 0, letting third-party repos run without verification unless `RAILS_STRICT=1` is enforced.

### 2. Multi-Language Mutation Presets
* Non-shell stacks currently lack concrete configurations in `templates/mutation/`:
  * **TypeScript/JavaScript**: Stryker Mutator (`@stryker-mutator/core`) preset with Vitest/Jest and scoped module execution.
  * **Python**: `mutmut` preset with Pytest runner.
  * **Go**: `gremlins` / `go-mutesting` preset with diff-scoped runs.
  * **Rust**: `cargo-mutants` preset configured with `nextest`.
* Presets must include commands that calculate and enforce the `>= 95%` mutation kill score and `>= 95%` unit test coverage thresholds on scoped diffs.
* **Gate 0 (`research.md`)**: Replace loose pros/cons with mandatory technical metrics (latency budget, dependency footprint) and verified living spec deprecation checks.
* **Gate 1 (`proposal.md`)**: Enforce machine-readable YAGNI boundaries (forbidden packages, banned paths) checked by pre-commit hooks against `git diff`.
* **Gate 2 (`specs/<cap>/spec.md`)**: Mechanically lint requirement headers (`REQ-*`, `NFR-*`) and enforce Gherkin `#### Scenario:` formatting via a validator command.
* **Gate 3 (`design.md`) & Red-First Testing Rail**: Before logic implementation, slice commit #1 must contain failing tests proving interface contracts are unfulfilled prior to production code writing.
* **Gate 4 / Slice Evidence**: Current evidence check accepts unstructured strings. Replace with structured token parsing: `Evidence: [CMD: npm test] [EXIT: 1] [FAILURES: 2]` and `Evidence: [COVERAGE: 95%] [MUTATION: 95%]`.

## Goals vs. Non-Goals

* **In-Scope Goals**:
  * Stack auto-detection (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) in `bin/spec-rails init`.
  * Turnkey mutation config presets and scoped runner commands for TypeScript, Python, Go, and Rust.
  * Multi-path glob test discovery in `bin/spec-rails-verify`.
  * Canonical path validation replacing blanket symlink rejection in `bin/spec-rails`.
  * Deterministic subprocess verification in `bin/spec-rails-verify`.
  * Structured bracketed evidence enforcement (`Evidence: [KEY: VAL]`) in `spec-rails-verify`.
* **Out-of-Scope Non-Goals**:
  * Writing custom language compilers or proprietary mutation engines (use native ecosystem tools: Stryker, mutmut, gremlins, cargo-mutants).
  * Replacing OpenSpec CLI parser with a custom runtime (maintain OpenSpec CLI compatibility).
  * Enforcing 100% mutation kill score on whole repos Day 1 (keep progressive `>= 95%` threshold on slice diffs).

## Alternatives Weighed

* **Maintain Pure POSIX Shell + jq Core**:
  * *Rejected by author*: POSIX shell exhibits cross-platform fragility on Windows, non-portable sed/grep regex across GNU vs BSD, and external `jq` binary dependency. Author approved updating living spec `NFR-OSA-1` to adopt a zero-runtime-dependency bundled Node.js executable (`dist/cli.js`).
* **Manual Language Setup Guides Only**:
  * *Rejected by author*: Writing how-to documentation without bundling concrete config presets leads to configuration drift, adoption failure, and unconfigured mutation rails.

## Key Decisions & Staging for Next Steps

1. **Stack Presets in `templates/presets/`**: Bundle self-contained mutation configs and runner templates for TS, Python, Go, and Rust.
2. **`spec-rails init --stack=[auto|ts|python|go|rust]`**: Auto-detect package manifests on init, generating language-appropriate configuration and CI workflow.
3. **Structured Tokenized Evidence**: Verify structured bracketed tokens (`Evidence: [CMD: ...] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]`) in `tasks.md`.
