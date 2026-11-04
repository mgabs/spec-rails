# How-To: Bootstrap a Project with Spec-Rails

This guide walks through installing Spec-Rails on an OpenSpec project.

> **Prerequisites**: run `openspec init` first (OpenSpec ≥ 1.15.0 on `PATH`) and install `jq`. The installer exits non-zero and writes nothing otherwise. It is idempotent, sets `schema: spec-rails` in `openspec/config.yaml`, never overwrites an existing `.pre-commit-config.yaml`, and puts agent rules in `openspec/spec-rails/` so `openspec update` leaves them alone.

---

## 1. Run the Initializer

From the `spec-rails` repository, run:

```bash
/path/to/spec-rails/bin/spec-rails /path/to/your-project
```

Or from within your project directory:

```bash
/path/to/spec-rails/bin/spec-rails .
```

---

## 2. Verify Wiring

The command wires the project (it does not create `specs/`):

```text
your-project/
├── .gitignore                          # Appends .worktrees/ if not present
├── .pre-commit-config.yaml             # Created only if absent
├── .agents/skills/spec-rails/SKILL.md  # Auto-installed Spec-Rails agent skill
├── .github/workflows/spec-rails-ci.yml # CI rails + gate/lane check
├── .git/hooks/pre-commit               # Branch protection, LGTM directives, spec-rails-check
└── openspec/
    ├── config.yaml                     # schema: spec-rails (other keys preserved)
    ├── schemas/spec-rails/             # Schema + artifact templates
    └── spec-rails/                     # WORKFLOW.md, AGENTS.md, rails.conf, spec-rails-check, spec-rails-verify, bug-report.md, mutation/
```

Optional: copy `templates/roadmap.md` from the spec-rails repo to `docs/ROADMAP.md` if you track delivery status; bug reports go in `docs/bug-reports/`. These are project data, so they live in `docs/`, not under `openspec/` (see the Wiki, §1.6). Create changes afterwards with `openspec new change <id>-<slug>`, normalizing roadmap dots to hyphens (`W1.2` → `w1-2-<slug>`; see [How-To 2](02-drive-feature-lifecycle.md)).

**Try it in a new repo**: [tests/test_e2e.sh](../../tests/test_e2e.sh) does steps 1–2 in a throwaway repo with the real OpenSpec CLI (`openspec init`, the installer, `openspec new change`) and checks that the `spec-rails` schema resolves and that the hook blocks a commit while an upstream Review Gate is unticked. Run it with `make test-e2e`.

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

Add testing rails to your project's task runner (e.g. `Makefile`, `package.json`, `Cargo.toml`, or `pyproject.toml`):

1. **Test Runner**: Command to run unit and BDD tests.
2. **Coverage Threshold**: Command to enforce $\ge 95\%$ line & branch coverage.
3. **Mutation Testing**: Command to execute mutation analysis on core domain logic.

Example `Makefile` targets:

```makefile
test:
	@# Run BDD and unit tests
	pytest tests/

coverage:
	@# Enforce >= 95% line & branch coverage
	pytest --cov=src --cov-fail-under=95 --cov-branch

mutants:
	@# Verify >= 95% mutation kill score on core logic
	mutmut run
```

Then point CI at them in `openspec/spec-rails/rails.conf` (created by the installer, never overwritten). `spec-rails-verify` runs these in CI only:

```sh
RAILS_TEST_DIRS="tests"
RAILS_TEST="make test"
RAILS_COVERAGE="make coverage"
RAILS_MUTATION="make mutants"
```

It also requires each `REQ-*`/`NFR-*` key of an active change to appear in a test file, and ticked Red/Green/Coverage/Mutation tasks to end with `Evidence: <command and result>`.

---

## 5. Commit Baseline (via Chore Branch)

```bash
git checkout -b chore/bootstrap-spec-rails
git add openspec/ .agents/ .github/ .gitignore Makefile
git commit -m "chore: initialize Spec-Rails workflow and testing rails"
git checkout main
git merge --ff-only chore/bootstrap-spec-rails
git branch -d chore/bootstrap-spec-rails
```
