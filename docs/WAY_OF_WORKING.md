# Spec-Rails Way of Working (WoW)

> **Spec-Driven, Testing-Railed Development**: a short handbook. The authoritative gate-by-gate protocol is [`WORKFLOW.md`](../rules/WORKFLOW.md) (installed as `openspec/spec-rails/WORKFLOW.md`); this page summarizes it and documents the tooling.

> **Where things live**: the gate-by-gate protocol ships with the addon as `openspec/spec-rails/WORKFLOW.md`; change artifacts live in `openspec/changes/<id>-<slug>/`; delivery status (`docs/ROADMAP.md`) and bug reports (`docs/bug-reports/`) live in `docs/`. See [Wiki §1.6](WIKI.md#16-where-things-live-and-why-docs). Agents follow the step-by-step runbooks in [agentic-how-tos/](agentic-how-tos/README.md) (copied into target repos as `docs/agentic-how-tos/` by `init`; re-run `npx spec-rails init` in existing repos to refresh them).

---

## 1. Core Invariants

1. **`main` is immutable to direct edits**: every commit lands through a lane branch (`--ff-only` locally, or a pull request).
2. **Code is a liability**: the smallest diff that satisfies the requirements and passes all rails wins (strict YAGNI, boring over clever, minimal blast radius, ruthless deletion).
3. **No untested code**: Red before Green; >= 95% line and branch coverage and >= 95% mutation score on domain logic.
4. **Specs are living truth**: they live in `openspec/specs/` and change only through OpenSpec delta specs merged at archive time.

## 2. Lanes and Gates

Feature (`feat/`, Gates 0–4), bugfix (`fix/`, Gates B1–B3) and chore (`chore/`, no gates) lanes are defined in [WORKFLOW.md](../rules/WORKFLOW.md); runbooks are in [agentic-how-tos/](agentic-how-tos/README.md). A human ticks each Review Gate; agents never self-approve.

---

## 3. Verification Rails & Pre-Commit Standards

Every repository initialized with `spec-rails` contains active pre-commit and CI verification rails.

- Pre-commit hooks run on every `git commit`. **Zero bypass**: `git commit --no-verify` / `-n` is strictly forbidden; fix the defect instead.

### Command Reference
How to use the tooling by hand; the CI/CD Pipeline below shows when each command runs automatically.

| Command | Purpose |
| :--- | :--- |
| `npm ci` | Install pinned dependencies |
| `npm run build` | Bundle `dist/cli.js` with tsup (MUST precede tests: `tests/unit/cli.test.ts` spawns the bundle) |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm test` | Vitest suite |
| `npm run test:coverage` | Vitest with coverage (>= 95%) |
| `make lint` / `make test` / `make coverage` / `make mutation` | In a target repo: placeholder targets from the `Makefile` that `init` creates when absent; replace the echoes with your stack's commands. Pre-commit calls `lint` and `test` |
| `npx spec-rails init [dir] [--tools <list>]` | The only command. Bootstraps `openspec/` through the pinned local `openspec init --tools <list>` when absent (default tools `agents`), then installs Spec-Rails and rewrites the generated workflow skills to be CLI-free. Idempotent: a second run changes nothing; legacy artifacts are removed and developer-edited hooks, CI and TODO are preserved. Needs `openspec` (version in `openspec-version`) only when `openspec/` is absent |
| `openspec update` then `npx spec-rails init` | Upgrade OpenSpec in a target repo; `init` restores the CLI-free skill bodies |
| `npm run sync:self` | Maintainers only: copy `rules/`, `skills/`, `schemas/` and the bug-report template into this repo's own `openspec/` and `.agents/` copies. Missing files are created; drifted files are kept and reported (exit 1) unless you pass `-- --force` |
| `node scripts/upgrade-openspec.mjs <version>` | Maintainers only: refresh `vendor/openspec/<version>/`, print the skill diff to port into `skills/ports/` |
| `pre-commit run --all-files` | Run every local hook |

### CI/CD Pipeline
How the same checks run automatically, from commit to pull request.
```
git commit -> pre-commit: branch-protection -> build-cli -> lint -> test
PR            -> CI (test.yml):           npm ci -> build -> lint -> test
              -> Rails (spec-rails-ci.yml): npm ci -> build -> pre-commit run --all-files
```
- **Build before test**: `dist/cli.js` must exist before `npm test`, because `tests/unit/cli.test.ts` spawns the bundle. On a clean checkout the `--version`/`--help` tests otherwise fail with `Cannot find module dist/cli.js`.
- **Mirror CI locally**: run `pre-commit run --all-files` before pushing to catch CI failures early.

### Mutation Testing Rails
- **>= 95% mutation score** on domain logic. Configure the mutation tool for your stack in your own commands and CI (see `openspec/spec-rails/TODO.md`).

---

## 4. Anti-Patterns & Hard Prohibitions

| Violation | Why It Is Forbidden | Remedy |
| :--- | :--- | :--- |
| **Direct commit on `main`** | Contaminates production, bypasses rebase verification | Enforced by pre-commit hook; checkout dedicated lane branch |
| **Committing Red tests alone** | Leaves broken commits in git history, breaks bisecting | Commit Red test together with Green implementation |
| **Full-copy spec duplicates** | Duplicates ground truth and drifts from OpenSpec | Delta specs merged by `openspec archive` at Gate 4 |
| **Unjustified surviving mutants** | Surviving mutants prove missing assertions or dead code | Kill mutant with test, delete dead code, restructure, or justify in PR |
| **Subagent gate self-approval** | Eliminates human-in-the-loop safety | Halt and escalate to human reviewer for sign-off |
| **Stale worktrees lingering** | Causes `.git/index.lock` collisions and disk bloat | Run `git worktree remove` and `git worktree prune` after every merge |
| **Unsolicited architecture** | Violates YAGNI, inflates maintenance cost | Build only what is specified; delete speculative code |

---
