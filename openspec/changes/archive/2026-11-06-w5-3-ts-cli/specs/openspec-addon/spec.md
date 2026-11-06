# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-OSA-16 Gate Check
`spec-rails check` MUST inspect active changes and fail with a non-zero exit code if any Review Gate is unticked while a downstream artifact exists, or if implementation tasks are ticked before Gate 4 passes. It MUST run natively in TypeScript under Node.js >= 18 without requiring `jq` or external shell interpreters.

#### Scenario: Unticked gate blocks
- **GIVEN** an active change with an unticked Gate 1 box in `proposal.md` while a downstream artifact exists
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming the change and the gate

#### Scenario: Omitted upstream artifact blocks
- **GIVEN** an active change where `proposal.md` exists while `research.md` is omitted or missing Review Gate
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming Gate 0 (`research`)

### Requirement: REQ-OSA-32 Installer CLI Flags and Symlink Resolution
`spec-rails init` MUST support `--stack`, `--force`, `--help`, and `--version`, MUST resolve canonical filesystem paths using Node.js realpath APIs, MUST scaffold `spec-rails.config.json`, install skills into `.agents/skills/spec-rails/`, configure `openspec/config.yaml`, and set up pre-commit hooks and workflows invoking `npx spec-rails`.

#### Scenario: Symlinked binary and CLI version
- **GIVEN** `spec-rails` invoked via `spec-rails --version` or `spec-rails <target>`
- **WHEN** executed
- **THEN** `--version` prints the version and exits 0, and `<target>` installs cleanly from the resolved bundle root

## ADDED Requirements

### Requirement: REQ-OSA-42 Native TypeScript Gate and DAG Checker
`spec-rails check` MUST evaluate Review Gate checkbox states (`- [x]`), verify transitive ancestor DAG dependencies from schema definitions, verify that no implementation tasks in `tasks.md` are marked complete before Gate 4 passes, and report actionable gate violation messages without using `jq` or shell scripts.

#### Scenario: Transitive ancestor gate check
- **GIVEN** an active change where `design.md` exists but `research.md` is unticked
- **WHEN** `spec-rails check` executes
- **THEN** it flags the unticked ancestor gate violation

#### Scenario: Early task completion rejected
- **GIVEN** an active change where Gate 4 is unticked but an implementation task in `tasks.md` is ticked
- **WHEN** `spec-rails check` executes
- **THEN** it exits non-zero and reports early implementation task completion

### Requirement: REQ-OSA-43 Integrated Spec-to-Code Audit
`spec-rails check --audit` (or `spec-rails audit`) MUST inspect git changesets against a target base branch (defaulting to `main`), assert that code changes outside `openspec/` and `docs/` have corresponding `openspec/changes/` or `docs/bug-reports/` entries, and exempt `chore/*` branches from spec-to-code mapping requirements.

#### Scenario: Unmapped code changes rejected
- **GIVEN** a feature branch modifying source files without an active `openspec/changes/` entry
- **WHEN** spec-to-code audit runs
- **THEN** it exits non-zero and lists the unmapped source files

#### Scenario: Chore branch exempted from audit
- **GIVEN** a branch named `chore/update-dependencies` modifying source or config files
- **WHEN** spec-to-code audit runs
- **THEN** it exits 0 with a message stating the chore lane is exempt

### Requirement: REQ-OSA-44 Config JSON and Legacy Rails.conf Deprecation
The system MUST read configuration from `spec-rails.config.json`, validating schema structures with `zod`, and MUST provide backward-compatible fallback parsing for legacy `rails.conf` files when `spec-rails.config.json` is absent.

#### Scenario: Read JSON configuration
- **GIVEN** a repository with `spec-rails.config.json` defining test and rail commands
- **WHEN** `spec-rails verify` or `spec-rails check` executes
- **THEN** it uses the commands and thresholds defined in the JSON configuration

#### Scenario: Fallback to legacy rails.conf
- **GIVEN** a repository lacking `spec-rails.config.json` but containing `openspec/spec-rails/rails.conf`
- **WHEN** `spec-rails verify` executes
- **THEN** it parses legacy key-value pairs and logs a deprecation notice recommending migration to JSON

### Requirement: REQ-OSA-45 Elimination of Shell Binaries and jq Dependency
The system MUST NOT distribute executable shell scripts in `bin/` and MUST NOT require `jq` on `PATH`; all CLI capabilities MUST execute via the compiled TypeScript entry point (`dist/cli.js`), callable via `npx spec-rails` or local binary linking.

#### Scenario: Execution without jq installed
- **GIVEN** an environment where `jq` is absent from `PATH`
- **WHEN** `spec-rails check` and `spec-rails verify` run
- **THEN** both commands execute and parse JSON natively without error

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
