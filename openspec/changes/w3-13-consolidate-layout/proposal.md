# Proposal

## Intent
Remove the `specs/` folder and give each artifact one home: the protocol ships with the addon, project data lives in `docs/`.

## Problem Statement
`specs/WORKFLOW.md` is addon protocol that adopters are told to read but never receive. `specs/ROADMAP.md` and `specs/bug-reports/` are project data sitting in a folder name that upstream OpenSpec does not use and that is easily confused with `openspec/specs/`.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `openspec-addon`: REQ-OSA-5, REQ-OSA-19, REQ-OSA-20, REQ-OSA-21, REQ-OSA-22 change paths; REQ-OSA-29 and REQ-OSA-30 added for the shipped protocol and the `docs/` data layout.

## Scope

### In-Scope
- Move `WORKFLOW.md` to `rules/WORKFLOW.md`, installed as `openspec/spec-rails/WORKFLOW.md`, and add it to the self-copy sync check.
- Move delivery status to `docs/ROADMAP.md`; rename the existing design note to `docs/DESIGN.md`.
- Use `docs/bug-reports/` for bug reports in the CI audit, rules, skill, docs and BDD tests.
- Remove `specs/`.

### Out-of-Scope (YAGNI)
- De-duplicating the root/`openspec/` self-copies (REQ-OSA-22 stays).
- Merging `.agents/` and `.github/` generated OpenSpec files.
- Rewriting the content of WORKFLOW.md beyond path updates.
- Migration tooling for adopters; the change is documented, not automated.

## Assumptions
- **ASM-GEN-1**: Delivery status in `docs/ROADMAP.md` is acceptable to adopters; the template stays `templates/roadmap.md`.
- **ASM-GEN-2**: Archived changes keep their historical `specs/` references untouched.

## Success Metrics
- `specs/` does not exist and `grep -r "specs/\(ROADMAP\|WORKFLOW\|bug-reports\)"` outside `openspec/changes/archive/` returns nothing.
- `make test` passes, including the self-copy and BDD suites.
- A fresh install contains `openspec/spec-rails/WORKFLOW.md`.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
