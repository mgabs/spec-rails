# How-To: Bootstrap a Project with Spec-Rails

This guide walks through installing Spec-Rails on an OpenSpec project.

> **Prerequisites**: Node.js ≥ 18, plus the pinned `openspec` CLI (the version in `openspec-version`, same major.minor) on `PATH` **only if** the project has no `openspec/` yet. `init` then runs `openspec init --tools <list>` for you. The installer is idempotent, sets `schema: spec-rails` in `openspec/config.yaml`, rewrites the generated workflow skills to be CLI-free, scaffolds `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml`, and installs the agent skill in `.agents/skills/spec-rails/`.

---

## 1. Run the Initializer

From within your project directory:

```bash
npx spec-rails init
```

Or target a specific directory:

```bash
npx spec-rails init /path/to/your-project --tools agents,github-copilot,claude
```

---

## 2. Verify Wiring

The command wires the project:

```text
your-project/
├── Makefile                            # Placeholder lint/test/coverage/mutation targets (echo only; created if absent)
├── .gitignore                          # Appends .worktrees/ if not present
├── .pre-commit-config.yaml             # Branch protection + lint/test hooks (call `make lint`/`make test`)
├── .agents/skills/spec-rails/SKILL.md  # Auto-installed Spec-Rails agent skill
├── .github/workflows/spec-rails-ci.yml # Inert CI skeleton; fill in your stack
└── openspec/
    ├── config.yaml                     # schema: spec-rails (other keys preserved)
    ├── schemas/spec-rails/             # Schema + artifact templates
    └── spec-rails/                     # WORKFLOW.md, AGENTS.md, bug-report.md
```

Agent runbooks (index plus 01–05: bootstrap, feature lifecycle, parallel worktrees and bake-off, bugfix, agent configuration) are copied to `docs/agentic-how-tos/`. They are managed: refreshed on every `init` run, and existing repos get new ones by re-running `npx spec-rails init`. Agent-facing version of this guide: [docs/agentic-how-tos/01-bootstrap-new-project.md](../agentic-how-tos/01-bootstrap-new-project.md).

Bug reports go in `docs/bug-reports/`. Create changes afterwards with `/opsx-propose` (CLI-free), normalizing work item dots to hyphens (`W1.2` → `w1-2-<slug>`; see [How-To 2](02-drive-feature-lifecycle.md)).

---

## 3. Install Pre-Commit Hooks

Install the git hooks into `.git/hooks/`:

```bash
pre-commit install
```

Verify that hooks run cleanly on all files:

```bash
pre-commit run --all-files
```

---

## 4. Configure Your Project Rails

Spec-Rails does not run your quality gates. Follow `openspec/spec-rails/TODO.md`:
- **Makefile** (repo root, created only if absent): `lint`, `test`, `coverage` and `mutation` targets that only echo what to implement. Replace each echo with your stack's real command;
- **Pre-commit** (`.pre-commit-config.yaml`, `repo: local` block): the `lint` and `test` hooks run `make lint` / `make test` (a hook is only generated if the Makefile defines that target); add coverage and mutation hooks next to them calling `make coverage` / `make mutation`;
- **CI** (`.github/workflows/spec-rails-ci.yml`, job `rails`): uncomment and fill the commented steps (toolchain, unit tests, coverage $\ge 95\%$, mutation $\ge 95\%$ kill), then delete the no-op `Placeholder` step;
- **Checklist**: tick items in `openspec/spec-rails/TODO.md` and delete it when done.

Re-run `npx spec-rails init` any time; it never overwrites those edits.

**Upgrading OpenSpec**: run `openspec update`, then `npx spec-rails init` to restore the CLI-free skill bodies.

---

## 5. Commit Baseline (via Chore Branch)

```bash
git checkout -b chore/bootstrap-spec-rails
git add openspec/ .agents/ .github/ .gitignore .pre-commit-config.yaml
git commit -m "chore: initialize Spec-Rails workflow and testing rails"
git checkout main
git merge --ff-only chore/bootstrap-spec-rails
git branch -d chore/bootstrap-spec-rails
```
