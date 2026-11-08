# How-To: Bootstrap a Project with Spec-Rails

This guide walks through installing Spec-Rails on an OpenSpec project.

> **Prerequisites**: run `openspec init` first (OpenSpec ≥ 1.15.0 on `PATH`) and have Node.js ≥ 18 installed. The installer is idempotent, sets `schema: spec-rails` in `openspec/config.yaml`, writes `spec-rails.config.json` with detected stack defaults, scaffolds `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml`, and installs the agent skill in `.agents/skills/spec-rails/`.

---

## 1. Run the Initializer

From within your project directory:

```bash
npx spec-rails init
```

Or target a specific directory:

```bash
npx spec-rails init /path/to/your-project
```

---

## 2. Verify Wiring

The command wires the project:

```text
your-project/
├── .gitignore                          # Appends .worktrees/ if not present
├── .pre-commit-config.yaml             # Scaffolds branch protection & spec-rails-check
├── .agents/skills/spec-rails/SKILL.md  # Auto-installed Spec-Rails agent skill
├── .github/workflows/spec-rails-ci.yml # CI rails + gate/lane check
├── spec-rails.config.json              # Stack configuration & command definitions
└── openspec/
    ├── config.yaml                     # schema: spec-rails (other keys preserved)
    ├── schemas/spec-rails/             # Schema + artifact templates
    └── spec-rails/                     # WORKFLOW.md, AGENTS.md, bug-report.md
```

Optional: copy `templates/roadmap.md` from the spec-rails repo to `docs/ROADMAP.md` if you track delivery status; bug reports go in `docs/bug-reports/`. These are project data, so they live in `docs/`, not under `openspec/` (see the Wiki, §1.6). Create changes afterwards with `openspec new change <id>-<slug>`, normalizing roadmap dots to hyphens (`W1.2` → `w1-2-<slug>`; see [How-To 2](02-drive-feature-lifecycle.md)).

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

The installer auto-detects your stack (`ts`, `python`, `go`, `rust`) and configures `spec-rails.config.json`:

```json
{
  "stack": "ts",
  "strict": true,
  "testCommand": "npm test",
  "coverageCommand": "npm run test:coverage",
  "coverageMinScore": 95,
  "mutationCommand": "npx stryker run",
  "mutationMinScore": 95
}
```

`npx spec-rails verify` runs these commands in CI:
- Requires each `REQ-*`/`NFR-*` key of an active change to appear in a discovered test file.
- Requires ticked Red/Green/Coverage/Mutation tasks to carry an `Evidence: <note>`.
- Enforces exit code 0, coverage threshold ($\ge 95\%$), mutation threshold ($\ge 95\%$), and execution timeout (10m).

---

## 5. Commit Baseline (via Chore Branch)

```bash
git checkout -b chore/bootstrap-spec-rails
git add openspec/ .agents/ .github/ .gitignore spec-rails.config.json .pre-commit-config.yaml
git commit -m "chore: initialize Spec-Rails workflow and testing rails"
git checkout main
git merge --ff-only chore/bootstrap-spec-rails
git branch -d chore/bootstrap-spec-rails
```
