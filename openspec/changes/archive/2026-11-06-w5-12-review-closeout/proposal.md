# Proposal

## Intent
Close out the stale review pipeline: delete the eight root-level review scratch files, fix the two dead links to them, and keep only the findings that are still true as roadmap items (Option B in `research.md`).

## Problem Statement
Eight review files at the repo root critique a design that W5.2 implemented and W5.11 partly superseded. They contradict each other (mutation threshold 90% vs 95%), carry links to a machine path that does not resolve, and propose commands (`scaffold-check`, `spec-rails lint`) that never shipped. One finding is still valid and uncovered by the roadmap: strict mode cannot skip the mutation rail for docs-only slices.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None. No spec-level behavior changes; `skip_specs: true`.

## Scope

### In-Scope
- `git rm` `concepts_brief.md`, `design_draft.md`, `zoom_out_report.md`, `intermediate_zoom_out_report.md`, `critic_report.md`, `comprehension_report.md`, `implementation_readiness_report.md`, `consolidated_review_report.md`.
- Remove the dead `Predecessor:` link line in `docs/designs/multi-language-rails-anti-drift.md` and in `openspec/changes/w5-2-multi-language-rails/design.md`.
- `docs/ROADMAP.md`: extend W5.5 with "skip the mutation rail when the changeset touches no source files matching `testGlobs`"; add a W5.12 row for this change; add one note that `scaffold-check` and `spec-rails lint` were dropped (YAGNI; Red rail and `openspec validate` already cover them).

### Out-of-Scope (YAGNI)
- Implementing the docs-only skip (that is W5.5).
- Archiving the review files under `docs/reviews/` (Option C).
- Any other edit to `docs/designs/multi-language-rails-anti-drift.md` or W5.2 artifacts beyond the single link line.
- Any `REQ-*` or `NFR-*` change.

## Assumptions
- **ASM-GEN-1**: Git history preserves the deleted files; nothing else references them (verified by `git grep`).
- **ASM-GEN-2**: The W5.2 `design.md` link edit does not need a re-approval of its gates, since it removes only a dead link.

## Success Metrics
- `git ls-files` shows none of the eight files at the repo root.
- `git grep` finds no reference to them.
- `docs/ROADMAP.md` lists the docs-only skip under W5.5 and the dropped-proposals note.
- `make test` green and `sh bin/spec-rails-check` exits 0.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
