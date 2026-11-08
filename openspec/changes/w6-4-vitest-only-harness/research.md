# Research & Technical Tradeoffs: Vitest-Only Harness & Dead Code Deletion (W6.4)

## 1. Intent & Ground Truth
- **Current State**: The repository currently maintains a dual test harness: 10 TypeScript Vitest test suites (`tests/unit/*.test.ts`) and 9 legacy bash scripts (`tests/*.sh`) orchestrated by `Makefile`.
- **Verified Facts**:
  - `tests/unit/` already has comprehensive unit and lifecycle tests covering CLI parsing, check, verify, init, config, rails, paths, audit, evidence, and full workflow lifecycle (`tests/unit/workflow.test.ts`).
  - The 9 legacy bash scripts (`test_check.sh`, `test_schema.sh`, `test_selfcopy.sh`, `test_e2e.sh`, `test_installer.sh`, `test_ci_audit.sh`, `test_verify.sh`, `test_lint.sh`, `check_hygiene.sh`) run in ~500ms via `sh` and `grep`/`sed`, but introduce OS portability friction (macOS vs GNU sed/grep), require `make`, and duplicate tests already largely covered in TypeScript.
  - Vitest is already installed (`vitest@5.1.0`), configured with coverage and mutation testing (`@stryker-mutator/vitest-runner`), and runs in <1s.
  - Requirement traceability tags (`REQ-OSA-*`) currently live partially in bash comments (`# REQ-OSA-1`) and partially in Vitest titles (`describe("... REQ-OSA-1 ...")`).

## 2. Options Explored

### Option A: Complete Shell Test Deletion & Pure Vitest Unification (Recommended)
- Port remaining unique assertions from `tests/*.sh` into native TypeScript Vitest suites (`tests/unit/schema.test.ts`, `tests/unit/hygiene.test.ts`, `tests/unit/selfcopy.test.ts`).
- Ensure all living spec requirement keys (`REQ-OSA-1..50`, `NFR-OSA-1..9`) are explicitly tagged in Vitest test suite descriptions.
- Delete all 9 `tests/*.sh` scripts and `Makefile`.
- Update `package.json` (`npm test`, `npm run lint`), `.pre-commit-config.yaml`, `.github/workflows/test.yml`, and `README.md`.

### Option B: Keep Makefile Wrapper Around Vitest
- Delete shell scripts, but retain a minimal `Makefile` that delegates `make test` to `npm test` and `make lint` to `npm run lint`.
- Cons: Leaves legacy `Makefile` dependency when Node projects idiomatically use `npm test` / `npx`.

### Option C: Retain Shell Scripts as Ancillary CI-Only Checks
- Keep shell scripts in `tests/legacy/` and run them only in GitHub Actions.
- Cons: Violates YAGNI and Wave 6 simplification goals; perpetuates dual-harness maintenance debt.

## 3. Tradeoff Matrix

| Criteria | Option A (Pure Vitest) | Option B (Makefile Wrapper) | Option C (Keep Ancillary Shell) |
| :--- | :--- | :--- | :--- |
| **Complexity** | Minimal (single JS/TS runtime) | Low (extra build file) | Medium (two test runtimes) |
| **New Dependencies** | 0 (Vitest already installed) | 0 | 0 |
| **Performance & Latency** | < 1.5s total test execution | < 1.5s total test execution | ~2.5s execution |
| **Maintenance Burden** | Minimal (one runner, one syntax) | Low | High (cross-platform bash + node) |
| **Blast Radius** | Low (internal test runner & CI) | Low | None |

## 4. Recommendation
Go with **Option A**. Port remaining unique assertions from `tests/*.sh` into `tests/unit/` (`schema.test.ts`, `hygiene.test.ts`), verify all `REQ-OSA-*` tags, delete `tests/*.sh` and `Makefile`, and switch CI & pre-commit directly to `npm test` and `npm run lint`.

## 5. Breaking Changes & Deprecations
- **Makefile**: Dropped. Target repositories and development workflows use `npm test` and `npm run lint`.
- **REQ-OSA-22, REQ-OSA-23, REQ-OSA-24, REQ-OSA-30**: Assertions moved from shell scripts to native TypeScript Vitest tests.

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (Option A) or No-Go before the proposal is drafted.
