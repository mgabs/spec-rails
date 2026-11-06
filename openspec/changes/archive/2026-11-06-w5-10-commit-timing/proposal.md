# Proposal

## Intent
Make "commit after each stage" the default cadence: one commit when the planning stage (research through tasks) is done, one when the code is done (one per slice is fine for multiple slices), one after `openspec archive`. Intermediate commits stay allowed when justified.

## Problem Statement
The protocol says a human ticks each Review Gate "and commits it before the next artifact is created". That yields up to five planning commits before any code and encourages micro-commits that carry no review value. The roadmap (W5.10) asks for commits to follow completed stages instead. `spec-rails-check` already evaluates the working tree, so the per-artifact commit is a documentation rule, not an enforced one.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `openspec-addon`: MODIFIED REQ-OSA-25 (Fresh-Repo End-to-End): the "Ticked gate allows commit" scenario no longer requires committing the gate before the next artifact; a ticked gate in the working tree is sufficient. ADDED REQ-OSA-40 Commit Cadence: the protocol, schema instructions and lifecycle how-to MUST state the default stage-boundary commit cadence as a SHOULD, with its exceptions.

## Scope

### In-Scope
- `rules/WORKFLOW.md`: add a Commit Cadence rule; reword §2 "Gate Approval Evidence" and §7 "Gates" so ticking, not committing, is the evidence.
- `schemas/spec-rails/schema.yaml` and artifact templates: drop "commits it" wording where present; state the cadence in `tasks` instructions.
- `docs/how-tos/02-drive-feature-lifecycle.md`, `docs/WAY_OF_WORKING.md`, `README.md` where they describe per-artifact commits.
- Sync installed copies (`openspec/spec-rails/`, `openspec/schemas/spec-rails/`) and keep `make test` and selfcopy green.
- Update the REQ-OSA-25 end-to-end test scenario to match the reworded behavior.

### Out-of-Scope (YAGNI)
- Any enforcement of cadence in `spec-rails-check`, hooks or CI (Option B).
- A single commit per change (Option C).
- Changing Rule 4: Red is still never committed alone, and green slice commits stay allowed.
- Changing gate semantics: the human still ticks every Review Gate.

## Assumptions
- **ASM-GEN-1**: "Usually" means a SHOULD: intermediate commits for rebases, streams, bugfix and chore lanes remain valid.
- **ASM-GEN-2**: Stages are planning, code, archive.
- **ASM-GEN-3**: `spec-rails-check` and `openspec status` read the working tree, so no tooling change is needed.

## Success Metrics
- No doc, schema or template says a gate must be committed before the next artifact; a grep for that wording returns nothing.
- `rules/WORKFLOW.md`, the schema and the lifecycle how-to state the same three-commit cadence and exceptions.
- `make test` green with 100% requirement traceability.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
