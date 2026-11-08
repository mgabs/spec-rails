# Spec Delta: Vitest-Only Harness & Dead Code Deletion (W6.4)

## MODIFIED Requirements

### Requirement: REQ-OSA-22 Self-Copy Sync
The repo's installed self-copies (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/SKILL.md`, `.github/workflows/spec-rails-ci.yml`), excluding project-configured `rails.conf`, MUST stay byte-identical to their sources in `schemas/`, `bin/`, `rules/`, `skills/` and `templates/`, and test execution (`npm test`) MUST fail when they differ.

#### Scenario: Drift detected
- **WHEN** a source file is changed without updating its installed copy
- **THEN** `make test` fails naming the differing file

#### Scenario: In sync
- **WHEN** all self-copies match their sources
- **THEN** the sync test passes

### Requirement: REQ-OSA-23 Docs Accuracy
README, `docs/` and `skills/` MUST NOT instruct manual copying of schema templates into a change, MUST describe change creation through `openspec new change` and artifact generation through `openspec instructions` or `/opsx-*`, and every relative markdown link in them MUST resolve to an existing file.

#### Scenario: Broken link detected
- **WHEN** a doc links to a missing file
- **THEN** `make test-lint` fails naming the doc and the link

#### Scenario: No manual template copy
- **WHEN** README, `docs/` and `skills/` are searched for `cp openspec/schemas/spec-rails/templates`
- **THEN** no match is found

### Requirement: REQ-OSA-24 No Unused Helpers
Every function defined in `bin/` scripts and `tests/` shell files MUST be referenced at least once outside its own definition, and `make test-lint` MUST fail naming any that is not.

#### Scenario: Unused helper detected
- **WHEN** a shell function is defined and never called
- **THEN** `make test-lint` fails naming the file and function

#### Scenario: All helpers used
- **WHEN** every defined function is called
- **THEN** the check passes
