# openspec-addon Specification

## Purpose
Defines how Spec-Rails layers on an OpenSpec project: the `spec-rails` schema, the idempotent installer, the gate and lane check, and the OpenSpec-native spec model.

## Requirements

### Requirement: REQ-OSA-1 Schema Bundle
The addon MUST ship a schema named `spec-rails` at `schemas/spec-rails/` (`schema.yaml` + `templates/`) that `openspec` resolves after being copied to `openspec/schemas/spec-rails/`.

#### Scenario: Schema is resolvable
- **WHEN** the bundle is copied to `openspec/schemas/spec-rails/`
- **THEN** `openspec schemas` lists `spec-rails`

### Requirement: REQ-OSA-2 Research Artifact
The `spec-rails` schema MUST define a `research` artifact generating `research.md` with `requires: []`, and `proposal` MUST require `research`.

#### Scenario: Research gates proposal
- **WHEN** a change using schema `spec-rails` has no `research.md`
- **THEN** `proposal` is blocked on `research`

### Requirement: REQ-OSA-3 Artifact DAG
The schema MUST define `research → proposal → specs → design → tasks`, matching `spec-driven` edges between `proposal`, `specs`, `design` and `tasks`.

#### Scenario: DAG order
- **WHEN** the schema is read
- **THEN** artifacts are research, proposal, specs, design, tasks in dependency order

### Requirement: REQ-OSA-4 Gate Footers
Every artifact template MUST end with a `## Review Gate` section containing an unticked `- [ ]` approval checkbox naming its gate.

#### Scenario: Gate footers
- **WHEN** any artifact template is read
- **THEN** it ends with an unticked `## Review Gate` checkbox

### Requirement: REQ-OSA-5 Gate Instructions
Each artifact `instruction` MUST carry the Spec-Rails mandatory sections for its gate (Gate 0–4 per `openspec/spec-rails/WORKFLOW.md` §2), including Out-of-Scope (YAGNI) for proposals and Pure Core vs I/O Shell for designs.

#### Scenario: Gate instructions
- **WHEN** an artifact instruction is read
- **THEN** it carries the mandatory sections for its gate

### Requirement: REQ-OSA-6 Slice Loop
`apply.instruction` MUST direct the agent through BDD scenarios → Gate 5.x approval → Red → Green → coverage → mutation per slice, and `apply.requires`/`tracks` MUST be `[tasks]` / `tasks.md`.

#### Scenario: Slice loop
- **WHEN** `apply.instruction` is read
- **THEN** it orders BDD, Gate 5.x, Red, Green, coverage, mutation and tracks `tasks.md`

### Requirement: REQ-OSA-7 Delta Specs
Feature specs MUST be OpenSpec delta specs under `openspec/changes/<id>-<slug>/specs/`; the full-copy rule is removed.

#### Scenario: Delta specs
- **WHEN** a feature changes a capability
- **THEN** its spec is an OpenSpec delta under `openspec/changes/<id>-<slug>/specs/`

### Requirement: REQ-OSA-8 Requirement Keys
Each delta requirement header MUST begin with its stable key: `### Requirement: REQ-<DOMAIN>-<N> <Name>` (and `NFR-` likewise); keys MUST NOT be reused.

#### Scenario: Requirement keys
- **WHEN** a delta requirement is written
- **THEN** its header starts with the stable key `REQ-<DOMAIN>-<N>`

### Requirement: REQ-OSA-9 Archive
Gate 6 MUST use `openspec archive` for spec sync and archival; Spec-Rails MUST NOT copy into or move within any spec directory itself.

#### Scenario: Archive uses OpenSpec
- **WHEN** Gate 6 is executed on a completed change
- **THEN** specs are synced and archived by `openspec archive` with no Spec-Rails copy or move step

### Requirement: REQ-OSA-10 Change Naming
Feature changes MUST be named `<id>-<slug>` with the roadmap ID lowercased (e.g. `w3.1-openspec-addon`).

#### Scenario: Change naming
- **WHEN** a feature change is created for roadmap item W3.1
- **THEN** it is named `w3.1-<slug>`

### Requirement: REQ-OSA-11 Prerequisite
The installer MUST fail with a non-zero exit and a message when the target has no `openspec/` directory, when `openspec` is not on `PATH`, or when its version is below the pinned minimum (`1.15.0`).

#### Scenario: Missing prerequisite
- **WHEN** the target has no `openspec/` directory, no `openspec` on PATH, or a version below 1.15.0
- **THEN** the installer exits non-zero with a message and writes nothing

### Requirement: REQ-OSA-12 Wiring
On a valid target the installer MUST: copy the schema to `openspec/schemas/spec-rails/`; set `schema: spec-rails` in `openspec/config.yaml`; install the pre-commit config, CI workflow, mutation templates, branch-protection hook, Spec-Rails agent rules; and ensure `.worktrees/` is in `.gitignore`.

#### Scenario: Fresh install
- **WHEN** the installer runs on a valid target
- **THEN** schema, config, hook, CI, mutation templates and agent rules are present and `.worktrees/` is ignored

### Requirement: REQ-OSA-13 Idempotence
A second installer run MUST leave all files byte-identical and exit 0.

#### Scenario: Idempotent re-run
- **WHEN** the installer runs a second time
- **THEN** no file changes and exit 0

### Requirement: REQ-OSA-14 Non-Destructive Config
The installer MUST preserve existing `openspec/config.yaml` keys other than `schema`, and MUST NOT overwrite an existing user `.pre-commit-config.yaml`.

#### Scenario: Config preservation
- **WHEN** `config.yaml` has `context` and `rules` and a user `.pre-commit-config.yaml` exists
- **THEN** those keys and the file are unchanged and `schema: spec-rails` is set

### Requirement: REQ-OSA-15 Update Survival
Spec-Rails skills and rules MUST NOT live in files regenerated by `openspec update`.

#### Scenario: Update survival
- **WHEN** a completed install is inspected
- **THEN** Spec-Rails rules live outside files regenerated by `openspec update`

### Requirement: REQ-OSA-16 Gate Check
A check runnable from pre-commit and CI MUST fail when, for any active change, an artifact exists whose preceding gate checkbox is unticked.

#### Scenario: Unticked gate blocks
- **WHEN** a change has `proposal.md` with an unticked Gate 1 box and a `specs/` artifact
- **THEN** the check exits non-zero naming the change and the gate

### Requirement: REQ-OSA-17 Lane Check
The check MUST fail commits made directly on `main`/`master`.

#### Scenario: Direct commit on main
- **WHEN** the current branch is `main` or `master`
- **THEN** the check exits non-zero

### Requirement: REQ-OSA-18 Status Source
The gate check MUST determine artifact presence via `openspec status --json`, not by re-implementing the artifact graph.

#### Scenario: Status from OpenSpec
- **WHEN** the check runs with a stub `openspec`
- **THEN** artifact presence comes from `openspec status --json` and `schema.yaml` is not parsed

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

### Requirement: NFR-OSA-1 Dependencies
The installer and checks MUST be POSIX `sh`; no new runtime dependency beyond `openspec`, `git` and standard utilities (`jq` only if documented as required).

#### Scenario: POSIX only
- **WHEN** the scripts are checked with `sh -n`
- **THEN** they parse and need only openspec, git, jq and standard utilities

### Requirement: NFR-OSA-2 Installer Latency
Install on a project with 0 changes MUST complete within 5 s excluding `openspec` startup.

#### Scenario: Installer latency
- **WHEN** the installer runs on a project with 0 changes
- **THEN** it completes within 5 s excluding `openspec` startup

### Requirement: NFR-OSA-3 Gate Check Latency
The gate check MUST complete within 3 s on a project with 20 active changes, excluding `openspec status` calls.

#### Scenario: Check latency
- **WHEN** the check runs with 20 active changes
- **THEN** it completes within 3 s excluding `openspec status` calls

### Requirement: NFR-OSA-4 Portability
Scripts MUST run on macOS and Linux default shells.

#### Scenario: Portability
- **WHEN** the suites run on macOS and Linux default shells
- **THEN** they pass

### Requirement: NFR-OSA-5 Rails
Installer and check scripts MUST have ≥ 95% line and branch coverage under the existing shell test suite and meet the mutation requirement where a mutation tool is available for the stack.

#### Scenario: Rails
- **WHEN** the shell suites run
- **THEN** line and branch coverage is at least 95% and every manual mutant is killed

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

### Requirement: NFR-OSA-6 Sync Check Latency
The self-copy sync test MUST complete within 2 seconds.

#### Scenario: Sync check budget
- **WHEN** the sync test runs
- **THEN** it completes within 2 seconds

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

### Requirement: NFR-OSA-7 Lint Latency
The docs-link and unused-helper checks MUST complete within 2 seconds combined.

#### Scenario: Lint budget
- **WHEN** both checks run
- **THEN** they complete within 2 seconds

### Requirement: REQ-OSA-25 Fresh-Repo End-to-End
In a new git repository initialised by the real OpenSpec CLI and then wired with `spec-rails`, the combined system MUST: resolve `spec-rails` as the project schema, list the artifacts research, proposal, specs, design and tasks in dependency order for a new change, and make `spec-rails-check` fail a commit that adds a downstream artifact while its upstream Review Gate is unticked and pass once that gate is ticked. `openspec validate` MUST accept the resulting change. When `openspec` or `jq` is unavailable the test MUST report a skip, not a pass.

#### Scenario: Schema resolved and artifact order
- **WHEN** `openspec new change demo` and `openspec status --change demo --json` run in the wired repo
- **THEN** the schema name is `spec-rails` and the artifact ids appear in the order research, proposal, specs, design, tasks

#### Scenario: Unticked gate blocks commit
- **WHEN** `research.md` has an unticked Gate 0 box and `proposal.md` is staged and committed
- **THEN** the pre-commit hook exits non-zero and names the unticked gate

#### Scenario: Ticked gate allows commit
- **WHEN** the Gate 0 box is ticked and committed before `proposal.md`
- **THEN** the commit on a non-main branch succeeds

#### Scenario: Tool missing
- **WHEN** `openspec` or `jq` is not on PATH
- **THEN** the test prints a skip message and exits 0 without claiming a pass

#### Scenario: No residue
- **WHEN** the test finishes or fails
- **THEN** its temp directory is removed and no file outside it has changed

### Requirement: NFR-OSA-8 End-to-End Budget
The fresh-repo end-to-end test MUST complete within 20 seconds on a developer machine and MUST NOT access the network.

#### Scenario: Budget check
- **WHEN** `make test-e2e` runs
- **THEN** it completes within 20 seconds with no network access

### Requirement: REQ-OSA-26 Requirement-to-Test Traceability
`spec-rails-verify` MUST read every `REQ-*` and `NFR-*` key declared under `## ADDED Requirements` or `## MODIFIED Requirements` in the delta specs of each active change (`openspec/changes/*/specs/**/spec.md`, excluding `archive/`) and MUST fail, listing each key, when a key does not appear as text in any file under the directories named by `RAILS_TEST_DIRS` (default `tests`).

#### Scenario: Covered key passes
- **WHEN** an active delta spec declares `REQ-X-1` and a `.feature` file under `tests/` contains `REQ-X-1`
- **THEN** the verifier reports the key as covered and exits 0

#### Scenario: Uncovered key fails
- **WHEN** a declared key appears in no test file
- **THEN** the verifier exits non-zero and prints that key

#### Scenario: No active changes
- **WHEN** there are no active changes
- **THEN** the verifier skips traceability and exits 0

### Requirement: REQ-OSA-27 Task Evidence
For each active change, every ticked (`- [x]`) task line in `tasks.md` that mentions Red, Green, Coverage or Mutation MUST contain `Evidence:` followed by non-empty text. `spec-rails-verify` MUST fail and name the task otherwise. Unticked tasks MUST be ignored.

#### Scenario: Ticked without evidence
- **WHEN** a ticked task says "Red unit tests fail" and has no `Evidence:` text
- **THEN** the verifier exits non-zero and names the task

#### Scenario: Ticked with evidence
- **WHEN** the ticked task ends with `Evidence: make test -> 3 failed`
- **THEN** the verifier passes that task

#### Scenario: Unticked task ignored
- **WHEN** the task is `- [ ]` with no evidence
- **THEN** the verifier does not report it

### Requirement: REQ-OSA-28 Config-Driven Test Commands in CI
When `openspec/spec-rails/rails.conf` defines `RAILS_TEST`, `RAILS_COVERAGE` or `RAILS_MUTATION`, `spec-rails-verify` MUST run each defined command in that order from the repository root and MUST fail on the first non-zero exit, reporting which command failed. An undefined command MUST be skipped with a visible warning. The CI workflow MUST run `spec-rails-verify` and the commit hook MUST NOT.

#### Scenario: Command fails
- **WHEN** `RAILS_COVERAGE` exits 1
- **THEN** the verifier exits non-zero and names `RAILS_COVERAGE`

#### Scenario: Undefined commands
- **WHEN** `rails.conf` is absent or defines no commands
- **THEN** the verifier prints a warning per undefined command and exits 0

#### Scenario: CI only
- **WHEN** the installer runs
- **THEN** the CI workflow contains a `spec-rails-verify` step and the installed git hook does not call it

### Requirement: NFR-OSA-9 Verifier Is Stack-Agnostic
`spec-rails-verify` MUST be POSIX `sh`, MUST NOT invoke any language-specific tool itself, MUST NOT overwrite an existing `rails.conf`, and MUST finish its own checks (excluding configured commands) within 5 seconds on this repository.

#### Scenario: Existing config preserved
- **WHEN** the installer runs on a project whose `rails.conf` was edited
- **THEN** the file is unchanged

#### Scenario: Own-check budget
- **WHEN** `spec-rails-verify` runs with no commands configured
- **THEN** it completes within 5 seconds

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
