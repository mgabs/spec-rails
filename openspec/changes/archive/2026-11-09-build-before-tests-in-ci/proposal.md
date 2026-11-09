# Proposal

## Intent
Make the `CI` workflow (`test.yml`) pass by building the CLI bundle before tests run, and remove the Node 20 deprecation warning from both workflows.

## Problem Statement
CI run 42523028598 fails: `tests/unit/cli.test.ts` spawns `dist/cli.js`, but `test.yml` never runs `npm run build`. Separately, `actions/setup-node@v4` emits a Node 20 deprecation warning in `test.yml` and `spec-rails-ci.yml`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None. CI workflow configuration only; no spec-level behavior change (`skip_specs: true`).

## Scope

### In-Scope
- Add an `npm run build` step before "Run Test Suite" in `.github/workflows/test.yml`.
- Bump `actions/setup-node` from `@v4` to `@v7` in `test.yml` and `spec-rails-ci.yml`.
- Release notes and version (added at user request): bump minor 0.2.0 -> 0.3.0 in `package.json`, `package-lock.json`, `src/cli.ts` (replace the hardcoded `cli.version` with a typed JSON import of `package.json` (`import pkg from "../package.json" with { type: "json" }`), making it the single version source) and the `--version` assertion in `tests/unit/cli.test.ts` (compare against `package.json`, not a literal). No `CHANGELOG.md`/release-notes file exists today, so create `CHANGELOG.md` (Keep a Changelog) with a `0.3.0` entry (CI builds `dist/cli.js` before tests; `setup-node` bumped to `@v7`; docs updated).
- Documentation (added at user request after Gate 2): update `README.md` (Running Tests / CI sections), `docs/WIKI.md`, and `docs/WAY_OF_WORKING.md` to capture every command (`npm ci`, `npm run build`, `npm run lint`, `npm test`, `npm run test:coverage`, `spec-rails check|verify`, `pre-commit run --all-files`) and document the local-to-CI flow, including that `dist/cli.js` must be built before tests. Check `docs/how-tos/*` for stale commands. `docs/WIKI.md` is the wiki; no separate wiki directory exists.

### Out-of-Scope (YAGNI)
- `pretest` script or building inside tests (Options B, C).
- Replacing CI steps with pre-commit (Option D).
- Any change to source or tests beyond the version string; no change to `.pre-commit-config.yaml`.
- Rewriting docs beyond command/flow accuracy; no new docs site or GitHub wiki.
- Git tag or GitHub Release publishing; release notes are a `CHANGELOG.md` entry only.
- Investigating the unlocated CI notice annotation.

## Assumptions
- **ASM-GEN-1**: `actions/setup-node@v7` exists and accepts the existing `node-version: '22'` input unchanged.
- **ASM-GEN-2**: The 3 errors in the run all stem from the missing `dist/cli.js`.

## Success Metrics
- `CI` workflow "Run Test Suite" job passes on a PR.
- No Node 20 deprecation warning from `setup-node` in either workflow.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
