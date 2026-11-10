# Agentic How-To 04: Fast-Track Bugfix (Gates B1–B3)

## Purpose
Fix a merged, cross-cutting or dogfood defect with zero branch contamination: isolated worktree off `main`, written bug report, a failing regression test first, minimal fix, fast-forward merge, full cleanup.

## Preconditions
- Spec-Rails installed ([01](01-bootstrap-new-project.md)); `openspec/spec-rails/bug-report.md` exists.
- `main` (or `master`) is the base and is clean; you are not fixing inside a dirty feature branch.
- Scope check: a defect inside the slice you are currently building is fixed in that slice's branch with an immediate Red-first test and no extra gates. Everything else uses this runbook.
- Working `make test` (or the stack's test command). If it is a placeholder echo, tell the human first.

## Steps

### 0. Spawn the worktree first
```bash
git fetch --quiet 2>/dev/null; git status --short
git worktree add .worktrees/fix-token-expiry -b fix/token-expiry main
```
Verify: `git -C .worktrees/fix-token-expiry branch --show-current` prints `fix/token-expiry`. Use `git -C .worktrees/fix-token-expiry <cmd>` (declarative target) instead of `cd <dir> && <cmd>` chains. `.worktrees/` is git-ignored by `init`.

### Gate B1: bug report and triage
1. Copy the template inside the worktree:
   ```bash
   mkdir -p .worktrees/fix-token-expiry/docs/bug-reports
   cp openspec/spec-rails/bug-report.md ".worktrees/fix-token-expiry/docs/bug-reports/$(date +%Y-%m-%d)-token-expiry.md"
   ```
2. Fill: Status/metadata (severity, component, worktree/branch), Summary, Steps to Reproduce, Expected vs Actual, Root Cause Analysis (exact code trace, cite files/lines), Remediation Plan (Red test, surgical fix, verification).
3. Stop. The human approves root cause and plan and ticks **Gate B1**. Touch no production code before that.

### Gate B2: Red reproduction (uncommitted)
1. Write one targeted regression test that recreates the defect, in the worktree.
2. Run only it, then the suite:
   ```bash
   make -C .worktrees/fix-token-expiry test
   ```
   (or the stack's single-test command, e.g. `npm --prefix .worktrees/fix-token-expiry test -- -t token_expiry`, `cargo test --manifest-path .worktrees/fix-token-expiry/Cargo.toml token_expiry`).
3. Expected: the new test **fails**, for the reason in the bug report (not a typo or import error). Show the failing output to the human.
4. Keep it uncommitted (the pre-commit suite would reject it). Stop for the human to tick **Gate B2**.
5. If the test passes on unmodified code, the defect is not reproduced: go back to B1, correct the root cause.

### Gate B3: Green fix, sign-off, merge
1. Apply the **minimal** fix. No refactors, renames or drive-by changes.
2. Run the full suite: green, no regressions. Run `make mutation` for the touched code if available; kill survivors or delete dead code.
3. If the defect came from or changes a living requirement or docs, fix `openspec/specs/<capability>/spec.md` and docs **in this branch** (edit directly, no delta change).
4. Update the report: tick regression-test and suite items, list the test path.
5. Commit report, regression test and fix together (hooks must pass; no `--no-verify`):
   ```bash
   git -C .worktrees/fix-token-expiry status --short
   git -C .worktrees/fix-token-expiry diff --stat
   git -C .worktrees/fix-token-expiry add -A
   git -C .worktrees/fix-token-expiry commit -m "fix: expire tokens at exp boundary"
   ```
6. Stop for the human to review the diff and test output and tick **Gate B3**.
7. Rebase onto the latest base and re-verify, then fast-forward merge:
   ```bash
   git -C .worktrees/fix-token-expiry rebase main
   make -C .worktrees/fix-token-expiry test
   git checkout main
   git merge --ff-only fix/token-expiry
   ```
8. Clean up completely:
   ```bash
   git worktree remove .worktrees/fix-token-expiry
   git branch -d fix/token-expiry
   git worktree prune
   ```
9. Mark the report `Resolved` with the merge commit hash (`git rev-parse --short HEAD`); that edit is a follow-up `chore/` commit, never a direct commit on `main`.
10. Rebase active feature branches and stream worktrees onto the updated `main` and re-run their rails.

## Expected outputs / verification
- `docs/bug-reports/<date>-<slug>.md` exists on `main` after merge with status Resolved and commit hash.
- Regression test fails on pre-fix code and passes after; full suite green.
- `git worktree list` shows only the repo root; `git branch --list 'fix/*'` is empty.

## Failure modes
| Symptom | Cause | Fix |
| :-- | :-- | :-- |
| `fatal: '<path>' already exists` on worktree add | Stale directory | `git worktree list`; `git worktree remove` or `prune`, then retry |
| Red test passes | Wrong repro or already fixed | Re-do triage in B1 |
| Red fails for the wrong reason | Test bug (import, setup) | Fix the test until it fails on the defect only |
| `--ff-only` refused | `main` moved | Rebase onto `main`, re-run suite, retry |
| Pre-commit rejects commit | Red committed alone, lint failure | Commit Red with Green; fix lint; never bypass |
| Direct edit slipped onto `main` | Skipped the branch check | Stop, move work to a `fix/` worktree, restore `main` with the human |

## Hard rules for agents
- [ ] Never edit production code on `main`/`master` or in a dirty feature branch.
- [ ] Spawn the worktree before writing the bug report.
- [ ] No fix without a failing reproduction test shown to the human first.
- [ ] Never tick Gate B1/B2/B3 yourself.
- [ ] Minimal surgical fix only; never delete or weaken assertions to get green.
- [ ] Commit report, test and fix together; never `--no-verify`.
- [ ] Rebase, re-verify, `--ff-only`, then remove worktree, delete branch, `git worktree prune`.
- [ ] Fix affected living specs and docs in the same branch.
