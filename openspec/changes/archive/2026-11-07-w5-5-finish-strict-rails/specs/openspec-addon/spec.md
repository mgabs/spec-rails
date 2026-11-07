# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-OSA-47 Strict Rails Execution
`spec-rails verify` MUST execute configured test, coverage, and mutation commands and fail on a non-zero exit, an empty required command, a coverage score below `coverageMinScore`, or a mutation run where output lacks a numeric percentage score or reports a score below `mutationMinScore`. Command output MUST be shown on failure. Rail command executions MUST be bounded by an enforced execution timeout, failing verification if a command hangs or exceeds the timeout limit. For docs-only or spec-only changesets, the mutation rail MUST be skipped with an informational pass and the empty-test-files error MUST NOT apply.

#### Scenario: Failing command fails verify
- **GIVEN** a configured test command that exits non-zero
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails and includes the command output

#### Scenario: Score below threshold fails
- **GIVEN** a coverage command that prints a score below `coverageMinScore`
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails naming the coverage threshold

#### Scenario: Mutation command reports failure
- **GIVEN** a configured mutation command that exits non-zero because its threshold is missed
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails and includes the command output

#### Scenario: Successful mutation command output is not scored
- **GIVEN** a configured mutation command that exits zero and reports a valid score at or above `mutationMinScore`
- **WHEN** `spec-rails verify` runs
- **THEN** mutation verification passes

#### Scenario: Mutation output missing score fails
- **GIVEN** a configured mutation command that exits zero but reports no numeric percentage score
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails reporting that the mutation score is missing

#### Scenario: Mutation score below threshold fails
- **GIVEN** a configured mutation command that exits zero but reports a score below `mutationMinScore`
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails reporting that the mutation score is below the configured threshold

#### Scenario: Command execution timeout
- **GIVEN** a rail command that exceeds the maximum execution timeout
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails reporting a command timeout

#### Scenario: Docs-only changeset skips mutation
- **GIVEN** a changeset touching only markdown or `openspec/` files
- **WHEN** `spec-rails verify` runs
- **THEN** the mutation command is not executed and verification does not fail on it


## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
