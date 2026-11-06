# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Three decisions from exploration (author-confirmed):
1. Node only: no shell trampoline and no shell fallback; `bin/` shell scripts go away, `dist/cli.js` is the only entry point.
2. `NFR-OSA-1` is reworded as a distribution NFR (single-file bundle, zero runtime deps) with the prerequisites stated (Node >= 18, OpenSpec, no `jq`).
3. `NFR-OSA-5` stays at 95% mutation kill; contradicting wording elsewhere is fixed.

Verified in the repo:
- Living `NFR-OSA-1` already says Node >= 18, single-file `dist/cli.js`, no `jq`, and "shell scripts in `bin/spec-rails` MUST serve as lightweight trampolines". The trampoline clause is the part being dropped.
- Reality lags the spec: `bin/spec-rails-check` still needs `jq`; `bin/spec-rails` is 389 lines of shell that execs `node dist/cli.js` only when it exists; the TS CLI has `init` and `verify` but no `check`; `dist/` is not built.
- `tsup.config.ts` bundles `zod`, `cac`, `fast-glob` (`noExternal`), yet `package.json` lists them under `dependencies`, not `devDependencies`.
- Adopter-facing entry points call shell: `templates/.pre-commit-config.yaml`, `templates/spec-rails-ci.yml`, `.github/workflows/spec-rails-ci.yml` and the hook written by `bin/spec-rails` run `sh openspec/spec-rails/spec-rails-check|verify`; the installer copies those two scripts, and `tests/test_selfcopy.sh` pairs them with `bin/`.
- Seven test scripts run `bin/*` directly.
- Mutation threshold is inconsistent three ways: living `NFR-OSA-5` and the pending `w5-2` delta say >= 95%; `rules/`, `skills/`, templates, `docs/` say > 90%; `schemas/spec-rails/schema.yaml:112` and `templates/design.md:19` say 100%.

## 2. Options Explored
**Option A: Spec-only change now (rewrite `NFR-OSA-1`, fix thresholds and deps; W5.3 later removes `bin/`).** Spec states the end state; code catches up in W5.3.

**Option B: Full Node-only now (also port `check` to TS, delete `bin/`, switch hook and CI to `npx spec-rails`).** Large; that is W5.3.

**Option C: Keep the trampoline as spec'd.** Rejected by the author.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low: spec, docs, templates, `package.json` | High: TS `check`, installer rewrite, 7 test scripts to vitest | Low |
| **New Dependencies** | None; moves 3 to devDependencies | `npx` in hooks and CI | None |
| **Performance & Latency** | None | Node startup in the pre-commit hook | None |
| **Maintenance Burden** | Low; removes a spec/code contradiction | Lowest after finish | Highest: two implementations |
| **Blast Radius** | Docs, schema, templates, selfcopy, `package.json` | Everything adopters call | Docs only |

## 4. Recommendation
Option A now; Option B stays W5.3. The spec change is small, removes the trampoline contradiction and the 90/95/100 drift, and does not break the shell scripts that adopters run today.

## 5. Breaking Changes & Deprecations
- MODIFIED `NFR-OSA-1`: drops the trampoline sentence; adds explicit prerequisites (Node >= 18, OpenSpec on PATH, no `jq`).
- MODIFIED `NFR-OSA-5`: unchanged at >= 95%; coordinate with the pending `w5-2` delta, which restates it (archive `w5-2` first or keep the wording identical).
- No requirement removed. README prerequisites and `rules/WORKFLOW.md` §7 still say `jq`; they stay accurate until W5.3 and are noted in the proposal as deferred.

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (name the option) or No-Go before the proposal is drafted.
