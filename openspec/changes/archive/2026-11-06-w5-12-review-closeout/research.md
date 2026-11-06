# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

Eight review scratch files sit at the repo root, tracked in git: `concepts_brief.md`, `design_draft.md`, `zoom_out_report.md`, `intermediate_zoom_out_report.md`, `critic_report.md`, `comprehension_report.md`, `implementation_readiness_report.md`, `consolidated_review_report.md`. They critique a design (`docs/designs/multi-language-rails-anti-drift.md`) that W5.2 has since implemented and W5.11 has partly superseded. Intent: drop them, keep only the findings that are still true, and finalize those into `docs/ROADMAP.md`.

Verified in the codebase:
- Nothing references the scratch files except two dead `Predecessor:` links (`docs/designs/multi-language-rails-anti-drift.md:6`, `openspec/changes/w5-2-multi-language-rails/design.md:6`). Both use `/Users/mmetawea/...` paths that do not resolve.
- `src/` has only `init` and `verify` commands. There is no `scaffold-check` and no `lint` command, so those two proposals never shipped.
- `src/commands/verify.ts`: with `strict` (default true) an empty test glob match is an error, and evidence is only token-checked via `validateTasksEvidence`. Nothing inspects the changeset, so a docs-only slice cannot skip the mutation rail.
- W5.5 (Strict Rails by Default) already covers "evidence tokens are theater" by executing the configured commands.
- W5.2 is still an active change, pending Gate 6 archive.

Finding status:

| Finding | Status | Home |
| :--- | :--- | :--- |
| Node rewrite vs `NFR-OSA-1` | Superseded | W5.11 (done) |
| Mutation threshold 90 vs 95 | Superseded | W5.11 (done) |
| Evidence tokens are verification theater | Valid | W5.5 (exists) |
| Strict mode blocks docs-only slices | Valid, uncovered | extend W5.5 |
| `scaffold-check` AST inspector | Never shipped | drop (YAGNI; Red rail already covers it) |
| `spec-rails lint` duplicates `openspec validate` | Never shipped | drop |
| Doc status "Draft" vs "Finalized" | Nit | drop |

## 2. Options Explored

**A. Delete only.** Remove the eight files and fix the dead links. No roadmap change. Loses the one uncovered finding.

**B. Delete and fold into the roadmap (recommended).** As A, plus extend W5.5 with the docs-only mutation skip, and record the dropped proposals (`scaffold-check`, `lint`) in one roadmap note so they are not re-proposed.

**C. Archive the files under `docs/reviews/`.** Keeps history, but it is stale, contradicts itself on the mutation threshold, and git history already preserves it.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Lowest | Low | Low |
| **New Dependencies** | None | None | None |
| **Performance & Latency** | n/a | n/a | n/a |
| **Maintenance Burden** | None | None | Stale docs to maintain; the hygiene rule would also scan them |
| **Blast Radius** | Root files and two links | Same plus one roadmap row edit | Adds a docs folder |

## 4. Recommendation

Option B: delete the eight files, fix the two dead links, and move the single valid uncovered finding (docs-only strict mode) and the "dropped, do not re-propose" note into `docs/ROADMAP.md`.

## 5. Breaking Changes & Deprecations

None. No `REQ-*` or `NFR-*` in `openspec/specs/` is modified; this is documentation and roadmap only. It edits `openspec/changes/w5-2-multi-language-rails/design.md` (one link), an active change, so it must not alter W5.2's wording otherwise.

## Review Gate
- [x] Option B
