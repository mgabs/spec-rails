# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

- **Problem**:
  1. `spec-rails init` currently succeeds silently if `openspec/` is absent in the target directory, creating `spec-rails.config.json` while skipping all schemas, rules, skills, and hooks. It must fail fast with an actionable error directing the user to run `openspec init` first.
  2. `src/commands/init.ts` copies assets from duplicate root directories (`schemas/spec-rails`, `rules/`, `skills/`, `templates/mutation/`) instead of the canonical single asset tree (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/`).
  3. `package.json` is named `@openspec/spec-rails`, but generated CI workflows and pre-commit hooks invoke `npx spec-rails` (without `--no-install`), risking registry downloads, version mismatches, and leaving legacy `check-lgtm-directives` review hooks and a non-existent `$schema` URL in place.
  4. Newly initialized repositories lack in-repo developer documentation explaining the workflow, gates, commands, and rails.

- **Ground Truth Verified in Codebase**:
  - `src/commands/init.ts`: Line 210 wraps all wiring in `if (fs.existsSync(openspecDir))`, returning a partial success if missing.
  - `src/commands/init.ts`: `findAssetRoot()` looks for `schemas/spec-rails` under root instead of canonical `openspec/schemas/spec-rails/`.
  - `package.json`: Currently `"name": "@openspec/spec-rails"`.
  - `templates/spec-rails-ci.yml` and `generatePreCommitConfig`: Generate `npx spec-rails` without `--no-install` and contain `check-lgtm-directives`.

## 2. Options Explored

### Option A: Pure Canonical Asset Tree & Fail-Fast Hardened `init` (Recommended)
- **Description**:
  - Throw an explicit error immediately if `openspec/` is missing in the target repo: `"OpenSpec repository not detected: 'openspec/' directory is missing. Run 'openspec init' first before running 'spec-rails init'."`
  - Canonicalize asset sources to `openspec/schemas/spec-rails/`, `openspec/spec-rails/`, and `.agents/skills/spec-rails/`.
  - Scaffold developer guide in target repo under `docs/spec-rails/` (`README.md`, `WORKFLOW.md`, `COMMANDS.md`).
  - Rename `package.json` to `spec-rails`, remove bogus `$schema` URL, strip legacy LGTM directive hook, and use `npx --no-install spec-rails` in generated pre-commit and CI templates.
- **Pros**:
  - Eliminates duplicate asset directories and drift.
  - Fails fast and provides clear developer onboarding docs out of the box.
  - `--no-install` guarantees local execution and eliminates network flakiness.
- **Cons**:
  - Requires updating tests in `tests/unit/init.test.ts` to expect fail-fast behavior when `openspec/` is absent.

### Option B: Auto-run `openspec init` on Missing Root
- **Description**:
  - If `openspec/` is missing, run `openspec init` as a child process.
- **Pros**:
  - Single command setup.
- **Cons**:
  - Violates OpenSpec core invariants (never create OpenSpec root as an implicit side effect).
  - Assumes global `openspec` binary configuration.

### Option C: Minimal Fail-Fast Only (No Target Documentation)
- **Description**:
  - Add fail-fast check to `init.ts`, but do not scaffold `docs/spec-rails/` or canonicalize asset paths.
- **Pros**:
  - Smaller code change.
- **Cons**:
  - Leaves duplicate asset trees in place.
  - Leaves newly initialized projects without guidance on how to run gates and rails.

## 3. Tradeoff Matrix

| Criteria | Option A (Canonical Tree & Docs) | Option B (Auto-run openspec init) | Option C (Minimal Fail-Fast) |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low | Medium | Very Low |
| **OpenSpec Alignment** | High (respects boundary) | Low (violates side-effect rule) | Medium |
| **Developer Ergonomics** | High (scaffolds docs, clean CI) | Medium (hidden actions) | Low (missing docs) |
| **Maintenance Burden** | Low (single source of truth) | High | High (duplicate asset drift) |
| **Blast Radius** | Scoped to `init.ts`, templates, unit tests | External system side effects | Partial fix |

## 4. Recommendation

Adopt **Option A**: Implement fail-fast `openspec/` detection, scaffold target docs in `docs/spec-rails/`, canonicalize asset sources to `openspec/` and `.agents/skills/`, rename `package.json` to `spec-rails`, and generate `npx --no-install spec-rails` in pre-commit and CI.

## 5. Breaking Changes & Deprecations

- **`REQ-OSA-21` (Installer Asset Copying)**: Modified to resolve assets from canonical `openspec/schemas/spec-rails/`, `openspec/spec-rails/`, and `.agents/skills/spec-rails/`.
- **`REQ-OSA-43` (init CLI Command)**: Modified to fail fast when `openspec/` is absent, scaffold `docs/spec-rails/`, remove bogus `$schema` URL, and use `npx --no-install spec-rails`.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A - Pure Canonical Asset Tree & Fail-Fast Hardened init).
