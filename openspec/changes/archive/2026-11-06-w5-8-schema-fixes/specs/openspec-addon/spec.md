# Spec Delta

## ADDED Requirements

### Requirement: REQ-OSA-41 Schema and Template Alignment
The system MUST include `- **GIVEN**` steps in the spec delta template (`templates/spec.md`), MUST instruct in `schema.yaml` that formal requirement identifiers (`REQ-*` / `NFR-*`) are assigned at Gate 2 rather than in proposals, and MUST instruct that `## MODIFIED Requirements` and `## REMOVED Requirements` repeat legacy unprefixed headers verbatim when modifying or removing requirements that lack the `Requirement:` prefix.

#### Scenario: Spec template includes GIVEN step
- **GIVEN** the `spec.md` template in `schemas/spec-rails/templates/`
- **WHEN** its scenario templates are inspected
- **THEN** each scenario template contains `- **GIVEN** <!-- precondition -->` preceding `- **WHEN**` and `- **THEN**`

#### Scenario: Gate 2 requirement ID assignment instruction
- **GIVEN** `schema.yaml` instructions for `proposal` and `specs`
- **WHEN** they are inspected
- **THEN** `proposal` states that requirement identifiers are assigned at Gate 2, and `specs` assigns the stable keys

#### Scenario: Legacy unprefixed header preservation instruction
- **GIVEN** `schema.yaml` instructions for `specs`
- **WHEN** instructions for `## MODIFIED Requirements` and `## REMOVED Requirements` are inspected
- **THEN** they explicitly state that legacy headers lacking the `Requirement:` prefix must be repeated verbatim to preserve OpenSpec exact header matching

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
