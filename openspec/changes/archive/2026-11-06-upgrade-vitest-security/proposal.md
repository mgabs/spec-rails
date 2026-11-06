# Proposal

## Intent
Upgrade `vitest`, `@vitest/coverage-v8`, and related test toolchain devDependencies to current patched versions, eliminating 19 reported security vulnerabilities without impacting runtime CLI behavior.

## Problem Statement
Automated security scans flag 19 vulnerabilities (3 critical, 1 high, 15 moderate/low) in `package-lock.json` across `vitest`, `tinypool`, `vite`, `esbuild`, `launch-editor`, `minimatch`, and `qs`. While none affect the production CLI binary, they fail compliance gates and create false-positive risk alerts in CI.

## Capabilities

### New Capabilities
None. Pure development infrastructure maintenance.

### Modified Capabilities
None. No runtime behavioral requirements change.

## Scope

### In-Scope
- Upgrade `vitest` and `@vitest/coverage-v8` in `package.json` devDependencies.
- Resolve transitive dependency alerts (`tinypool`, `esbuild`, `launch-editor`, `vite`, `minimatch`, `qs`) through updated dependency graph or targeted overrides.
- Verify test suite passes cleanly (`npm test`).
- Verify coverage report works (`npm run test:coverage`).
- Verify Stryker mutation runner remains compatible.
- Verify production build is unaffected (`npm run build`).

### Out-of-Scope (YAGNI)
- Changing test assertions or business logic in existing unit tests.
- Adding runtime dependencies to `package.json`.
- Modifying production CLI commands or distribution outputs.
- Upgrading unrelated tooling (e.g. `typescript`, `tsup`) unless strictly required by the Vitest bump.

## Assumptions
- **ASM-GEN-1**: Upgrading Vitest within supported major/minor bounds preserves runner API compatibility with `@stryker-mutator/vitest-runner`.
- **ASM-GEN-2**: Existing Vitest configurations in `vitest.config.ts` (if any) or defaults remain functional under the upgraded Vitest version.

## Success Metrics
- `npm audit` reports zero critical or high vulnerabilities.
- `npm test` executes all 83 existing unit tests with 100% pass rate.
- `npm run build` succeeds cleanly without type errors.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
