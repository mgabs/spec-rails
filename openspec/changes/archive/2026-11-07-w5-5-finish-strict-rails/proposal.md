# Proposal

## Intent

Complete W5.5 strict rails by enforcing `mutationMinScore` and execution timeouts in `verify`, removing dead CLI stubs and duplicate presets, and modernizing documentation and the README to reflect the TypeScript CLI.

## Problem Statement

1. `verify` executes the configured mutation command but omits `mutationMinScore` from the rail definition, allowing commands that exit 0 without reporting a score or falling below threshold to pass silently. It also lacks a process execution timeout.
2. `src/cli.ts` contains dead code (dropped `lint` command stub and an unused `--slice` option on `verify`), while `templates/mutation/` contains stale duplicate preset files (e.g. Jest-based Stryker config).
3. `README.md` is outdated, still referencing removed `bin/` shell scripts and `jq` instead of the TypeScript CLI (`spec-rails init/check/verify/audit`).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `openspec-addon`: `openspec/specs/openspec-addon/spec.md` (updates `REQ-OSA-47` for mutation score and timeout enforcement in `verify`).

## Scope

### In-Scope
- `verify`: Pass `mutationMinScore` to the mutation rail. Fail verification when the command exits non-zero, when mutation output lacks a numeric percentage score, or when the score is below threshold.
- `verify`: Enforce a default execution timeout policy on spawned rail commands (600,000 ms / 10 min) to prevent infinite loops.
- Dead code removal: Remove dead `lint` command stub and unused `--slice` option from `src/cli.ts`; eliminate stale duplicate presets in `templates/mutation/`.
- Docs & README: Modernize `README.md` for the TypeScript CLI (`spec-rails [init|verify|check|audit]`), remove legacy references to `bin/` shell scripts and `jq`, and update `docs/ROADMAP.md` W5.5 entry and Wave 5 Exit Criteria.
- Unit tests & coverage: Update `verify.test.ts` and `cli.test.ts`.

### Out-of-Scope (YAGNI)
- Language-specific runner templates or scripts (e.g. `mutmut_runner.py`).
- Language-specific manifest or lockfile detection (e.g. `uv.lock`, `pyproject.toml`).
- Modifying `init.ts` presets. Every stack (TS, Python, Go, Rust) defines its commands in `spec-rails.config.json`.

## Assumptions
- **ASM-GEN-1**: The adopter's configured mutation command outputs its result including a numeric percentage score (e.g. `Mutation score: 96%` or Stryker/Mutants summaries).
- **ASM-GEN-2**: Existing docs-only mutation skip and task-evidence validation behavior remain unchanged.
- **ASM-GEN-3**: A 10-minute child process timeout prevents hung runs without impacting normal test suites.

## Success Metrics
- `verify` fails when mutation output produces no numeric score or reports a score below `mutationMinScore`.
- `verify` fails when a rail command exceeds the execution timeout.
- Dead `lint` stub and `--slice` option removed from `src/cli.ts`.
- `README.md` accurately documents the TypeScript CLI commands and `spec-rails.config.json`.
- All unit, coverage, and mutation tests pass.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
