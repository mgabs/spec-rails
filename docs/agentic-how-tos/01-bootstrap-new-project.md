# Agentic How-To 01: Bootstrap Spec-Rails in a Project

## Purpose
Install or refresh Spec-Rails in a repository so the gated workflow, CLI-free `openspec-*` skills, pre-commit hooks, CI skeleton and these runbooks are present. Also the procedure for repos that already ran an older spec-rails.

## Preconditions
- Node.js >= 18 and a git repository (`git rev-parse --show-toplevel` succeeds).
- Working tree clean (`git status --short` prints nothing) and you are **not** on `main`/`master`.
- Only when `openspec/` does **not** exist yet: the pinned `openspec` CLI on `PATH`, same major.minor as the repo's `openspec-version` pin (`openspec --version`). Once `openspec/` exists, `init` never calls `openspec`.
- Optional: `pre-commit` installed (`pre-commit --version`) so hooks are installed automatically.

## Steps

1. Create the lane branch (bootstrap is a chore):
   ```bash
   git checkout -b chore/bootstrap-spec-rails
   ```
2. Run the only command, in the repo root or against a directory:
   ```bash
   npx spec-rails init [dir] [--tools agents,github-copilot,claude]
   ```
   `--tools` (default `agents`) is forwarded to `openspec init` and only matters when `openspec/` is absent. It accepts letters, digits, `-` and `,` only.
3. Read the log: one line per `created`, `updated`, `removed` or `skipped` path. Lines noting "still requires the openspec CLI (no port)" are generated workflows that were left untouched.
4. Confirm what was written:
   ```text
   Makefile                              placeholder lint/test/coverage/mutation targets (echo only; only if absent)
   .gitignore                            .worktrees/ appended
   .pre-commit-config.yaml               branch protection + lint/test hooks calling `make lint` / `make test`
   .github/workflows/spec-rails-ci.yml   inert CI skeleton (commented steps + no-op Placeholder step)
   .agents/skills/spec-rails/SKILL.md    agent skill
   openspec/config.yaml                  schema: spec-rails (other keys preserved)
   openspec/schemas/spec-rails/          schema + artifact templates
   openspec/spec-rails/                  WORKFLOW.md, AGENTS.md, bug-report.md, TODO.md
   docs/agentic-how-tos/                 these runbooks (managed, refreshed every run)
   ```
   Generated explore/propose/apply/archive/sync/update skills, commands and prompts (any agent layout) now carry CLI-free bodies.
5. Verify the key facts:
   ```bash
   grep -n "^schema:" openspec/config.yaml        # schema: spec-rails
   ls docs/agentic-how-tos                        # README.md and 01-05 runbooks
   grep -c "TODO" Makefile                        # placeholder echoes are still there until you replace them
   ```
6. Replace the placeholders (this is project work, do it with the human):
   - `Makefile`: put the real linter in `lint`, unit tests in `test`, coverage (>= 95% line and branch) in `coverage`, mutation testing (>= 95% kill) in `mutation`.
   - `.pre-commit-config.yaml`: hooks exist only for targets that existed in the Makefile; add `coverage`/`mutation` hooks (`entry: make coverage`, `language: system`, `pass_filenames: false`) if the human wants them on commit.
   - `.github/workflows/spec-rails-ci.yml`: uncomment and fill the toolchain, test, coverage and mutation steps, then delete the no-op `Placeholder` step.
   - Tick items in `openspec/spec-rails/TODO.md`; delete it only when all are done.
7. Install and run the hooks:
   ```bash
   pre-commit install
   pre-commit run --all-files
   ```
8. Commit on the chore branch and merge fast-forward:
   ```bash
   git add -A
   git commit -m "chore: initialize Spec-Rails"
   git checkout main
   git merge --ff-only chore/bootstrap-spec-rails
   git branch -d chore/bootstrap-spec-rails
   ```
   If the pre-commit `branch-protection` hook blocks you, you are committing on `main`; go back to step 1.

## Re-running and upgrading
- `npx spec-rails init` again is idempotent: a converged repo reports only `skipped`. It refreshes managed files (schema, WORKFLOW/AGENTS, skill, `docs/agentic-how-tos/*`) and never overwrites your Makefile, TODO, CI or edited hooks.
- To pick up new runbooks or rules from a newer spec-rails: update the package, re-run `npx spec-rails init`, review `git diff`, commit on a `chore/` branch.
- Upgrading OpenSpec: run `openspec update`, then `npx spec-rails init` to restore the CLI-free skill bodies. Skipping `init` leaves skills that need the CLI.
- Legacy files from older installs (old config/rails/mutation files, old gate hooks, `opsx-*` skills under `.github/skills`) are deleted by `init` and logged as `removed`.

## Expected result
- Second `npx spec-rails init` prints only `skipped` lines and `git status` is clean.
- `pre-commit run --all-files` passes; with the placeholder Makefile `lint`/`test` hooks just echo TODO lines.

## Failure modes
| Symptom | Cause | Fix |
| :-- | :-- | :-- |
| `The openspec CLI <ver> is required ... not found on PATH` | `openspec/` absent and CLI missing | Install the pinned version, or create the project through OpenSpec first, then re-run |
| `openspec <found> found on PATH but spec-rails requires <pin>` | major.minor mismatch | Install the matching minor version |
| `Refusing to write through symlink: <path>` | A managed target path is a symlink | Replace the symlink with a real file/dir, re-run |
| `Invalid --tools value` | Characters outside `[A-Za-z0-9,-]` | Use e.g. `agents,claude` |
| `Target directory does not exist/is not writable` | Wrong path or permissions | Fix the path |
| Hooks not installed | `pre-commit` CLI absent | Install it, run `pre-commit install` |
| A runbook is missing in `docs/agentic-how-tos/` | Older spec-rails | Re-run `npx spec-rails init` |
| Skills still call `openspec` | Skills regenerated by `openspec update` | Re-run `npx spec-rails init` |

## Hard rules for agents
- [ ] Do the bootstrap on a `chore/` branch, never on `main`/`master`.
- [ ] Do not hand-create `openspec/`; let `openspec init` (via `init`) create it.
- [ ] Do not edit managed files (`openspec/spec-rails/*`, `openspec/schemas/spec-rails/*`, `docs/agentic-how-tos/*`, `.agents/skills/spec-rails/SKILL.md`); the next `init` overwrites them.
- [ ] Do not leave the echo-only `Makefile` targets, CI `Placeholder` step or TODO.md unreported: tell the human which quality gates are still placeholders.
- [ ] Never bypass hooks with `--no-verify`.
- [ ] Next: [02 Drive a feature](02-drive-feature-lifecycle.md), [05 Configure agents](05-configure-ai-agents.md).
