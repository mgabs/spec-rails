## MODIFIED Requirements

### Requirement: REQ-OSA-10 Change Naming
Feature changes MUST be named `<id>-<slug>` with the roadmap ID lowercased and dots replaced by hyphens (e.g. `w3-1-openspec-addon`) to satisfy OpenSpec CLI kebab-case validation.

#### Scenario: Change naming
- **GIVEN** roadmap item `W3.1`
- **WHEN** a feature change is created for `W3.1`
- **THEN** it is named `w3-1-<slug>`

### Requirement: REQ-OSA-12 Wiring
On a valid target the installer MUST: copy the schema to `openspec/schemas/spec-rails/`; set `schema: spec-rails` in `openspec/config.yaml`; install the pre-commit config, CI workflow, mutation templates, branch-protection hook (supporting standard `.git/` directories and Git worktree `.git` files), Spec-Rails agent rules and `.agents/skills/spec-rails/SKILL.md`; refuse pre-planted symlinks inside the target; and ensure `.worktrees/` is in `.gitignore`.

#### Scenario: Fresh install
- **GIVEN** an initialized OpenSpec target repository
- **WHEN** the installer runs on the target
- **THEN** schema, config, hook, CI, mutation templates, agent rules and `.agents/skills/spec-rails/SKILL.md` are present and `.worktrees/` is ignored

### Requirement: REQ-OSA-14 Non-Destructive Config
The installer MUST preserve existing `openspec/config.yaml` keys other than `schema`, and MUST NOT overwrite an existing user `.pre-commit-config.yaml`, `.github/workflows/spec-rails-ci.yml`, `openspec/spec-rails/mutation/*` or `openspec/spec-rails/rails.conf` unless `--force` is passed (for CI and mutation templates).

#### Scenario: Config preservation
- **WHEN** `config.yaml` has `context` and `rules` and user `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` exist
- **THEN** those keys and files are unchanged and `schema: spec-rails` is set

### Requirement: REQ-OSA-16 Gate Check
A check runnable from pre-commit and CI MUST fail when, for any active change, a downstream `done` artifact exists while any transitive non-`skipped` upstream artifact is missing, lacks a `## Review Gate` checkbox, has an unticked checkbox, or records a Gate 0 `No-Go`, or when implementation tasks in `tasks.md` are ticked while Gate 4 (`tasks.md`) is unticked.

#### Scenario: Unticked gate blocks
- **WHEN** a change has `proposal.md` with an unticked Gate 1 box and a `specs/` artifact (or `design.md` with `specs` skipped)
- **THEN** the check exits non-zero naming the change and the gate

#### Scenario: Omitted upstream artifact blocks
- **WHEN** a change has `proposal.md` on disk while `research.md` does not exist
- **THEN** the check exits non-zero naming Gate 0 (`research`)

### Requirement: REQ-OSA-21 CI Audit Layout
The CI spec-to-code audit in `templates/spec-rails-ci.yml` MUST treat a PR as spec-backed when it changes any file under an active `openspec/changes/<id>/` (excluding `openspec/changes/archive/`), `openspec/specs/` or `docs/bug-reports/`, MUST treat edits to `openspec/spec-rails/` and `.github/` as audited code changes, MUST bind branch refs via `env:`, and MUST NOT reference `specs/`. Chore-lane branches remain exempt.

#### Scenario: OpenSpec change passes audit
- **WHEN** a PR changes code and a file under `openspec/changes/<id>/`
- **THEN** the audit step exits 0

#### Scenario: Legacy specs path fails audit
- **WHEN** a non-chore PR changes code and a file under `specs/`
- **THEN** the audit step exits 1

### Requirement: REQ-OSA-22 Self-Copy Sync
The repo's installed self-copies (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/SKILL.md`, `.github/workflows/spec-rails-ci.yml`), excluding project-configured `rails.conf`, MUST stay byte-identical to their sources in `schemas/`, `bin/`, `rules/`, `skills/` and `templates/`, and `make test` MUST fail when they differ.

#### Scenario: Drift detected
- **WHEN** a source file is changed without updating its installed copy
- **THEN** `make test` fails naming the differing file

### Requirement: REQ-OSA-26 Requirement-to-Test Traceability
`spec-rails-verify` MUST read every `REQ-*` and `NFR-*` key (including multi-part hyphenated domains) declared under `## ADDED Requirements` or `## MODIFIED Requirements` in all delta specs (`specs/**/*.md` at any nesting depth) of each active change (excluding `archive/`) and MUST fail, listing each key, when a key does not appear as a full token in any file under `RAILS_TEST_DIRS` (default `tests`), or when `RAILS_TEST_DIRS` is empty.

#### Scenario: Prefix collision rejected
- **WHEN** an active delta spec declares `REQ-X-1` and `tests/` contains only `@REQ-X-10`
- **THEN** the verifier exits non-zero and prints `REQ-X-1`

### Requirement: REQ-OSA-27 Task Evidence
For each active change, every ticked (`- [x]` or `- [X]`) task line in `tasks.md` that mentions Red, Green, Coverage or Mutation as a whole word MUST contain non-placeholder `Evidence:` followed by non-empty text, and the shipped `tasks.md` template MUST NOT self-match `Evidence:`. `spec-rails-verify` MUST fail and name the task otherwise. Unticked tasks MUST be ignored.

#### Scenario: Ticked without evidence
- **WHEN** a ticked task from the unmodified `tasks.md` template has no appended evidence
- **THEN** the verifier exits non-zero and names the task

## ADDED Requirements

### Requirement: REQ-OSA-31 Store and Path Resolution
`spec-rails-check` and `spec-rails-verify` MUST accept `--store <id>` (and `OPENSPEC_STORE`) and resolve change roots and existing artifact paths from `openspec status --json` (`.changeRoot`, `.artifactPaths`) when available, falling back to repo-local `openspec/changes/<change>` otherwise, while keeping `openspec` `stderr` warnings separate from JSON `stdout`.

#### Scenario: External store change root
- **GIVEN** an OpenSpec change located in an external store (`changeRoot` outside `./openspec/changes/`)
- **WHEN** `spec-rails-check --store <id>` runs
- **THEN** it reads gate states from `.changeRoot` and forwards `--store <id>` to `openspec`

### Requirement: REQ-OSA-32 Installer CLI Flags and Symlink Resolution
`bin/spec-rails` MUST support `--version`, `--help`, and `--force`, MUST resolve symlinks on its own executable path (`$0`) before locating bundled schemas and templates, and MUST ship a `templates/.pre-commit-config.yaml` that runs `spec-rails-check` and directive checks without requiring a project `Makefile`.

#### Scenario: Symlinked binary and CLI version
- **GIVEN** `spec-rails` invoked via a symbolic link on `PATH`
- **WHEN** `spec-rails --version` or `spec-rails <target>` runs
- **THEN** `--version` prints the version and exits 0, and `<target>` installs cleanly from the resolved bundle root

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
