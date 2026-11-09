# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Found by reviewing an uncommitted `spec-rails init` upgrade of `voc-eval` (Python repo, previously on v0.1 shell scripts). Requested: fix defects 1 and 2, make generated hooks/CI not require a pre-installed `openspec` or `spec-rails` in any repo, drop the root `mutmut.ini`, update the stale reference.

Verified facts:
- **Defect 1 (pre-commit)**: `modernizePreCommitConfig` (`src/commands/init.ts`) rewrites `spec-rails-check` with a regex whose tail consumes continuation lines indented 8+ spaces (meant for folded `entry: >-` blocks). Sibling hook keys (`language: system`, `pass_filenames: false`) sit at exactly 8 spaces, so they are deleted, producing an invalid hook. It also drops the blank line after the block. Existing tests do not cover an inline `entry:` followed by sibling keys.
- **Defect 2 (stale CI)**: `init` copies `templates/spec-rails-ci.yml` with `copyFileSafe(..., force)`, so an existing `.github/workflows/spec-rails-ci.yml` is never updated. After the legacy scripts are pruned, `sh openspec/spec-rails/spec-rails-check|verify` in that workflow points at deleted files and CI fails.
- **Install requirement**: the generated hook (`generatePreCommitConfig`, `modernizePreCommitConfig`) and `templates/spec-rails-ci.yml` (lines 42, 58) call `npx --no-install spec-rails ...`, which fails unless `spec-rails` is already a local dependency. `spec-rails` is not published to npm (registry 404), `dist/` is gitignored and there is no `prepare` script, so `npx github:mgabs/spec-rails` also cannot work today. `init` also hard-requires `openspec` on `PATH` >= 1.15.0 (spec `openspec-addon`, installer requirement) and the CI template runs `npm install -g @fission-ai/openspec@1.16.0`.
- **mutmut.ini**: for the python stack `init` copies the preset to the repo root (`src/commands/init.ts` ~322-329, `presetFile: "mutmut.ini"`) in addition to `openspec/spec-rails/mutation/mutmut.ini`. The root copy is redundant; whether `mutmut run` reads a root `mutmut.ini` is unverified (needs a spike).
- **Stale reference**: `rules/WORKFLOW.md:94` and its byte-identical self-copy `openspec/spec-rails/WORKFLOW.md:94` list `rails.conf` and "checks" as contents of `openspec/spec-rails/`, but `init` prunes `rails.conf` and the check/verify scripts. (`templates/rails.conf`, `src/config.ts` legacy fallback and spec REQ-OSA-44 remain as deprecated backward compatibility; out of this fix.)

## 2. Options Explored
- **A. Fix 1/2 in code only; keep `npx --no-install spec-rails`.** Tighten the regex (consume continuation lines only for block scalars, indent > the key indent), and make `init` upgrade a stale `spec-rails-ci.yml` (rewrite legacy `sh openspec/spec-rails/...` invocations or replace the file when it matches the known legacy content). Drop root mutmut.ini and fix WORKFLOW.md. Does NOT satisfy "no installation": hooks/CI still need spec-rails installed.
- **B. Zero-install via on-demand fetch.** Generated hooks/CI call `npx --yes <spec-source>@<pinned version> check|verify`, and CI installs `openspec` itself (`npm i -g @fission-ai/openspec@1.16.0`, already done). `<spec-source>` is either npm (`spec-rails@0.3.0`, requires publishing) or `github:mgabs/spec-rails#v0.3.0` (requires a `prepare: npm run build` script so the bundle is built on install). Includes Option A fixes. Needs a decision on the registry and amends the `openspec-addon` requirements/scenarios that mandate `npx --no-install spec-rails` (hook entry scenarios, lines ~644/649) and the "openspec on PATH" installer check.
- **C. Zero-install via vendoring.** `init` copies the single-file `dist/cli.js` (self-contained, zero runtime deps per spec) into the target at `openspec/spec-rails/cli.js`; hooks/CI run `node openspec/spec-rails/cli.js check|verify`. No registry, no network, version pinned by the committed file; upgrade = re-run `init` (needs `--force`-style refresh of that file). Larger blast radius (~1 MB bundle committed per repo, `files`/packaging, drift vs installed schema) and still requires `openspec` itself for `openspec validate`.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low (regex, upgrade logic, 2 doc/file removals) | Medium (A + pin/version templating, prepare script or npm publish) | Medium-High (A + vendoring, refresh semantics) |
| **New Dependencies** | None | npm registry or GitHub fetch at hook/CI time | None at runtime; 1 MB committed file |
| **Performance & Latency** | Fastest | `npx --yes` fetch/build on cold cache (pre-commit hook slower) | Fast (local node) |
| **Maintenance Burden** | Low | Release process must publish/tag consistently | Upgrade story must keep vendored file current |
| **Blast Radius** | init + templates + docs | init + templates + specs (REQ changes) + packaging/release | init + packaging + specs + target repo size |

## 4. Recommendation
Option B with npm publishing (`npx --yes spec-rails@<pinned>`), as it is the only choice that satisfies "no install in any repo" with a small footprint; if you do not want to publish, use B via `github:` plus a `prepare` build script. Whatever you pick, Option A's code fixes (regex, stale-workflow upgrade, root mutmut.ini, WORKFLOW.md) are required regardless.

Open decisions for you at Gate 0: (1) which option and which source (npm vs github) for B; (2) whether the `openspec` hard check in `init` should become a warning when CI installs it itself; (3) permission to spike whether `mutmut run` reads a root `mutmut.ini` before deleting it.

## 4a. Human Direction (supersedes open decisions above)
- `init` keeps requiring OpenSpec: modify the project's OpenSpec setup if present, otherwise fail with a clear error (no warning downgrade).
- Quality gates belong to the developer: generated hooks/CI must not call or depend on spec-rails (no `npx spec-rails`, no installed package). This replaces Option B/C; effective option is A plus removing spec-rails invocations from generated pre-commit and CI templates (leave gate commands, e.g. tests/mutation, to the developer).
- `init` also generates a TODO file in the target repo (name/location to be fixed in design, e.g. `openspec/spec-rails/TODO.md`) that prompts the developer to set up and run coverage and mutation checks themselves. It is created if absent and never overwritten.
- Upgrade removes all stale artifacts: the `spec-rails-check` hook, `spec-rails-ci.yml`, root `mutmut.ini`, and stale references (`rails.conf`, "checks" in WORKFLOW.md). Keep the code and docs minimal; delete rather than migrate.
- `spec-rails-ci.yml` is kept as a language-agnostic skeleton: commented-out steps for the needed tests (unit, coverage, mutation), no-op/dummy so it does nothing until the developer fills it in, no spec-rails calls. Created if absent; stale versions are replaced.
- Drop mutmut entirely (root and `openspec/spec-rails/mutation/mutmut.ini`, python preset copy, references) along with all other stale items.
- Still open: none.

## 5. Breaking Changes & Deprecations
Modified under `openspec/specs/openspec-addon/spec.md` (exact `REQ-*` keys to be identified in the specs artifact): the requirement defining `spec-rails-check` hook entry as `npx --no-install spec-rails check` (and its scenarios at ~644/649), the CI template requirement invoking `npx --no-install spec-rails`, and the installer requirement that `openspec` be on `PATH` (Option B/C only). Option A alone modifies none, but adds a scenario for inline-entry upgrade and stale-workflow upgrade.

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (name the option) or No-Go before the proposal is drafted. -- Go (human, see 4a)
