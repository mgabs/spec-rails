# Proposal

## Intent
Align Spec-Rails delta spec templates and schema instructions with OpenSpec 1.16 `--strict` BDD conventions, clarify that requirement IDs are assigned at Gate 2, and document legacy header matching for modified requirements.

## Problem Statement
1. `templates/spec.md` scenarios include only `- **WHEN**` and `- **THEN**`, omitting `- **GIVEN**` required for full BDD scenarios under OpenSpec 1.16 `--strict`.
2. Adopters modifying or removing requirements from legacy living specs that lack the modern `Requirement:` prefix experience failed delta application unless exact legacy headers are preserved.
3. Without explicit schema instruction, agents frequently assign `REQ-*` and `NFR-*` identifiers prematurely at Gate 1 (proposal.md) instead of Gate 2 (specs artifact).

## Capabilities

### Modified Capabilities
- `openspec-addon`: Update schema instructions and spec templates to align scenario steps, legacy header matching, and Gate 2 requirement ID assignment.

## Scope

### In-Scope
- Update `schemas/spec-rails/templates/spec.md` scenario templates to include `- **GIVEN**`.
- Update `schemas/spec-rails/schema.yaml` `proposal` instruction to specify requirement IDs are assigned at Gate 2.
- Update `schemas/spec-rails/schema.yaml` `specs` instruction to grandfather legacy unprefixed `REQ-*` / `NFR-*` headers in `## MODIFIED` and `## REMOVED`.
- Add verification assertions to `tests/test_schema.sh`.
- Sync all schema updates into `openspec/schemas/spec-rails/`.

### Out-of-Scope (YAGNI)
- Modifying OpenSpec core parser or CLI binary.
- Retroactive rewriting of archived change specs or existing living specs.

## Assumptions
- **ASM-GEN-1**: OpenSpec delta matching matches header strings verbatim against target living specs.
- **ASM-GEN-2**: Existing test suites tolerate optional or mandatory GIVEN steps in scenarios.

## Success Metrics
- `tests/test_schema.sh` validates the presence of `GIVEN` in `templates/spec.md` and the updated schema instructions.
- `tests/test_selfcopy.sh` validates byte parity between `schemas/` and `openspec/schemas/`.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
