# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Roadmap item W5.10: commits should usually happen after a stage is complete (specs stage, code, archive), not per micro-step.

Verified in the repo:
- `rules/WORKFLOW.md` §2 "Gate Approval Evidence" and §7 "Gates" say a human ticks a Review Gate "and commits it before the next artifact is created". That forces one commit per planning artifact (up to five before any code).
- `openspec/specs/openspec-addon/spec.md` REQ-OSA-25 (Fresh-Repo End-to-End), scenario "Ticked gate allows commit" ("the Gate 0 box is ticked and committed before `proposal.md`"), encodes the same per-artifact cadence.
- `bin/spec-rails-check` reads the working tree (artifact presence and ticked boxes via `openspec status --json`); it does not inspect git history. A ticked box in the working tree already satisfies it, so batching commits needs no enforcement change.
- Rule 4 (`WORKFLOW.md`): the tip of every branch must be green; Red is never committed alone. Slice loop (Gate 5.x) commits tests + code together per slice; `schema.yaml` lines ~109-110 repeat this.
- Gate 6 step 9 already commits once after `openspec archive`, and `docs/how-tos/02-drive-feature-lifecycle.md` shows a single ship commit.
- Gate approval evidence is the ticked checkbox plus explicit human approval; the commit is just persistence.

Assumptions (user said "usually", so SHOULD-level, not a hard gate):
- "Stage" means: planning (research through tasks) | code (slices) | archive.
- Interpreting the request as a default cadence with justified exceptions, not a ban on intermediate commits.

## 2. Options Explored
**Option A: Documentation convention (SHOULD).** Add a "Commit Cadence" rule to the protocol, schema instructions and how-to; relax the per-artifact "and commits it" wording to "ticks it (committed at the end of the planning stage)". Three default commits: planning, code, archive.

**Option B: Hard enforcement.** Make `spec-rails-check` or a hook reject commits that mix stages or commit mid-stage.

**Option C: One commit per change.** Single squash-style commit at archive.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low: docs, schema text, two test scenarios | High: stage detection from tree state | Low |
| **New Dependencies** | None | None | None |
| **Performance & Latency** | None | Hook slower | None |
| **Maintenance Burden** | Low | High, false positives | Low |
| **Blast Radius** | Docs, schema instructions, templates, installed copies | Check script, hook, CI, tests | Loses rollback granularity and bisectability; conflicts with per-slice green commits (Rule 4) |

## 4. Recommendation
Option A: a SHOULD-level cadence with explicit exceptions (rule 4 slice commits, rebases, bugfix lane). Enforcement stays out of scope (YAGNI) since the existing check already works on the working tree.

## 5. Breaking Changes & Deprecations
- MODIFIED: REQ-OSA-25 (scenario "Ticked gate allows commit" wording about committing the gate before the next artifact). REQ-OSA-16 (Gate Check) is unaffected: it checks the working tree.
- No behavior of `spec-rails-check` changes. No REQ/NFR removed.

## Review Gate
- [x] **Gate 0 Decision**: Go, Option A.
