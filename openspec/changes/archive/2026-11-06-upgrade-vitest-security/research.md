# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
- **Problem**: 19 security vulnerabilities reported in devDependencies (3 critical in tinypool/vitest UI, 1 high in launch-editor/zod, 15 moderate/low across vite, esbuild, minimatch, qs, @vitest/mocker).
- **Verified Constraints**:
  - `spec-rails` produces a zero-runtime-dependency CLI binary (`dist/cli.js`) bundled with `tsup`.
  - All flagged packages live strictly in `devDependencies`.
  - Current Vitest is locked to `^2.1.8`, coverage at `^2.1.9`.
  - Current Stryker runner is `@stryker-mutator/vitest-runner@^10.1.1` which requires `vitest: >=2.0.0`.
  - Vitest stable line is currently `3.2.7` (v3), `4.1.12` (v4), `5.1.0` (v5).

## 2. Options Explored
- **Option A (Major Upgrade to Vitest 3.x / 4.x / 5.x)**: Bump `vitest` and `@vitest/coverage-v8` to latest patched stable releases. Update configuration if breaking runner API changes exist.
  - *Pros*: Directly clears upstream CVEs in `vitest`, `tinypool`, `vite`, `esbuild`. Keeps test stack modern.
  - *Cons*: Potential breaking changes in coverage or test environment APIs; must verify Stryker mutator runner compatibility.
- **Option B (Transitive Overrides / npm audit fix)**: Use `package.json` overrides / resolutions for vulnerable sub-dependencies (`tinypool`, `esbuild`, `qs`, `minimatch`) while holding `vitest@2.1.8`.
  - *Pros*: Zero changes to Vitest config or test files.
  - *Cons*: Brittle peer-dependency mismatches; overrides can break internal Vitest worker protocol.
- **Option C (Status Quo / Documented Risk Acceptance)**: Accept dev-only risk since no dev servers are exposed and production binary is unaffected.
  - *Pros*: Zero effort, zero regression risk.
  - *Cons*: Fails automated CI security scanners and Dependabot alerts.

## 3. Tradeoff Matrix

| Criteria | Option A (Major Toolchain Upgrade) | Option B (Transitive Overrides) | Option C (Status Quo / Waiver) |
| :--- | :--- | :--- | :--- |
| **Complexity** | Moderate (config verification) | High (dependency conflict risk) | Nil |
| **New Dependencies** | None (version bumps) | None (overrides) | None |
| **Performance & Latency** | Neutral / slightly faster | Neutral | Neutral |
| **Maintenance Burden** | Low (aligns with upstream) | High (custom overrides rot) | High (alert noise in CI) |
| **Blast Radius** | devDependencies & test harness | npm dependency graph | Nil |

## 4. Recommendation
Adopt Option A: Upgrade Vitest and coverage to the clean major line that preserves Stryker test-runner compatibility, resolving the CVEs at the source without fragile overrides.

## 5. Breaking Changes & Deprecations
None. No runtime requirements (`REQ-*` or `NFR-*`) in `openspec/specs/` are affected because the change is isolated strictly to development tooling.

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (Option A) or No-Go before the proposal is drafted.
