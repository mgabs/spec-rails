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
Feature changes MUST be named `<id>-<slug>` with the roadmap ID lowercased and dots replaced by hyphens (e.g. `w3-1-openspec-addon`) to satisfy OpenSpec CLI kebab-case validation.

#### Scenario: Change naming
- **GIVEN** roadmap item `W3.1`
- **WHEN** a feature change is created for `W3.1`
- **THEN** it is named `w3-1-<slug>`

### Requirement: REQ-OSA-11 Prerequisite
The installer MUST fail with a non-zero exit and a message when the target has no `openspec/` directory, when `openspec` is not on `PATH`, or when its version is below the pinned minimum (`1.15.0`).

#### Scenario: Missing prerequisite
- **WHEN** the target has no `openspec/` directory, no `openspec` on PATH, or a version below 1.15.0
- **THEN** the installer exits non-zero with a message and writes nothing

### Requirement: REQ-OSA-12 Wiring
On a valid target the installer MUST: copy the schema to `openspec/schemas/spec-rails/`; set `schema: spec-rails` in `openspec/config.yaml`; install the pre-commit config, CI workflow, mutation templates, branch-protection hook (supporting standard `.git/` directories and Git worktree `.git` files), Spec-Rails agent rules and `.agents/skills/spec-rails/SKILL.md`; refuse pre-planted symlinks inside the target; and ensure `.worktrees/` is in `.gitignore`.

#### Scenario: Fresh install
- **GIVEN** an initialized OpenSpec target repository
- **WHEN** the installer runs on the target
- **THEN** schema, config, hook, CI, mutation templates, agent rules and `.agents/skills/spec-rails/SKILL.md` are present and `.worktrees/` is ignored

### Requirement: REQ-OSA-13 Idempotence
A second installer run MUST leave all files byte-identical and exit 0.

#### Scenario: Idempotent re-run
- **WHEN** the installer runs a second time
- **THEN** no file changes and exit 0

### Requirement: REQ-OSA-14 Non-Destructive Config
The installer MUST preserve existing `openspec/config.yaml` keys other than `schema`, and MUST NOT overwrite an existing user `.pre-commit-config.yaml`, `.github/workflows/spec-rails-ci.yml`, `openspec/spec-rails/mutation/*` or `openspec/spec-rails/rails.conf` unless `--force` is passed (for CI and mutation templates).

#### Scenario: Config preservation
- **WHEN** `config.yaml` has `context` and `rules` and user `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` exist
- **THEN** those keys and files are unchanged and `schema: spec-rails` is set

### Requirement: REQ-OSA-15 Update Survival
Spec-Rails skills and rules MUST NOT live in files regenerated by `openspec update`.

#### Scenario: Update survival
- **WHEN** a completed install is inspected
- **THEN** Spec-Rails rules and `.agents/skills/spec-rails/SKILL.md` live outside files regenerated by `openspec update`

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
The Spec-Rails CLI and verification tooling (`@openspec/spec-rails`) MUST run on Node.js (>= 18) with OpenSpec on `PATH`, packaged as a self-contained single-file executable (`dist/cli.js`) with zero runtime production dependencies: libraries it uses MUST be bundled at build time and listed under `devDependencies`. The installer and verification tools MUST NOT require external `jq` binaries or platform-specific shell utilities.

#### Scenario: Running without external jq
- **GIVEN** an environment where `jq` is not installed
- **WHEN** `spec-rails --version` or `spec-rails verify` runs
- **THEN** it executes cleanly using native JSON parsing and exits 0

#### Scenario: Single-file bundle execution
- **WHEN** the bundled CLI executable (`dist/cli.js`) is invoked
- **THEN** it runs without requiring `node_modules` to be installed in the target project

#### Scenario: Bundled libraries are build-time only
- **GIVEN** `tsup` bundles `zod`, `cac` and `fast-glob` into `dist/cli.js`
- **WHEN** `package.json` is read
- **THEN** none of them is listed under `dependencies`

#### Scenario: Node prerequisite stated
- **WHEN** the prerequisites are read in the protocol and installer documentation
- **THEN** they name Node.js >= 18 and OpenSpec and do not list a shell trampoline as a requirement

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
Installer and check scripts MUST have ≥ 95% line and branch coverage under their test suite and, where a mutation tool is available for the stack, a mutation kill score of at least 95% (≥ 95%) on core logic, with every remaining surviving mutant justified in the PR (equivalent mutant or accepted risk). The workflow protocol, schema instructions, templates, and documentation MUST state the same thresholds and MUST NOT state any other mutation threshold.

#### Scenario: Rails
- **WHEN** the test and mutation suites run
- **THEN** line and branch coverage is at least 95% and the mutation kill score is at least 95%

#### Scenario: Survivor justification
- **GIVEN** a mutation run at or above 95% with surviving mutants
- **WHEN** the PR is reviewed
- **THEN** each surviving mutant is listed with a reason, and killable survivors without a reason block merge

#### Scenario: Single threshold in shipped docs
- **WHEN** the protocol, schema, skills, templates and docs are searched for a mutation kill threshold
- **THEN** every match states at least 95% and none states 90% or 100%

---

### Requirement: REQ-OSA-21 CI Audit Layout
The CI spec-to-code audit in `templates/spec-rails-ci.yml` MUST treat a PR as spec-backed when it changes any file under an active `openspec/changes/<id>/` (excluding `openspec/changes/archive/`), `openspec/specs/` or `docs/bug-reports/`, MUST treat edits to `openspec/spec-rails/` and `.github/` as audited code changes, MUST bind branch refs via `env:`, and MUST NOT reference `specs/`. Chore-lane branches remain exempt.

#### Scenario: OpenSpec change passes audit
- **WHEN** a PR changes code and a file under `openspec/changes/<id>/`
- **THEN** the audit step exits 0

#### Scenario: Bug report passes audit
- **WHEN** a fix PR changes code and a file under `docs/bug-reports/`
- **THEN** the audit step exits 0

#### Scenario: Code without spec fails audit
- **WHEN** a non-chore PR changes code and no file under `openspec/changes/<id>/`, `openspec/specs/` or `docs/bug-reports/`
- **THEN** the audit step exits 1 and lists the modified files

#### Scenario: Legacy specs path fails audit
- **WHEN** a non-chore PR changes code and a file under `specs/`
- **THEN** the audit step exits 1

### Requirement: REQ-OSA-22 Self-Copy Sync
The repo's installed self-copies (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/SKILL.md`, `.github/workflows/spec-rails-ci.yml`), excluding project-configured `rails.conf`, MUST stay byte-identical to their sources in `schemas/`, `bin/`, `rules/`, `skills/` and `templates/`, and `make test` MUST fail when they differ.

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
In a fresh git repo initialized with real `openspec` and wired with `spec-rails`, the system MUST resolve schema `spec-rails`, order artifacts `research → proposal → specs → design → tasks`, block commits behind unticked Review Gates, pass once ticked, and pass `openspec validate`. A gate counts as passed once its box is ticked in the working tree, without requiring a separate commit of the tick. Missing `openspec` or `jq` MUST report `SKIP`, not a pass.

#### Scenario: Schema resolved and artifact order
- **WHEN** `openspec new change demo` and `openspec status --change demo --json` run in the wired repo
- **THEN** the schema name is `spec-rails` and the artifact ids appear in the order research, proposal, specs, design, tasks

#### Scenario: Unticked gate blocks commit
- **WHEN** `research.md` has an unticked Gate 0 box and `proposal.md` is staged and committed
- **THEN** the pre-commit hook exits non-zero and names the unticked gate

#### Scenario: Ticked gate allows commit
- **WHEN** the Gate 0 box is ticked in `research.md` and `proposal.md` is committed together with it in one commit
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
`spec-rails-verify` MUST read every `REQ-*` and `NFR-*` key (including multi-part hyphenated domains) declared under `## ADDED Requirements` or `## MODIFIED Requirements` in all delta specs (`specs/**/*.md` at any nesting depth) of each active change (excluding `archive/`) and MUST fail, listing each key, when a key does not appear as a full token in any file under `RAILS_TEST_DIRS` (default `tests`), or when `RAILS_TEST_DIRS` is empty.

#### Scenario: Covered key passes
- **WHEN** an active delta spec declares `REQ-X-1` and a `.feature` file under `tests/` contains `@REQ-X-1`
- **THEN** the verifier reports the key as covered and exits 0

#### Scenario: Prefix collision rejected
- **WHEN** an active delta spec declares `REQ-X-1` and `tests/` contains only `@REQ-X-10`
- **THEN** the verifier exits non-zero and prints `REQ-X-1`

#### Scenario: Uncovered key fails
- **WHEN** a declared key appears in no test file
- **THEN** the verifier exits non-zero and prints that key

#### Scenario: No active changes
- **WHEN** there are no active changes
- **THEN** the verifier skips traceability and exits 0

### Requirement: REQ-OSA-27 Task Evidence
For each active change, every ticked (`- [x]` or `- [X]`) task line in `tasks.md` that mentions Red, Green, Coverage or Mutation as a whole word MUST contain non-placeholder `Evidence:` followed by non-empty text, and the shipped `tasks.md` template MUST NOT self-match `Evidence:`. `spec-rails-verify` MUST fail and name the task otherwise. Unticked tasks MUST be ignored.

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

### Requirement: REQ-OSA-31 Store and Path Resolution
`spec-rails-check` and `spec-rails-verify` MUST accept `--store <id>` (and `OPENSPEC_STORE`) and resolve change roots and existing artifact paths from `openspec status --json` (`.changeRoot`, `.artifactPaths`) when available, falling back to repo-local `openspec/changes/<change>` otherwise, while keeping `openspec` `stderr` warnings separate from JSON `stdout`.

#### Scenario: External store change root
- **GIVEN** an OpenSpec change located in an external store (`changeRoot` outside `./openspec/changes/`)
- **WHEN** `spec-rails-check --store <id>` runs
- **THEN** it reads gate states from `.changeRoot` and forwards `--store <id>` to `openspec`

### Requirement: REQ-OSA-32 Installer CLI Flags and Symlink Resolution
`spec-rails init` MUST support `--stack`, `--force`, `--help`, and `--version`, MUST resolve canonical filesystem paths using Node.js realpath APIs, MUST scaffold `spec-rails.config.json`, install skills into `.agents/skills/spec-rails/`, configure `openspec/config.yaml`, and set up pre-commit hooks and workflows invoking `npx spec-rails`.

#### Scenario: Symlinked binary and CLI version
- **GIVEN** `spec-rails` invoked via `spec-rails --version` or `spec-rails <target>`
- **WHEN** executed
- **THEN** `--version` prints the version and exits 0, and `<target>` installs cleanly from the resolved bundle root

### Requirement: REQ-OSA-33 Contract Scaffolding Rail
Before delegating slice implementation to code generation, shared types, domain interfaces, schemas, and empty function/method signatures MUST be committed on the feature branch or stream to establish rigid boundaries; coding agents MUST only generate logic within the scaffolded contracts without inventing new abstractions or altering signatures.

#### Scenario: Scaffolding precedes implementation
- **GIVEN** a planned vertical slice or module
- **WHEN** implementation begins
- **THEN** contracts, types, and function signatures are already committed and the agent fills method bodies without altering signatures

### Requirement: REQ-OSA-34 Comprehension Verification Gate
At Gate 6 and during code review, the human reviewer MUST verify complete line-by-line understanding of all AI-generated code; any implementation or generated abstraction that the reviewer cannot explain MUST be deleted and reverted rather than merged.

#### Scenario: Uncomprehended code deleted
- **GIVEN** an AI-generated implementation that passes automated tests
- **WHEN** the human reviewer cannot explain how or why the implementation functions
- **THEN** the code is deleted and reverted before Gate 6 sign-off

### Requirement: REQ-OSA-35 Optional Parallel Bake-Off
The multi-agent workflow documentation MUST define an optional candidate bake-off pattern where competing subagents or prompts implement the same slice in parallel Git worktrees (`.worktrees/<id>-cand-a`, `.worktrees/<id>-cand-b`), evaluated on test pass, mutation score, and minimal diff complexity; candidate bake-offs MUST be documented as strictly optional rather than mandatory.

#### Scenario: Optional candidate bake-off evaluation
- **GIVEN** an algorithmic or high-uncertainty feature task
- **WHEN** a team chooses to run a parallel candidate bake-off
- **THEN** competing worktrees are evaluated on rails and diff simplicity, the winner is merged with `--ff-only`, and losers are pruned without blocking teams that choose standard single-stream execution

### Requirement: REQ-OSA-36 Multi-Language Presets and Auto-Detection
`spec-rails init` MUST accept `--stack=[auto|ts|python|go|rust]`. When set to `auto` (or omitted), it MUST inspect the target repository root for package manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) and automatically select the corresponding language stack. It MUST scaffold `spec-rails.config.json` with stack-appropriate test commands, test globs, coverage commands, and copy calibrated mutation configs from `templates/presets/`.

#### Scenario: Auto-detect TypeScript project
- **GIVEN** a repository containing `package.json`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `ts` preset, creates `spec-rails.config.json` configured for npm/vitest, and copies `stryker.config.json` calibrated to 95% break threshold

#### Scenario: Auto-detect Python project
- **GIVEN** a repository containing `pyproject.toml`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `python` preset and configures `pytest` and `mutmut`

#### Scenario: Auto-detect Go project
- **GIVEN** a repository containing `go.mod`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `go` preset and configures `go test` and `gremlins`

#### Scenario: Auto-detect Rust project
- **GIVEN** a repository containing `Cargo.toml`
- **WHEN** `spec-rails init` runs
- **THEN** it selects the `rust` preset and configures `cargo test` and `cargo-mutants`

### Requirement: REQ-OSA-37 Canonical Path Sandboxing
Path validation in Spec-Rails MUST resolve target and worktree paths to canonical paths using `fs.realpathSync` rather than rejecting symlinks outright. It MUST verify that resolved project paths reside within the authorized repository boundaries while explicitly permitting symlinks resolving to standard external package stores (e.g. pnpm virtual store) and Git worktree parent metadata.

#### Scenario: pnpm symlinked repository
- **GIVEN** a repository with pnpm symlinked dependencies
- **WHEN** `spec-rails verify` or `spec-rails init` runs
- **THEN** it resolves paths cleanly and does not abort due to symlinks

#### Scenario: Directory traversal attack blocked
- **GIVEN** a target path attempting to escape repository boundaries via symlink traversal
- **WHEN** path canonicalization executes
- **THEN** it aborts with an authorization boundary error

### Requirement: REQ-OSA-38 Configurable Test Glob Discovery
`spec-rails verify` MUST read `testGlobs` from `spec-rails.config.json` (falling back to stack-specific defaults) and discover test files across multiple directories and co-located files (e.g., `src/**/*.test.ts`, `*_test.go`, `tests/**`).

#### Scenario: Co-located Go test discovery
- **GIVEN** a Go project with tests located next to source files (`*_test.go`)
- **WHEN** `spec-rails verify` executes test discovery
- **THEN** it identifies all matching test files without requiring a dedicated `tests/` directory

### Requirement: REQ-OSA-39 Structured Tokenized Evidence Rail
`spec-rails verify` MUST inspect `tasks.md` for structured bracketed evidence tokens formatted as:
`Evidence: [CMD: <cmd>] [EXIT: <code>] [COVERAGE: <num>%] [MUTATION: <num>%]`
Verification MUST assert that `EXIT` is 0, `COVERAGE` is $\ge 95\%$, and `MUTATION` is $\ge 95\%$. Under strict verification (`strict: true`), any missing, unparseable, or substandard evidence line MUST fail verification with a non-zero exit code.

#### Scenario: Valid evidence token verified
- **GIVEN** `tasks.md` containing `Evidence: [CMD: npm test] [EXIT: 0] [COVERAGE: 96%] [MUTATION: 95%]`
- **WHEN** `spec-rails verify` runs
- **THEN** the slice verification passes

#### Scenario: Substandard coverage rejected
- **GIVEN** `tasks.md` containing `Evidence: [CMD: npm test] [EXIT: 0] [COVERAGE: 92%] [MUTATION: 95%]`
- **WHEN** `spec-rails verify` runs
- **THEN** verification fails with an error stating coverage does not meet the 95% threshold

### Requirement: REQ-OSA-40 Commit Cadence
`rules/WORKFLOW.md`, the `spec-rails` schema instructions and the lifecycle how-to MUST state that commits SHOULD happen once after planning (research through tasks), once after the code (one commit per code slice is fine when there are multiple slices), and once after `openspec archive`, name the exceptions (green slice commits per Rule 4, rebases and stream merges, bugfix and chore lanes), and MUST NOT instruct committing each Review Gate tick before the next artifact. The cadence MUST NOT be enforced by `spec-rails-check`, hooks or CI.

#### Scenario: Cadence documented consistently
- **WHEN** the protocol, schema instructions and lifecycle how-to are read
- **THEN** each states the planning, code and archive commits as the default and lists the same exceptions

#### Scenario: No per-gate commit instruction
- **WHEN** the shipped docs, schema and templates are searched for an instruction to commit a gate before the next artifact
- **THEN** no such instruction is found

#### Scenario: Multiple code slices
- **WHEN** a change has several code slices
- **THEN** the docs state that one commit per slice is acceptable, each green per Rule 4

#### Scenario: Batched planning passes the check
- **WHEN** all five planning artifacts exist with their gates ticked and are committed in one commit
- **THEN** `spec-rails-check` exits 0

#### Scenario: Assumption ASM-GEN-3 working-tree check
- **WHEN** a gate is ticked in the working tree but not yet committed
- **THEN** `spec-rails-check` evaluates the ticked state and does not inspect git history

#### Scenario: Edge case, mid-stage commit is allowed
- **WHEN** a developer commits after a single artifact on a feature branch with a ticked upstream gate
- **THEN** the hook does not reject the commit for cadence

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
