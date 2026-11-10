# Agentic How-Tos (Index)

Agent-facing runbooks for working in a Spec-Rails repository. Each one is written to be followed literally: purpose, preconditions, numbered steps with exact commands, expected output, failure modes and a hard-rules checklist.

## Where these files come from

- `npx spec-rails init` copies this directory into the target repo as `docs/agentic-how-tos/`.
- The files are **managed**: every `init` run refreshes them, so local edits are overwritten. Put project-specific notes elsewhere.
- **Existing repos** get new or updated runbooks by re-running `npx spec-rails init` (safe and idempotent; `openspec` is not needed once `openspec/` exists). Check `git status` afterwards and commit the refreshed files on a `chore/` branch.
- If a runbook you expect is missing, the repo was initialized by an older spec-rails: re-run `init`.

Rules and gate definitions live in `openspec/spec-rails/WORKFLOW.md` and `openspec/spec-rails/AGENTS.md`. If a runbook and `WORKFLOW.md` disagree, `WORKFLOW.md` wins; report the discrepancy.

## Runbooks

| # | Runbook | Use when |
| :-- | :-- | :-- |
| 01 | [Bootstrap a project](01-bootstrap-new-project.md) | Installing or refreshing Spec-Rails in a repo |
| 02 | [Drive a feature through Gates 0–4](02-drive-feature-lifecycle.md) | Building a feature or any behavior change |
| 03 | [Parallel worktrees, streams and bake-off](03-parallel-worktrees-multi-agent.md) | `tasks.md` has independent streams, or a slice needs competing candidates |
| 04 | [Fast-track bugfix (Gates B1–B3)](04-fast-track-bugfix.md) | A merged, cross-cutting or dogfood defect |
| 05 | [Configure AI agents](05-configure-ai-agents.md) | Wiring skills, rules and `openspec-*` skills for each agent tool |

## Pick the lane first

| Work | Lane | Branch | Runbook |
| :-- | :-- | :-- | :-- |
| New behavior or changed requirement | Feature | `feat/<id>-<slug>` | 02 (+ 03 for streams) |
| Defect in merged code | Bugfix | `fix/<slug>` in `.worktrees/fix-<slug>` | 04 |
| Docs, dependency bumps, refactors with zero behavior change | Chore | `chore/<slug>` | none; run lint and tests, no gates |
| Installing or refreshing Spec-Rails | Chore | `chore/<slug>` | 01 |

## Universal hard rules

- [ ] Run `git branch --show-current` before any edit or mutating command. On `main`/`master`: stop and create a lane branch.
- [ ] Never tick a Review Gate checkbox. A human does; an unticked box means the gate has not passed, whatever was said in chat.
- [ ] Never use `git commit --no-verify`.
- [ ] Merge only after rebasing onto the target and re-running the rails; merge with `--ff-only` (or open a PR if your team merges that way); then remove the worktree, delete the branch and run `git worktree prune`.
- [ ] Red tests are never committed alone; commit them with the Green code.
- [ ] Never delete or weaken assertions, skip failing tests or write vacuous tests.
- [ ] Tick a task checkbox only with trailing `Evidence:` (command and result) for Red/Green/Coverage/Mutation items.
- [ ] If you are unsure, stop and ask the human; do not guess scope.
