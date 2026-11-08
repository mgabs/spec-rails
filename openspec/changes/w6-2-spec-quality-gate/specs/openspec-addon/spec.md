# Spec Delta: OpenSpec Addon

## MODIFIED Requirements

### Requirement: REQ-OSA-16 Gate Check
`spec-rails check` MUST inspect active changes and enforce step-by-step human review pauses: Gate 0 (`research.md`) MUST be ticked before `proposal.md` can exist; Gate 1 (`proposal.md`) MUST be ticked before `specs/` or `design.md` can exist; Gate 2 (`design.md`) MUST be ticked before `tasks.md` can exist; Gate 3 (`tasks.md`) MUST be ticked before code diffs (`--audit`) or implementation tasks can be ticked. If any downstream artifact exists while an upstream Review Gate is unticked or missing, `spec-rails check` MUST exit non-zero naming the change and the blocked gate. It MUST NOT require or inspect a `## Review Gate` section within `spec.md`. It MUST run natively in TypeScript under Node.js >= 18 without requiring `jq` or external shell interpreters.

#### Scenario: Unticked Gate 0 blocks proposal
- **GIVEN** an active change where `proposal.md` exists while `research.md` is unticked or missing
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming Gate 0 violation

#### Scenario: Unticked Gate 1 blocks specs and design
- **GIVEN** an active change where `design.md` or delta `specs/` exist while `proposal.md` is unticked
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming Gate 1 violation

#### Scenario: Unticked Gate 2 blocks tasks
- **GIVEN** an active change where `tasks.md` exists while `design.md` is unticked
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming Gate 2 violation

#### Scenario: Unticked Gate 3 blocks code diffs and implementation tasks
- **GIVEN** an active change where code modifications exist or implementation tasks are ticked while Gate 3 in `tasks.md` is unticked
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming Gate 3 violation

### Requirement: REQ-OSA-39 Structured Tokenized Evidence Rail
`spec-rails verify` MUST inspect `tasks.md` for free-text evidence notes formatted as `Evidence: <note>`. Every ticked (`- [x]` or `- [X]`) implementation task line mentioning Red, Green, Coverage, or Mutation MUST include a non-empty `Evidence:` note. Under strict verification (`strict: true`), any ticked rail task missing an `Evidence:` note or containing only empty whitespace after the prefix MUST fail verification with a non-zero exit code.

#### Scenario: Valid free-text evidence accepted
- **GIVEN** `tasks.md` containing `- [x] 1.1 Red: tests fail as expected. Evidence: vitest run failed with 2 errors`
- **WHEN** `spec-rails verify` runs
- **THEN** the task evidence check passes

#### Scenario: Missing evidence on ticked rail task rejected
- **GIVEN** `tasks.md` containing `- [x] 1.1 Red: tests fail as expected` without an `Evidence:` note
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails naming the missing evidence violation

## ADDED Requirements

### Requirement: REQ-OSA-49 Artifact Hygiene and Delta Requirement Key Validation
`spec-rails check` MUST validate formatting hygiene across all markdown files within `openspec/changes/<change>/`, failing with a non-zero exit code if any file contains trailing whitespace or lacks a trailing newline. `spec-rails check` MUST run `openspec validate <change> --strict` and inspect all delta `specs/**/*.md` files to assert that every added or modified requirement header matches `### Requirement: (REQ|NFR)-[A-Z0-9]+-[0-9]+ <Name>`. Any missing newline, trailing whitespace, or unkeyed requirement MUST report an actionable error and fail gate check.

#### Scenario: Trailing whitespace rejected
- **GIVEN** an active change artifact containing trailing whitespace on any line
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero reporting the file and line number

#### Scenario: Missing EOF newline rejected
- **GIVEN** an active change artifact lacking a trailing newline at EOF
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero reporting missing EOF newline

#### Scenario: Unkeyed delta requirement rejected
- **GIVEN** a delta `spec.md` with requirement header `### Requirement: Some Unkeyed Behavior`
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero reporting missing REQ-*/NFR-* key
