## MODIFIED Requirements

### Requirement: REQ-OSA-47 Strict Rails Execution
`spec-rails verify` MUST execute configured test, coverage, and mutation commands and fail on a non-zero exit, an empty required command, or a coverage score below its configured threshold. Mutation command output MUST NOT be interpreted as a score; the command MUST enforce its own threshold through its exit status. Documentation MUST explain that `mutationMinScore` does not enforce the mutation command's threshold and remains applicable to task evidence. Command output MUST be shown only on failure. For docs-only or spec-only changesets, the mutation rail MUST be skipped with an informational pass and the empty-test-files error MUST NOT apply.

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
- **GIVEN** a configured mutation command that exits zero and prints no percentage or an unrelated percentage
- **WHEN** `spec-rails verify` runs
- **THEN** mutation verification passes without interpreting its output as a score

#### Scenario: Docs-only changeset skips mutation
- **GIVEN** a changeset touching only markdown or `openspec/` files
- **WHEN** `spec-rails verify` runs
- **THEN** the mutation command is not executed and verification does not fail on it

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
