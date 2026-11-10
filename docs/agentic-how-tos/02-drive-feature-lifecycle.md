# Agentic How-To 02: Drive a Feature Through Gates 0–4

## Purpose
Deliver a behavior change as `feat/<id>-<slug>` through five human-reviewed gates, then vertical slices with Red -> Green -> Coverage -> Mutation rails, then archive. Every artifact, command and piece of evidence is listed so a human can audit your work.

## Preconditions
- Spec-Rails is installed ([01](01-bootstrap-new-project.md)): `openspec/config.yaml` has `schema: spec-rails`, `openspec/schemas/spec-rails/schema.yaml` and `openspec/spec-rails/WORKFLOW.md` exist.
- `git branch --show-current` is not `main`/`master`; working tree is clean.
- The human has given a work item or description. If it is vague, speculative or larger than one capability, push back (default answer is "No") before drafting.
- Real `make lint`, `make test`, `make coverage`, `make mutation` (or your stack's equivalents) exist. If they are still echo placeholders, tell the human; rails evidence will otherwise be meaningless.

## Commands: `openspec-*` skills (CLI-free)
After `init`, the workflows run by reading files; no `openspec` CLI is needed.

| Command (or equivalent skill) | Does | Gate rule |
| :-- | :-- | :-- |
| `openspec-explore` | Think and investigate; no artifacts forced | any time |
| `openspec-propose` | Creates `openspec/changes/<id>-<slug>/` with `.openspec.yaml` and drafts artifacts from `schema.yaml` | **Draft one artifact, then stop** for the gate (see below) |
| `openspec-apply-change` | Implements pending `tasks.md` checkboxes | only after Gate 3 is ticked by a human |
| `openspec-archive-change` | Syncs delta specs into `openspec/specs/` and moves the change to `openspec/changes/archive/` | only after Gate 4 prerequisites below |
| `openspec-sync-specs`, `openspec-update-change` | Sync deltas without archiving; revise artifacts | as needed |

The Spec-Rails propose port drafts one gate at a time (the upstream generic flow drafts everything in one pass; Spec-Rails forbids that). Draft **one artifact at a time** and stop after each; continue only when the human has ticked that artifact's Review Gate and told you to proceed. Other generated workflows (not listed above) still need the `openspec` CLI. If the CLI is installed, `openspec validate <change> --strict` and `openspec status --change <change>` are optional extra checks; without it, read `schema.yaml` and the change folder.

## Steps

### 0. Branch and change
1. Normalize the id: lowercase, dots to hyphens (`W1.2` -> `w1-2`). Change name `<id>-<slug>` uses `[a-z0-9-]` only.
2. ```bash
   git checkout -b feat/w1-2-data-ingestion
   ```
3. Run `openspec-propose` for `w1-2-data-ingestion`. It creates `openspec/changes/w1-2-data-ingestion/.openspec.yaml` (`schema: spec-rails`, `created: <date>`). Stop after the first artifact.

Artifact order (from `schema.yaml`): `research` -> `proposal` -> `specs` -> `design` -> `tasks`. Each template ends with an unticked `## Review Gate` box.

### Gate 0: `research.md`
- Draft: Intent & Ground Truth (facts verified by reading code/docs, cited by path), 2–3 Options, Tradeoff Matrix (complexity, dependencies, performance, maintenance, blast radius), Breaking Changes & Deprecations (each affected `REQ-*`/`NFR-*` in `openspec/specs/`), Recommendation (1–2 sentences, YAGNI-first).
- Stop. Ask the human to pick **Go (name the option)** or **No-Go**. On No-Go: stop, do not draft further; the human decides whether to archive research and delete the branch.
- Evidence of passing: `- [x] **Gate 0 Decision**` ticked by the human in the file.

### Gate 1: `proposal.md`
- Draft only after Gate 0 is ticked. Sections: Intent, Problem Statement, Scope (In-Scope / Out-of-Scope YAGNI), Success Metrics (measurable), Assumptions (`ASM-GEN-*`), built on the chosen option.
- Out-of-Scope items are binding prohibitions for everything that follows.
- Stop for the human to tick **Gate 1 Approval**.

### Gate 2: delta specs + `design.md`
- Draft only after Gate 1 is ticked.
- `specs/<capability-path>/spec.md` (delta, no gate footer). Headers: `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`; each requirement `### Requirement: REQ-<DOMAIN>-<N> <Name>` (or `NFR-<DOMAIN>-<N>`), body with `MUST`/`SHALL`, at least one `#### Scenario:` using exactly four hashtags with GIVEN/WHEN/THEN. MODIFIED/REMOVED repeat the existing header verbatim; deprecated requirements keep the header and start the body with `**[DEPRECATED by <change>]**`; keys are never reused. A new capability's delta starts with `## Purpose`. Preserve an existing capability's full path.
- `design.md`: Overview & Invariants; Domain Models, State & Interface Contracts; Architecture & Data Flow; Boundary Rules (pure core vs I/O shell); Concurrency, Latency & Resource Budgets matching each `NFR-*`; Testing Strategy & Concrete Test Cases covering every `REQ-*`/`NFR-*`.
- Stop for the human to tick **Gate 2 Approval** (in `design.md`).
- Contract scaffolding (types, interfaces, schemas, empty signatures) is specified in `design.md` here and committed as task 3.0 during apply, before any slice logic.

### Gate 3: `tasks.md`
- Draft only after Gate 2 is ticked. Sections: Dependency DAG, Streams & Worktrees (`.worktrees/<id>-<stream>`), per-slice tasks in fixed order (3.0 Contract scaffolding, 3.1 Red, 3.2 Green, 3.3 Coverage and Mutation), Integration & Rebase Plan.
- Independent streams -> follow [03](03-parallel-worktrees-multi-agent.md). Dependent slices run sequentially.
- Stop for the human to tick **Gate 3 Approval**.

### Planning commit
After Gate 3 is ticked, commit once (planning = research through tasks):
```bash
git status --short && git diff --stat
git add openspec/changes/w1-2-data-ingestion
git commit -m "docs(w1-2): plan data ingestion (Gates 0-3)"
```
Hooks must pass (`pre-commit` runs `make lint` / `make test`).

### Apply: vertical slices (`openspec-apply-change`)
Run only if Gate 3 is ticked in the file on disk. For each slice, in order:
1. **Contract scaffolding**: commit interfaces/types/signatures; tick 3.0.
2. **Red**: write tests for every `REQ-*`/`NFR-*` and scenario; run `make test`; it must fail **for the expected reason**. Keep uncommitted. Paste the failing output in the task note: `- [x] 3.1 ... Evidence: make test -> 3 failed (REQ-X-1 not implemented)`.
3. **Green**: minimal code (YAGNI). `make test` passes. Commit tests + code together (never Red alone). Tick 3.2 with `Evidence:` (command and pass count).
4. **Coverage** `make coverage`: >= 95% line and branch on touched modules. **Mutation** `make mutation` scoped to the slice: >= 95% kill. Surviving mutants: add a killing assertion, delete dead code, or restructure equivalent mutants away; list every remaining survivor with a reason in the PR text. Tick 3.3 with `Evidence:` (scores).
5. Pause and report (do not silently expand scope) if a task is unclear, the design is wrong, or you are tempted to narrow or defer specified behavior.

Task tick format: `- [x] 3.2 Green implementation ... Evidence: make test -> 42 passed`. Ticking **task** boxes with evidence is yours; ticking **Review Gate** boxes never is.

### Gate 4: verify, archive, merge
1. All streams merged, worktrees removed: `git worktree list` shows only the repo root; `git worktree prune`.
2. Rebase onto `main`: `git rebase main`; re-run `make lint test coverage mutation` (full project mutation). Capture results.
3. Traceability: every `REQ-*`/`NFR-*` key of the change appears in a test file:
   ```bash
   grep -rhoE "(REQ|NFR)-[A-Z0-9]+-[0-9]+" openspec/changes/w1-2-data-ingestion/specs | sort -u
   grep -rl "REQ-DATA-1" tests/ || echo "UNTESTED: REQ-DATA-1"
   ```
   (adapt the test directory to the repo). Any untested key blocks Gate 4.
4. Human comprehension check: the reviewer must be able to explain every line; delete and revert what they cannot.
5. Tick completed slice items and final integration task 4.2 with `Evidence:`. 4.1 (comprehension) is ticked only after the human confirms.
6. Run `openspec-archive-change` (run `openspec validate w1-2-data-ingestion --strict` first; if the CLI is unavailable, re-read the delta specs against the schema by hand). It merges deltas into `openspec/specs/<capability>/spec.md` and moves the change to `openspec/changes/archive/YYYY-MM-DD-w1-2-data-ingestion/`.
7. Commit once after archive, then merge:
   ```bash
   git status --short && git diff --stat
   git add -A
   git commit -m "feat(w1-2): ship data ingestion"
   git checkout main
   git merge --ff-only feat/w1-2-data-ingestion
   git branch -d feat/w1-2-data-ingestion
   git worktree prune
   ```
   Merging to `main` and the final PR sign-off are the human's call; stop and ask if unsure.

## Commit cadence
One commit after planning, one per slice (or one after the code), one after archive. Exceptions: the contract scaffolding commit (task 3.0), Green slice commits, rebases and stream merges.

## Expected outputs / verification
- Each of `research.md`, `proposal.md`, `design.md`, `tasks.md` exists with its Review Gate ticked **by the human**; `specs/**/spec.md` exists.
- `tasks.md`: every task ticked with `Evidence:` on Red/Green/Coverage/Mutation items.
- After archive: `openspec/specs/<capability>/spec.md` contains the new requirements; `openspec/changes/w1-2-data-ingestion` is gone from the active list.
- `git log --oneline main` shows the commits ff-merged; `git worktree list` shows one entry.

## Failure modes
| Symptom | Cause | Fix |
| :-- | :-- | :-- |
| Apply says blocked / missing artifact | An artifact in `apply.requires` (tasks) or its dependencies is absent | Draft the missing artifact through its gate |
| Gate box unticked but human said "approved" in chat | Approval not recorded | Ask the human to tick the box; do not tick it yourself |
| Pre-commit fails on Red commit | Red committed alone | Keep Red uncommitted; commit with Green |
| `--ff-only` merge refused | `main` moved | `git rebase main`, re-run rails, retry |
| Coverage or mutation below 95% | Missing assertions or dead code | Add killing assertions, delete dead code, restructure equivalents; never lower the threshold |
| Make target only prints TODO | Placeholder Makefile | Tell the human; implement the real command before claiming evidence |
| Duplicate/invalid requirement header at archive | MODIFIED header not verbatim, or a reused key | Copy the existing header exactly; assign a new key |
| `.git/index.lock` collision | Stale worktree or concurrent git | Prune worktrees; do not delete the lock while another git process runs |

## Hard rules for agents
- [ ] Verify the branch is a `feat/<id>-<slug>` lane before every edit.
- [ ] Draft one planning artifact at a time; stop after each; never generate all in one unreviewed pass.
- [ ] **Never tick a Review Gate box** (Gates 0–3, B1–B3). Only the human does.
- [ ] Never run `openspec-apply-change` or `openspec-archive-change` before the prerequisite gates are ticked in the files on disk.
- [ ] Re-read dependency artifacts from disk before drafting; the human may have edited them.
- [ ] Tick task boxes only with `Evidence:` (command + result) on Red/Green/Coverage/Mutation tasks; never invent evidence.
- [ ] Red before Green; Red never committed alone; never weaken or delete assertions.
- [ ] Out-of-Scope in `proposal.md` is binding; smallest diff wins; no speculative abstractions.
- [ ] Never `--no-verify`.
- [ ] Rebase, re-verify, `--ff-only`; then remove worktree, delete branch, `git worktree prune`.
- [ ] Never edit managed files under `openspec/spec-rails/`, `openspec/schemas/spec-rails/`, `docs/agentic-how-tos/`.
