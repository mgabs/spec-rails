# Agentic How-To 03: Parallel Worktrees, Streams & Candidate Bake-Off

## Purpose
Run independent slices of one feature in parallel, each subagent in its own Git worktree and branch, then integrate them without contamination. Includes the optional candidate bake-off for high-uncertainty slices. Gate rules are in `openspec/spec-rails/WORKFLOW.md` (Rule 3).

## Preconditions
- Gate 3 is **ticked by a human** in `tasks.md`, and its Streams & Worktrees table partitions orthogonal work with no shared files.
- Shared contracts (types, interfaces, shared delta specs) are committed on the feature branch `feat/<id>-<slug>` (locked at Gate 2) before spawning.
- `git branch --show-current` is the feature branch; `git status --short` is clean; `.worktrees/` is git-ignored (`init` does this).
- If streams must touch a shared delta spec, edits are strictly additive with distinct `REQ-*` IDs.

## 1. Agent Rules (for every subagent)
- Work only inside the assigned worktree (`.worktrees/<change>-<stream>`) and its own stream branch.
- Never tick Gate boxes; they are human sign-offs. Tick task checkboxes only with `Evidence:` (test output, coverage and mutation reports).
- Edit only your stream's slice section of `tasks.md` to avoid rebase collisions (or leave ticking to the integrator on the feature branch).
- Follow the slice order: contract scaffolding, Unit Red, Code Green, Coverage and Mutation Kill.
- Do not touch files owned by another stream; shared contracts are locked at Gate 2.
- Use declarative command shapes, never `cd <dir> && <cmd>`: `git -C .worktrees/<id>-<stream> <cmd>`, `npm --prefix .worktrees/<id>-<stream> <cmd>`, `cargo --manifest-path .worktrees/<id>-<stream>/Cargo.toml <cmd>`, `make -C .worktrees/<id>-<stream> <target>`.
- Zero polling: dispatch long-running work (tests, mutation) and end the turn; wait for the reactive wakeup instead of looping on status or logs.
- Never `--no-verify`, even in a stream worktree; hooks and the full rails run on every commit and merge.

## 2. Dispatch

```bash
git worktree add .worktrees/w1-2-storage -b feat/w1-2/storage
git worktree add .worktrees/w1-2-api -b feat/w1-2/api
git worktree list
```
Expected: the list shows the repo root plus both worktrees on their stream branches.

Point each subagent's workspace at its worktree path (or its workspace setting, if your tool has one). Give each: its slice from `tasks.md`, the relevant delta specs, the locked contracts, and the rails thresholds: coverage >= 95%, mutation kill >= 95%. Then end your turn; do not poll.

## 3. Integrate

Per finished stream, one at a time:

```bash
git -C .worktrees/w1-2-storage rebase feat/w1-2-data-pipeline
make -C .worktrees/w1-2-storage lint test coverage mutation   # or the stack's equivalents; hooks with zero bypass
git checkout feat/w1-2-data-pipeline
git merge --ff-only feat/w1-2/storage
git worktree remove .worktrees/w1-2-storage
git branch -d feat/w1-2/storage
git worktree prune
```

Rebase each later stream onto the updated feature branch before merging it, resolve conflicts additively, and re-run its rails. Run `openspec validate <change> --strict` after each rebase; if the OpenSpec CLI is unavailable, re-read the delta specs against the schema by hand. Finally tick the integration items in `tasks.md` with `Evidence:` and continue with Gate 4 in [02](02-drive-feature-lifecycle.md).

Verify: `git worktree list` shows only the repo root; `git branch --list 'feat/w1-2/*'` is empty.

## 3b. Failure modes
| Symptom | Cause | Fix |
| :-- | :-- | :-- |
| `fatal: '<branch>' is already checked out` | Branch used by another worktree | `git worktree list`; use a new stream branch or remove the stale worktree |
| `.git/index.lock` exists | Two git processes in one worktree, or a stale lock | One agent per worktree; confirm no git process runs before removing the lock |
| `--ff-only` refused | Feature branch moved after the rebase | Rebase again, re-run rails, retry |
| Rebase conflict in `tasks.md` or a shared spec | Stream edited outside its slice | Resolve additively; keep each side's slice section |
| Rails pass in stream but fail after integration | Cross-stream interaction | Fix on the feature branch with a Red test first |
| Stale `.worktrees/*` after merge | Cleanup skipped | `git worktree remove`, `git branch -d`, `git worktree prune` |

## 3c. Hard rules (checklist)
- [ ] Gate 3 ticked by a human before any worktree is created.
- [ ] One agent per worktree; stay inside it; never touch another stream's files.
- [ ] Never tick a Review Gate box.
- [ ] Rebase, re-run rails, `--ff-only`, then remove worktree, delete branch, `git worktree prune`, after every merge.
- [ ] Never `--no-verify`.
- [ ] No polling loops; fire and halt.

---

## 4. Optional: Candidate Bake-Off

For high-uncertainty or algorithmic slices, run competing candidates in parallel worktrees instead of one stream. Standard features and chores skip this.


### 1. Spawn Candidate Worktrees
```bash
git worktree add .worktrees/w1-2-cand-a -b feat/w1-2/cand-a
git worktree add .worktrees/w1-2-cand-b -b feat/w1-2/cand-b
```

### 2. Dispatch Competing Subagents
Use differing prompts, models or architectural approaches. Both must keep to the pre-committed contract scaffolding and testing rails.

### 3. Evaluate Candidates
Score both against objective metrics:
1. **Rails Pass**: 100% test pass and $\ge 95\%$ line/branch coverage.
2. **Mutation Kill Score**: $\ge 95\%$ on core logic.
3. **Ponytail Simplicity**: smallest diff, fewest abstractions, lowest cyclomatic complexity.

Record the scores for both candidates (commands run and results, `git diff --stat`) in the PR text or `tasks.md` `Evidence:` notes. A candidate below 95% on either rail is disqualified. The human confirms the winner; you do not pick it alone.

### 4. Merge Winner & Prune Loser
```bash
git checkout feat/w1-2-data-pipeline
git merge --ff-only feat/w1-2/cand-a   # after rebasing cand-a and re-running its rails
git worktree remove .worktrees/w1-2-cand-a
git worktree remove .worktrees/w1-2-cand-b
git branch -d feat/w1-2/cand-a
git branch -D feat/w1-2/cand-b
git worktree prune
```
