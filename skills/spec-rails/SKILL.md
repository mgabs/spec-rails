---
name: spec-rails
description: >-
  Spec-Driven, Testing-Railed Development (Spec-Rails) workflow for gated feature
  delivery, multi-agent Git worktree streams, Red-Green-Mutation testing rails,
  and zero-contamination bugfix isolation. Activate when installing Spec-Rails on an OpenSpec project,
  proposing features, triaging bugs, or executing gated vertical slices.
---

# Spec-Rails Skill

Follow [openspec/spec-rails/WORKFLOW.md](../../openspec/spec-rails/WORKFLOW.md). Create a change with `openspec new change <id>-<slug>` and generate each artifact with `openspec instructions <artifact> --change <id>-<slug>` (or `/opsx-propose`).

## 0. The Ponytail Mindset & Strict YAGNI

- **Default answer is "No"**: Push back on vague or unneeded requirements before building.
- **Boring > Clever**: Standard library over new dependencies. Simple logic over complex acrobatics.
- **Code is a liability**: Smallest diff that satisfies specifications and passes gates wins.
- **Zero speculative architecture**: No unused abstractions, premature plugin frameworks, or hypothetical configuration flags.
- **Minimal blast radius**: Touch only files strictly required for the slice.
- **Ruthless deletion**: Kill mutants or delete dead code. Any surviving mutant triggers deletion of unneeded code.

## 1. Pick a Lane First

- **Feature** (`feat/<id>-<slug>`): Follow Gates 0–6.
- **Bugfix** (`fix/<slug>`): Follow Gates B1–B3.
- **Chore** (`chore/<slug>`): Zero behavior change; run pre-commit & tests; no gates.

## 2. Gate Execution Checklist

1. **Gate 0 (Research & Tradeoffs)**: Generate `research.md` in `openspec/changes/<id>-<slug>/`. Present 2–3 options, tradeoffs, and breaking changes. Stop for human developer decision.
   - If **Go**: Update `docs/ROADMAP.md` to `🚀 In Progress` via `chore/roadmap-<id>`.
   - If **No-Go**: Commit `research.md` to `openspec/changes/archive/<id>-<slug>/`, mark `❌ Dropped` in `docs/ROADMAP.md` with rationale via `chore/roadmap-<id>`, and prune feature branch.
2. **Gate 1 (Proposal)**: Generate `proposal.md` for the chosen option. Stop for human review.
3. **Gate 2 (Specs)**: OpenSpec delta specs (`### Requirement: REQ-X-N name`, MUST/SHALL, at least one scenario). MODIFIED/REMOVED repeat the existing header exactly. Stop for human review.
4. **Gate 3 (Design)**: Generate `design.md`. Stop for human review.
5. **Gate 4 (Tasks)**: Generate `tasks.md` with DAG and worktree streams. Stop for human review.
6. **Apply (Gate 5.x)**: Per vertical slice:
   - **5.x-A**: Write BDD `.feature` scenarios $\rightarrow$ **Stop for Gate 5.x human approval**.
   - **5.x-B**: Write failing unit tests (`Red`) tested locally, then implement minimal code (`Green`). Commit tests + code together. Line & branch coverage $\ge 95\%$.
   - **5.x-C**: Run mutation testing $\rightarrow$ achieve $100\%$ kill score on core logic (no exemptions: kill, delete dead code, or restructure equivalent mutants).
7. **Gate 6 (Archive & Merge)**: Ensure all stream worktrees are merged, removed, and pruned (`git worktree prune`). Rebase onto `main`, re-verify rails, run `openspec validate <change>` then `openspec archive <change> --yes` (syncs deltas into `openspec/specs/` and archives the change), merge `--ff-only`, and update `docs/ROADMAP.md` to `✅ Shipped`.

Never tick a Review Gate box yourself. Run `openspec validate` after stream rebases, and run `spec-rails-check` before committing. See `openspec/spec-rails/WORKFLOW.md` §7.
