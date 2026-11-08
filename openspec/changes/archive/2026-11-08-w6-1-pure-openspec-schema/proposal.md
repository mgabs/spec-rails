# Proposal

## Intent
Deliver Wave 6.1: Make OpenSpec delta specs 100% pure by removing the `## Review Gate` footer from the `spec.md` template, consolidate Architecture and Specs review into Gate 2 (`design.md`), renumber Tasks to Gate 3 (`tasks.md`) and Verification & Archival to Gate 4, and drop redundant `.feature` tasks and Gate 5.x pauses from the slice loop.

## Problem Statement
The current `spec.md` template includes a `## Review Gate` footer. When delta specs are archived to living specs (`openspec archive`), this footer leaks into permanent project specifications and breaks OpenSpec requirement grammar. Additionally, review gate numbering is desynchronized across documentation (`WORKFLOW.md`), agent skills (`SKILL.md`), CLI verification (`check.ts`), and schema definitions (`schema.yaml`).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `openspec-addon`: Update schema definitions, template structures, gate numbering rules (Gates 0–4), and the slice loop structure.

## Scope

### In-Scope
- Remove `## Review Gate` footer from `templates/spec.md` and `openspec/schemas/spec-rails/templates/spec.md`.
- Update `design.md` template and instructions to serve as **Gate 2** (approving specs and architectural test strategy before task breakdown).
- Update `tasks.md` template and instructions to serve as **Gate 3** (approving tasks and DAG before writing test code).
- Mark Verification & Archive as **Gate 4**.
- Update `schema.yaml` instructions for `specs`, `design`, `tasks`, and `apply` (drop separate `.feature` tasks and Gate 5.x pauses).
- Update `src/commands/check.ts` to reflect Gates 0–3 without expecting or requiring a `## Review Gate` section in `spec.md`.
- Update unit tests in `tests/unit/check.test.ts` and related test suites to assert Gates 0–3.
- Update `WORKFLOW.md`, `SKILL.md`, and developer docs to maintain uniform Gate 0–4 definitions.

### Out-of-Scope (YAGNI)
- Implementing `openspec validate --strict` integration or whitespace/EOF checkers (deferred to W6.2).
- Collapsing root asset directories or altering `spec-rails init` (deferred to W6.3).
- Deleting shell test scripts or modifying Vitest test suites outside gate assertions (deferred to W6.4).
- Modifying git worktree execution policies or hook bypass flags (deferred to W6.5).

## Assumptions
- **ASM-GEN-1**: Delta specs under `openspec/changes/<id>/specs/**/*.md` will contain only pure OpenSpec requirement sections.
- **ASM-GEN-2**: Human approval for behavior contracts (`specs/`) is formalized by approving and ticking Gate 2 in `design.md`.
- **ASM-GEN-3**: The existing `spec-rails-check` baseline mechanism continues to work without modification for grandfathered changes.

## Success Metrics
- Delta specs contain zero `## Review Gate` footers.
- `src/commands/check.ts` successfully validates planning progression through Gates 0, 1, 2, and 3 without reporting missing review gate errors on `spec.md`.
- 100% of existing unit tests pass with >= 95% line/branch coverage and >= 95% mutation kill score.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
