## MODIFIED Requirements

### Requirement: REQ-OSA-5 Gate Instructions
Each artifact `instruction` MUST carry the Spec-Rails mandatory sections for its gate (Gate 0–4 per `openspec/spec-rails/WORKFLOW.md` §2), including Out-of-Scope (YAGNI) for proposals and Pure Core vs I/O Shell for designs.

#### Scenario: Gate instructions
- **WHEN** an artifact instruction is read
- **THEN** it carries the mandatory sections for its gate

### Requirement: REQ-OSA-19 Delta Rebase Discipline
`openspec/spec-rails/WORKFLOW.md` MUST require each stream to rebase onto the feature branch and pass `openspec validate <change>` before merge.

#### Scenario: Stream merge discipline
- **WHEN** a stream is merged
- **THEN** `WORKFLOW.md` requires a rebase onto the feature branch and a passing `openspec validate <change>`

### Requirement: REQ-OSA-20 Self-Migration
Spec-Rails's repo MUST contain no `specs/` directory; `WORKFLOW.md`, `README`, `rules/AGENTS.md`, `skills/spec-rails/SKILL.md` and docs MUST describe the `openspec/` and `docs/` layout.

#### Scenario: Self-migrated repo
- **WHEN** the repository tree is inspected
- **THEN** it has no `specs/` directory and the docs describe the `openspec/` and `docs/` layout

### Requirement: REQ-OSA-21 CI Audit Layout
The CI spec-to-code audit in `templates/spec-rails-ci.yml` MUST treat a PR as spec-backed when it changes any file under `openspec/changes/`, `openspec/specs/` or `docs/bug-reports/`, and MUST NOT reference `specs/`. Chore-lane branches remain exempt.

#### Scenario: OpenSpec change passes audit
- **WHEN** a PR changes code and a file under `openspec/changes/<id>/`
- **THEN** the audit step exits 0

#### Scenario: Bug report passes audit
- **WHEN** a fix PR changes code and a file under `docs/bug-reports/`
- **THEN** the audit step exits 0

#### Scenario: Code without spec fails audit
- **WHEN** a non-chore PR changes code and no file under `openspec/changes/`, `openspec/specs/` or `docs/bug-reports/`
- **THEN** the audit step exits 1 and lists the modified files

#### Scenario: Legacy specs path fails audit
- **WHEN** a non-chore PR changes code and a file under `specs/`
- **THEN** the audit step exits 1

### Requirement: REQ-OSA-22 Self-Copy Sync
The repo's installed self-copies (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`) MUST be byte-identical to their sources (`schemas/spec-rails/`, `bin/spec-rails-check`, `bin/spec-rails-verify`, `rules/AGENTS.md`, `rules/WORKFLOW.md`, `templates/bug-report.md`, `templates/mutation/`), and the test suite MUST fail when they differ.

#### Scenario: Drift detected
- **WHEN** a source file is changed without updating its installed copy
- **THEN** `make test` fails naming the differing file

#### Scenario: In sync
- **WHEN** all self-copies match their sources
- **THEN** the sync test passes

## ADDED Requirements

### Requirement: REQ-OSA-29 Shipped Protocol
The installer MUST copy `rules/WORKFLOW.md` to `openspec/spec-rails/WORKFLOW.md` in the target project, and the installed `AGENTS.md` MUST reference that path.

#### Scenario: Fresh install
- **WHEN** the installer runs on a project
- **THEN** `openspec/spec-rails/WORKFLOW.md` exists and `openspec/spec-rails/AGENTS.md` references it

#### Scenario: Re-run
- **WHEN** the installer runs again
- **THEN** the result is unchanged (REQ-OSA-13)

### Requirement: REQ-OSA-30 Project Data Layout
Delivery status MUST live in `docs/ROADMAP.md` (template `templates/roadmap.md`) and bug reports in `docs/bug-reports/<date>-<slug>.md`; the protocol, rules, skill and how-tos MUST use these paths and MUST NOT reference `specs/ROADMAP.md`, `specs/WORKFLOW.md` or `specs/bug-reports/`.

#### Scenario: No legacy paths
- **WHEN** the repository docs, rules, skill, templates and tests (excluding `openspec/changes/archive/`) are searched
- **THEN** none references `specs/ROADMAP.md`, `specs/WORKFLOW.md` or `specs/bug-reports/`

#### Scenario: Edge case - adopter with legacy layout
- **WHEN** an adopter still keeps bug reports in `specs/bug-reports/`
- **THEN** the CI audit does not treat them as spec-backing and the PR must add `docs/bug-reports/` or an `openspec/changes/` entry

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
