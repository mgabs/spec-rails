## ADDED Requirements

### Requirement: REQ-OSA-47 Strict Rails Execution
`spec-rails verify` MUST execute the configured test, coverage and mutation commands and fail on a non-zero exit, an empty required command, or a coverage/mutation score below its configured threshold. Output MUST be shown only on failure. When the changeset touches only docs or spec files, the mutation rail MUST be skipped with an informational pass and the empty-test-files error MUST NOT apply.

#### Scenario: Failing command fails verify
- **GIVEN** a configured test command that exits non-zero
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails and includes the command output

#### Scenario: Score below threshold fails
- **GIVEN** a mutation command that prints a score under `mutationMinScore`
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails naming the threshold

#### Scenario: Docs-only changeset skips mutation
- **GIVEN** a changeset touching only markdown or `openspec/` files
- **WHEN** `spec-rails verify` runs
- **THEN** the mutation command is not executed and verification does not fail on it

### Requirement: REQ-OSA-48 Gate Check Baseline
`spec-rails check` MUST skip gate violations for change names listed in `openspec/spec-rails/baseline.txt`, and `spec-rails check --baseline` MUST write that file listing every change currently violating gates. Changes not listed MUST still gate.

#### Scenario: Baselined change is grandfathered
- **GIVEN** a change listed in the baseline file that lacks `## Review Gate`
- **WHEN** `spec-rails check` runs
- **THEN** no violation is reported for it

#### Scenario: Unlisted change still gates
- **GIVEN** a violating change absent from the baseline file
- **WHEN** `spec-rails check` runs
- **THEN** its violation is reported

### Requirement: REQ-OSA-49 CI Template Hygiene
The CI template MUST pin the OpenSpec CLI version, set up Python and `uv` before `spec-rails verify`, derive the pre-commit `SKIP` list from hook ids in `.pre-commit-config.yaml`, and MUST NOT contain a Makefile-only test step.

#### Scenario: Template is pinned and derived
- **GIVEN** `templates/spec-rails-ci.yml`
- **WHEN** it is inspected
- **THEN** it installs `@fission-ai/openspec@<version>`, sets up uv before verify, computes `SKIP` via hook ids, and has no `make test` step

### Requirement: REQ-OSA-50 Agent Skill Footprint Docs
Docs MUST state that `/opsx-*` commands and `openspec-*` skills are interchangeable, advise committing `.claude/`, `.agents/` and `.github/skills`, and advise keeping skills only for tools in use.

#### Scenario: Docs document both names
- **GIVEN** `docs/how-tos/05-configure-ai-agents.md`
- **WHEN** it is read
- **THEN** it documents both name forms and the commit-skills guidance
