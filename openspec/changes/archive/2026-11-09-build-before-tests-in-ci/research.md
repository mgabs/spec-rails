# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
- CI run 42523028598 (job "Run Test Suite") fails: `tests/unit/cli.test.ts` (lines ~122-129, `cliPath = path.resolve("dist/cli.js")`) spawns the built bundle via `execFileSync`, but `dist/` does not exist.
- `.github/workflows/test.yml` runs `npm ci`, `npm run lint`, `npm test` with no `npm run build` step.
- `.github/workflows/spec-rails-ci.yml` already runs `npm ci && npm run build` before using `dist/cli.js`, so it is unaffected.
- `dist/` is a build artifact; the spec (`openspec-addon`, `dist/cli.js` bundle requirements) treats the bundle as the single executable entry point, so testing the real bundle is intentional.
- Locally the tests pass only because `dist/` was previously built (also via the `build-cli` pre-commit hook).

- Scope addition (confirmed by user): the run also warns that `actions/setup-node@v4` targets the deprecated Node 20 runtime. It is used in `test.yml` and `spec-rails-ci.yml`; latest release is v7.1.0, so bump both to `@v7`.

## 2. Options Explored
- **A. Add `npm run build` step to `test.yml` before tests.** One CI line; no behavior change for local runs.
- **B. `"pretest": "npm run build"` in package.json.** Fixes CI and clean local checkouts; every `npm test` (and watch/coverage variants) pays build cost.
- **C. Build inside the test (`beforeAll`).** Self-contained, but hides a slow build in unit tests and couples tests to tsup.
- **D. Make pre-commit the single source of truth for CI (user-requested).** `.pre-commit-config.yaml` already orders `build-cli` -> `check` -> `verify` -> `lint` -> `test`. Replace the Lint/Test steps in `test.yml` with `pip install pre-commit && SKIP=branch-protection pre-commit run --all-files` (`branch-protection` must be skipped because `test.yml` also runs on pushes to main). Local hooks and CI then cannot drift. Cons: `spec-rails-check`/`verify` need `openspec` on PATH and a base ref (`check` uses BASE_REF/HEAD_REF in `spec-rails-ci.yml`), so either skip them in `test.yml` (they already run in `spec-rails-ci.yml`) or accept duplicate work; also add Python setup.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C | Option D |
| :--- | :--- | :--- | :--- | :--- |
| **Complexity** | 1 workflow line | 1 script line | test code + exec of tsup | rewrite test.yml steps, SKIP list |
| **New Dependencies** | None | None | None | pre-commit (python) in CI |
| **Performance & Latency** | +build in CI only | +build on every test run | +build on every test run | +build in CI; duplicate hooks if not skipped |
| **Maintenance Burden** | Low; mirrors spec-rails-ci.yml | Low | Medium | Lowest long-term (one hook list) |
| **Blast Radius** | CI only | All `npm test` users | Test suite | CI only |

## 4. Recommendation
Option A: add an `npm run build` step before "Run Test Suite" in `test.yml`. YAGNI-first; fixes the failure where it originates. Also bump `actions/setup-node` to `@v7` in both workflows.

## 5. Breaking Changes & Deprecations
None. No `REQ-*` / `NFR-*` in `openspec/specs/` is modified, superseded or deprecated (CI workflow only; `dist/cli.js` requirements unchanged).

## Review Gate
- [x] **Gate 0 Decision**: Go - Option A (plus `setup-node` bump to `@v7`), decided by the human. Option D (pre-commit in CI) not chosen.
