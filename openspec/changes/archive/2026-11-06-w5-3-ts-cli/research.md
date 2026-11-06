# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Roadmap item W5.3:
- Reach full feature parity in TypeScript CLI (`src/commands/init.ts`, `src/commands/check.ts`, `src/commands/verify.ts`) with existing shell scripts (`bin/spec-rails`, `bin/spec-rails-check`, `bin/spec-rails-verify`).
- Implement missing `spec-rails check` in TypeScript: validate Review Gates, branch lane rules, transitive ancestor DAG dependencies, and early task completion.
- Move inline CI "Audit Spec-to-Code Mapping" shell logic into the TypeScript CLI (`audit` command or `check --audit`) so a single implementation owns spec-to-code rules.
- Eliminate dependency on `jq` by parsing OpenSpec JSON natively in Node.js.
- Deprecate `rails.conf` in favor of `spec-rails.config.json`, supporting backward-compatible migration.
- Remove `bin/` shell entry points; route hooks and CI to `npx spec-rails` / `node`.

Existing constraints:
- Node.js >= 18 is the canonical runtime (`NFR-OSA-1` settled in W5.11).
- Package `bin` in `package.json` points to `./dist/cli.js`. Building with `npm run build` compiles `src/cli.ts` to `dist/cli.js`.
- `spec-rails init` must remain idempotent, create canonical configs, install skills, templates, schemas, and git hooks.
- Existing CI workflows (`templates/spec-rails-ci.yml`) and pre-commit hooks currently invoke `sh openspec/spec-rails/spec-rails-check` and `sh openspec/spec-rails/spec-rails-verify`.

## 2. Options Explored
**Option A: Native TypeScript CLI replacing shell scripts.**
- Add `src/commands/check.ts` implementing gate checks, branch checks, DAG checks, and spec-to-code audit natively without `jq`.
- Enhance `src/commands/init.ts` to handle full project scaffolding, schema wiring, skill install, and config creation.
- Enhance `src/commands/verify.ts` to match all legacy verify behavior and read both `spec-rails.config.json` and legacy `rails.conf`.
- Delete `bin/spec-rails`, `bin/spec-rails-check`, `bin/spec-rails-verify`.
- Update CI workflows and hooks to invoke `npx spec-rails check` and `npx spec-rails verify`.
- Update test suite to exercise TypeScript CLI commands.

**Option B: Thin shell wrappers over Node CLI.**
- Keep `bin/*.sh` as 5-line bash forwarding scripts.
- Drawbacks: Contradicts roadmap requirement ("shell scripts removed; no jq"), retains redundant files, and preserves POSIX shell maintenance surface.

## 3. Tradeoff Matrix

| Criteria | Option A (Native TS CLI) | Option B (Thin Shell Wrappers) |
| :--- | :--- | :--- |
| **Complexity** | Moderate (porting check & audit logic to TS) | Low initially, high long-term redundancy |
| **Dependencies** | Removes `jq`; uses existing `cac`, `fast-glob`, `zod` | Retains shell wrappers + `jq` baggage |
| **Performance** | Fast JSON parsing natively in V8 | Overhead of shell subprocess spawning node |
| **Maintenance** | Single TypeScript codebase with Vitest coverage | Dual maintenance across shell and TS |
| **Blast Radius** | `src/`, `bin/`, `templates/`, `tests/` | Partial cleanup |

## 4. Recommendation
Option A: Complete TypeScript port with zero shell wrappers. Native JSON processing, full unit testability, and deletion of `bin/`.

## 5. Breaking Changes & Deprecations
- Shell entry points in `bin/` removed. Projects invoke CLI via `npx spec-rails` or installed package bin.
- `rails.conf` deprecated in favor of `spec-rails.config.json`.
- `jq` no longer required as a prerequisite.

## Review Gate
- [x] **Gate 0 Decision**: Go, Option A.
