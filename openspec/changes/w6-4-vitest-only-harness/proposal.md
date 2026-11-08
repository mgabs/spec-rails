# Proposal: Vitest-Only Harness & Dead Code Deletion (W6.4)

## Intent
Unify all test and lint execution under native TypeScript Vitest and TypeScript compiler checks, eliminating legacy shell test scripts (`tests/*.sh`) and `Makefile` to achieve a zero-bash, single-runtime test harness.

## Problem Statement
The repository maintains 9 legacy bash scripts (`tests/*.sh`, ~1,800 lines of code) and a `Makefile` in parallel with modern TypeScript Vitest suites (`tests/unit/*.test.ts`). This creates dual-harness maintenance drag, platform-dependent shell quirks, and dispersed requirement traceability tags across shell comments.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `openspec-addon`: Update requirement traceability assertions to verify `REQ-OSA-1..50` and `NFR-OSA-1..9` across TypeScript Vitest suites; drop references to legacy shell scripts and `Makefile`.

## Scope

### In-Scope
- Port schema and template sanity checks from `tests/test_schema.sh` into `tests/unit/schema.test.ts`.
- Port hygiene checks (broken doc links, legacy path references, unused helpers) from `tests/check_hygiene.sh` and `tests/test_lint.sh` into `tests/unit/hygiene.test.ts`.
- Port selfcopy synchronization check from `tests/test_selfcopy.sh` into `tests/unit/selfcopy.test.ts`.
- Tag missing living spec requirement IDs (`REQ-OSA-*`, `NFR-OSA-*`) across unit test suites.
- Delete all 9 shell test scripts (`tests/*.sh`).
- Delete `Makefile`.
- Update `.pre-commit-config.yaml` to run `npm test` and `npm run lint` directly.
- Update `.github/workflows/test.yml` to remove ShellCheck and Makefile invocations in favor of `npm test` and `npm run lint`.
- Update `package.json` scripts and `README.md`.

### Out-of-Scope (YAGNI)
- Modifying core CLI runtime commands (`init`, `check`, `verify`, `audit`).
- Restructuring asset directories (reserved for W6.3).
- Adding new external npm dependencies or test frameworks.

## Assumptions
- **ASM-GEN-1**: All valid scenarios in the legacy shell test scripts are either already covered in `tests/unit/` or can be ported directly to Vitest without loss of coverage.
- **ASM-GEN-2**: Modern Node environments supporting Spec-Rails (Node >= 18) do not require `make` for testing or linting.

## Success Metrics
- 0 legacy `.sh` test scripts in `tests/`.
- 0 `Makefile` in repository root.
- 100% of test suites run via `npm test` (Vitest) in < 1.5 seconds.
- Linting runs via `npm run lint` (`tsc --noEmit`).
- Pre-commit and GitHub Actions pass cleanly without `make`.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
