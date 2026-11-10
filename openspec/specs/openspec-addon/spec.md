# openspec-addon Specification

## Purpose
Defines how Spec-Rails layers on an OpenSpec project: the `spec-rails` schema, the idempotent installer, and the OpenSpec-native spec model.

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
Every artifact template for `research.md`, `proposal.md`, `design.md`, and `tasks.md` MUST end with a `## Review Gate` section containing an unticked `- [ ]` approval checkbox naming its gate (Gates 0, 1, 2, and 3 respectively). The `spec.md` template MUST NOT contain a `## Review Gate` section so that delta specifications remain 100% pure OpenSpec contracts.

#### Scenario: Gate footers
- **WHEN** any artifact template is read
- **THEN** `research.md`, `proposal.md`, `design.md`, and `tasks.md` end with an unticked `## Review Gate` checkbox, and `spec.md` contains zero `## Review Gate` sections

### Requirement: REQ-OSA-5 Gate Instructions
Each artifact `instruction` MUST carry the Spec-Rails mandatory sections for its gate:
- `research.md` (Gate 0): Intent & Ground Truth, Options Explored (2–3), Tradeoff Matrix, Breaking Changes & Deprecations, Recommendation, and Gate 0 Decision.
- `proposal.md` (Gate 1): Intent, Problem Statement, Scope (In-Scope and Out-of-Scope (YAGNI)), Assumptions, Success Metrics, and Gate 1 Approval.
- `specs` (Pure Delta): OpenSpec delta requirements with stable `REQ-*` and `NFR-*` keys, GIVEN/WHEN/THEN scenarios, with no `## Review Gate` footer; approval is deferred to Gate 2 in `design.md`.
- `design.md` (Gate 2): Overview & Invariants, Domain Models, Architecture Diagram & Data Flow, Boundary Rules (Pure Core vs. I/O Shell), Concurrency/Latency Budgets, Testing Strategy (BDD, Unit >= 95%, Mutation >= 95%), and Gate 2 Approval.
- `tasks.md` (Gate 3): Dependency DAG, Streams & Worktrees, Slice test-first sequence (Contract scaffolding, Red, Green, Coverage, Mutation), Integration & Rebase Plan, and Gate 3 Approval.

#### Scenario: Gate instructions
- **WHEN** an artifact instruction in `schema.yaml` is read
- **THEN** it carries the mandatory sections and gate numbering (Gates 0–3) for that artifact

### Requirement: REQ-OSA-6 Slice Loop
`apply.instruction` MUST direct the agent through the vertical slice progression: Contract scaffolding → Red unit tests → Green implementation + commit → Coverage (>= 95%) and Mutation (>= 95% kill) per slice, and `apply.requires`/`tracks` MUST be `[tasks]` / `tasks.md`. Separate `.feature` file creation tasks and Gate 5.x pauses are removed.

#### Scenario: Slice loop
- **WHEN** `apply.instruction` is read
- **THEN** it orders Contract Scaffolding, Red, Green, coverage, mutation and tracks `tasks.md`

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
Gate 4 MUST use `openspec archive` for spec sync and archival; Spec-Rails MUST NOT copy into or move within any spec directory itself.

#### Scenario: Archive uses OpenSpec
- **WHEN** Gate 4 is executed on a completed change
- **THEN** specs are synced and archived by `openspec archive` with no Spec-Rails copy or move step

### Requirement: REQ-OSA-10 Change Naming
Feature changes MUST be named `<id>-<slug>` with the roadmap ID lowercased and dots replaced by hyphens (e.g. `w3-1-openspec-addon`) to satisfy OpenSpec CLI kebab-case validation.

#### Scenario: Change naming
- **GIVEN** roadmap item `W3.1`
- **WHEN** a feature change is created for `W3.1`
- **THEN** it is named `w3-1-<slug>`

### Requirement: REQ-OSA-11 Prerequisite
`init` MUST require the `openspec` CLI (pinned major.minor) on `PATH` only when `openspec/` is absent, per REQ-POS-6; it MUST NOT require any other tool, and MUST NOT require `openspec` or `spec-rails` for day-to-day work after init. It MUST fail with a non-zero exit and a message, writing nothing, when the target directory does not exist or is not writable.

#### Scenario: Missing prerequisite
- **WHEN** the target directory does not exist
- **THEN** `init` exits non-zero with a message and writes nothing

#### Scenario: Empty directory is valid
- **GIVEN** an existing empty directory and the pinned `openspec` on PATH
- **WHEN** `init` runs
- **THEN** it exits 0 and the OpenSpec tree exists

### Requirement: REQ-OSA-12 Wiring
`init` MUST: bootstrap OpenSpec per REQ-POS-6 when `openspec/` is absent; copy the schema to `openspec/schemas/spec-rails/`; set `schema: spec-rails` in `openspec/config.yaml`; install `openspec/spec-rails/WORKFLOW.md`, `AGENTS.md` and `TODO.md`, the `.agents/skills/spec-rails/SKILL.md` skill, a placeholder `Makefile` (`lint`, `test`, `coverage`, `mutation`), a `.pre-commit-config.yaml` (standard hygiene hooks, branch protection and make-based `lint`/`test` hooks) and `.github/workflows/spec-rails-ci.yml` skeleton when absent; apply the skill overlay of REQ-POS-7; and ensure `.worktrees/` is in `.gitignore`. It MUST refuse pre-planted symlinks inside the target.

#### Scenario: Fresh install
- **GIVEN** an empty git repository and the pinned `openspec` on PATH
- **WHEN** `init` runs
- **THEN** the OpenSpec tree, schema, workflow docs, overlaid skills, `Makefile`, pre-commit config, CI skeleton and `.gitignore` entry exist

### Requirement: REQ-OSA-13 Idempotence
Running `init` any number of times MUST succeed with exit 0 and, after the first run, MUST leave every file byte-identical, without requiring `--force`, regardless of a legacy `spec-rails.config.json`, which MUST be removed on the first run.

#### Scenario: Idempotent re-run
- **GIVEN** a repository where `init` already ran
- **WHEN** `init` runs again
- **THEN** exit 0, no file changes, no error

#### Scenario: Legacy config
- **GIVEN** a repository with `spec-rails.config.json`
- **WHEN** `init` runs
- **THEN** exit 0 and the file is removed

### Requirement: REQ-OSA-14 Non-Destructive Config
`init` MUST preserve existing `openspec/config.yaml` keys other than `schema`, MUST NOT overwrite a developer-edited `Makefile`, `.github/workflows/spec-rails-ci.yml` or `openspec/spec-rails/TODO.md`, MUST only surgically remove legacy hooks from an existing `.pre-commit-config.yaml`, and MUST refresh only files it manages (schema, WORKFLOW.md, AGENTS.md, skills, `docs/agentic-how-tos/`) so a newer spec-rails upgrades them.

#### Scenario: Config preservation
- **WHEN** `config.yaml` has `context` and `rules` and developer-edited hook and CI files exist
- **THEN** those keys and files are unchanged and `schema: spec-rails` is set

### Requirement: REQ-OSA-15 Update Survival
Spec-Rails skills and rules MUST NOT live in files regenerated by `openspec update`.

#### Scenario: Update survival
- **WHEN** a completed install is inspected
- **THEN** Spec-Rails rules and `.agents/skills/spec-rails/SKILL.md` live outside files regenerated by `openspec update`

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
`spec-rails` MUST run on Node.js (>= 18) as a self-contained single-file executable (`dist/cli.js`) with zero runtime production dependencies: libraries MUST be bundled at build time and listed under `devDependencies`. It MUST NOT require `jq` or platform-specific shell utilities, and `openspec` only as stated in REQ-POS-6.

#### Scenario: Running without external jq
- **GIVEN** an environment without `jq` and without `openspec`
- **WHEN** `spec-rails --version` runs, or `spec-rails init` runs on a repo that already has `openspec/`
- **THEN** it executes cleanly and exits 0

#### Scenario: Single-file bundle execution
- **WHEN** the bundled CLI executable (`dist/cli.js`) is invoked
- **THEN** it runs without requiring `node_modules` to be installed in the target project

#### Scenario: Bundled libraries are build-time only
- **GIVEN** `tsup` bundles its libraries into `dist/cli.js`
- **WHEN** `package.json` is read
- **THEN** none of them is listed under `dependencies`

#### Scenario: Node prerequisite stated
- **WHEN** the prerequisites are read in the protocol and installer documentation
- **THEN** they name Node.js >= 18 and the pinned `openspec` needed only for first init, and do not list a shell trampoline

### Requirement: NFR-OSA-2 Installer Latency
Install on a project with 0 changes MUST complete within 5 s excluding `openspec` startup.

#### Scenario: Installer latency
- **WHEN** the installer runs on a project with 0 changes
- **THEN** it completes within 5 s excluding `openspec` startup

### Requirement: NFR-OSA-4 Portability
The installer MUST run on macOS and Linux.

#### Scenario: Portability
- **WHEN** the suites run on macOS and Linux
- **THEN** they pass

### Requirement: NFR-OSA-5 Rails
The installer MUST have ≥ 95% line and branch coverage under their test suite and, where a mutation tool is available for the stack, a mutation kill score of at least 95% (≥ 95%) on core logic, with every remaining surviving mutant justified in the PR (equivalent mutant or accepted risk). The workflow protocol, schema instructions, templates, and documentation MUST state the same thresholds and MUST NOT state any other mutation threshold.

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

### Requirement: REQ-OSA-22 Self-Copy Sync
The repo's installed self-copies (`openspec/schemas/spec-rails/`, `openspec/spec-rails/`, `.agents/skills/spec-rails/SKILL.md`), excluding project-configured `rails.conf`, MUST stay byte-identical to their sources in `schemas/`, `bin/`, `rules/`, `skills/` and `templates/`, and test execution (`npm test`) MUST fail when they differ. This repository's `.github/workflows/spec-rails-ci.yml` is project-owned and is not a copy of the CI template.

#### Scenario: Drift detected
- **WHEN** a source file is changed without updating its installed copy
- **THEN** `npm test` fails naming the differing file

#### Scenario: In sync
- **WHEN** all self-copies match their sources
- **THEN** the sync test passes

### Requirement: NFR-OSA-6 Sync Test Latency
The self-copy sync test MUST complete within 2 seconds.

#### Scenario: Sync test budget
- **WHEN** the sync test runs
- **THEN** it completes within 2 seconds

### Requirement: REQ-OSA-23 Docs Accuracy
README, `docs/` and `skills/` MUST NOT instruct manual copying of schema templates into a change, MUST describe change creation through `openspec new change` and artifact generation through `openspec instructions` or the `openspec-*` skills, and every relative markdown link in them MUST resolve to an existing file.

#### Scenario: Broken link detected
- **WHEN** a doc links to a missing file
- **THEN** `npm test` fails naming the doc and the link

#### Scenario: No manual template copy
- **WHEN** README, `docs/` and `skills/` are searched for `cp openspec/schemas/spec-rails/templates`
- **THEN** no match is found

### Requirement: REQ-OSA-24 No Unused Code
Unused local code MUST NOT compile: `tsconfig.json` MUST enable `noUnusedLocals` and `noUnusedParameters`, and `npm run lint` MUST fail on any unused local, import or parameter.

#### Scenario: Unused helper detected
- **WHEN** a local function is defined and never called
- **THEN** `npm run lint` fails naming the file and function

#### Scenario: All helpers used
- **WHEN** every local is used
- **THEN** `npm run lint` passes

### Requirement: NFR-OSA-7 Lint Latency
The docs-link test and the self-copy test MUST complete within 2 seconds combined.

#### Scenario: Lint budget
- **WHEN** both tests run
- **THEN** they complete within 2 seconds

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
- **THEN** reviewers expect them under `docs/bug-reports/`

### Requirement: REQ-OSA-32 Installer CLI Flags and Symlink Resolution
`spec-rails` MUST expose only the `init [dir] [--tools <list>]` command with `--help` and `--version`; it MUST resolve canonical filesystem paths using Node.js realpath APIs and MUST NOT accept `--stack` or `--force`. `init` MUST prune legacy `openspec/spec-rails/spec-rails-check`, `spec-rails-verify`, `rails.conf` and `spec-rails.config.json` files.

#### Scenario: Symlinked binary and CLI version
- **GIVEN** `spec-rails` invoked via `spec-rails --version` or `spec-rails <target>`
- **WHEN** executed
- **THEN** `--version` prints the version and exits 0, and `<target>` installs cleanly from the resolved bundle root

#### Scenario: Missing openspec directory fails fast
- **GIVEN** a target directory where `openspec/` does not exist
- **WHEN** `spec-rails init` runs
- **THEN** it exits non-zero when `openspec` is also unavailable, otherwise it bootstraps `openspec/` through REQ-POS-6

#### Scenario: Pruning legacy shell scripts and duplicate config
- **GIVEN** an existing repository containing legacy `openspec/spec-rails/spec-rails-check`, `spec-rails-verify`, `rails.conf` or `spec-rails.config.json`
- **WHEN** `spec-rails init` runs
- **THEN** it removes those legacy files and does not seed them

#### Scenario: Only init exists
- **WHEN** `spec-rails --help` runs
- **THEN** only `init` is listed and `check`, `verify` and `audit` are unknown commands

### Requirement: REQ-OSA-33 Contract Scaffolding Rail
Before delegating slice implementation to code generation, shared types, domain interfaces, schemas, and empty function/method signatures MUST be committed on the feature branch or stream to establish rigid boundaries; coding agents MUST only generate logic within the scaffolded contracts without inventing new abstractions or altering signatures.

#### Scenario: Scaffolding precedes implementation
- **GIVEN** a planned vertical slice or module
- **WHEN** implementation begins
- **THEN** contracts, types, and function signatures are already committed and the agent fills method bodies without altering signatures

### Requirement: REQ-OSA-34 Comprehension Verification Gate
At Gate 4 and during code review, the human reviewer MUST verify complete line-by-line understanding of all AI-generated code; any implementation or generated abstraction that the reviewer cannot explain MUST be deleted and reverted rather than merged.

#### Scenario: Uncomprehended code deleted
- **GIVEN** an AI-generated implementation that passes automated tests
- **WHEN** the human reviewer cannot explain how or why the implementation functions
- **THEN** the code is deleted and reverted before Gate 4 sign-off

### Requirement: REQ-OSA-35 Optional Parallel Bake-Off
The multi-agent workflow documentation MUST define an optional candidate bake-off pattern where competing subagents or prompts implement the same slice in parallel Git worktrees (`.worktrees/<id>-cand-a`, `.worktrees/<id>-cand-b`), evaluated on test pass, mutation score, and minimal diff complexity; candidate bake-offs MUST be documented as strictly optional rather than mandatory.

#### Scenario: Optional candidate bake-off evaluation
- **GIVEN** an algorithmic or high-uncertainty feature task
- **WHEN** a team chooses to run a parallel candidate bake-off
- **THEN** competing worktrees are evaluated on rails and diff simplicity, the winner is merged with `--ff-only`, and losers are pruned without blocking teams that choose standard single-stream execution

### Requirement: REQ-OSA-40 Commit Cadence
`rules/WORKFLOW.md`, the `spec-rails` schema instructions and the lifecycle how-to MUST state that commits SHOULD happen once after planning (research through tasks), once after the code (one commit per code slice is fine when there are multiple slices), and once after `openspec archive`, name the exceptions (green slice commits per Rule 4, rebases and stream merges, bugfix and chore lanes), and MUST NOT instruct committing each Review Gate tick before the next artifact. The cadence MUST NOT be enforced by tooling, hooks or CI; reviewers check it.

#### Scenario: Cadence documented consistently
- **WHEN** the protocol, schema instructions and lifecycle how-to are read
- **THEN** each states the planning, code and archive commits as the default and lists the same exceptions

#### Scenario: No per-gate commit instruction
- **WHEN** the shipped docs, schema and templates are searched for an instruction to commit a gate before the next artifact
- **THEN** no such instruction is found

#### Scenario: Multiple code slices
- **WHEN** a change has several code slices
- **THEN** the docs state that one commit per slice is acceptable, each green per Rule 4

#### Scenario: Batched planning is accepted
- **WHEN** all five planning artifacts exist with their gates ticked and are committed in one commit
- **THEN** the human reviewer accepts the batch and no tool rejects it

#### Scenario: Edge case, mid-stage commit is allowed
- **WHEN** a developer commits after a single artifact on a feature branch with a ticked upstream gate
- **THEN** no hook rejects the commit for cadence

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

### Requirement: REQ-OSA-45 Elimination of Shell Binaries and jq Dependency
The system MUST NOT distribute executable shell scripts in `bin/` and MUST NOT require `jq` on `PATH`; all CLI capabilities MUST execute via the compiled TypeScript entry point (`dist/cli.js`), callable via `npx spec-rails` or local binary linking.

#### Scenario: Execution without jq installed
- **GIVEN** an environment where `jq` is absent from `PATH`
- **WHEN** `spec-rails init` runs
- **THEN** it executes without error and the bundle contains no `jq` invocation

### Requirement: REQ-OSA-46 Pre-Commit Framework Standard
`init` MUST NOT write standalone shell scripts to `.git/hooks/pre-commit`. When `.pre-commit-config.yaml` is absent it MUST scaffold it with the standard `pre-commit-hooks` hygiene hooks, a local branch-protection hook for `main`/`master`, and `make lint` / `make test` hooks, each included only when the existing `Makefile` defines that target (a missing `Makefile` is created with all targets); it MUST NOT detect a stack and MUST NOT include any `spec-rails` or `openspec` command. When it exists it MUST surgically remove legacy `spec-rails-check`, `check-lgtm-directives` and `spec-rails-verify` hooks, preserving every other hook, key and blank line, and MUST NOT otherwise overwrite it. When a git repository and `pre-commit` are present it MUST run `pre-commit install` and ensure no `.git/hooks/pre-commit.legacy` remains.

#### Scenario: Installer does not write raw git hook
- **GIVEN** a git repository initialized with `git init`
- **WHEN** `spec-rails init` runs
- **THEN** it does not write a standalone non-framework shell script to `.git/hooks/pre-commit` and leaves no `.legacy` hook file

#### Scenario: Make-based lint and test hooks
- **GIVEN** any repository
- **WHEN** `spec-rails init` scaffolds `.pre-commit-config.yaml`
- **THEN** the lint and test hooks call `make lint` and `make test`, not a stack-specific command, and a hook is omitted when an existing `Makefile` lacks its target

#### Scenario: Branch protection hook in pre-commit
- **GIVEN** `.pre-commit-config.yaml` generated by `spec-rails init`
- **WHEN** inspected
- **THEN** it defines a local branch protection hook that fails on direct commits to `main` and `master`

#### Scenario: Surgical upgrade of existing pre-commit configuration
- **GIVEN** an existing `.pre-commit-config.yaml` with a `spec-rails-check` hook followed by other hooks
- **WHEN** `spec-rails init` runs
- **THEN** the legacy hooks are removed, every other hook keeps all its keys and surrounding blank lines, and the file passes `pre-commit validate-config`

#### Scenario: No-install flag on hook execution
- **GIVEN** `.pre-commit-config.yaml` generated or modernized by `spec-rails init`
- **WHEN** inspected
- **THEN** it contains no `spec-rails` or `openspec` command and no LGTM directives

#### Scenario: Placeholder Makefile
- **GIVEN** no `Makefile`
- **WHEN** `init` runs
- **THEN** the `Makefile` has echo-only `lint`, `test`, `coverage` and `mutation` targets and an existing `Makefile` is left unchanged

### Requirement: REQ-OSA-49 CI Template Hygiene
The CI template MUST NOT call `spec-rails` or `openspec`, MUST NOT install either, and MUST NOT contain a Makefile-only test step. All stack-specific steps MUST be commented out.

#### Scenario: Template is pinned and derived
- **GIVEN** `templates/spec-rails-ci.yml`
- **WHEN** it is inspected
- **THEN** it contains no `spec-rails` or `openspec` invocation or install step, no `make test` step, and stack steps are comments

### Requirement: REQ-OSA-50 Agent Skill Footprint Docs
Docs MUST name the `openspec-*` skills as the way to drive changes, advise committing `.claude/`, `.agents/` and `.github/skills`, and advise keeping skills only for tools in use.

#### Scenario: Docs document skill names
- **GIVEN** `docs/agentic-how-tos/05-configure-ai-agents.md`
- **WHEN** it is read
- **THEN** it documents the skill names and the commit-skills guidance

### Requirement: REQ-OSA-51 Zero-Bypass Commit Rails
The protocol MUST forbid `git commit --no-verify` and `-n` everywhere, including isolated stream worktrees (`.worktrees/<id>-<stream>`). A Red test MUST be committed together with its Green code instead of bypassing hooks.

#### Scenario: Worktree commit still runs hooks
- **GIVEN** an isolated Git worktree under `.worktrees/`
- **WHEN** an intermediate TDD slice is committed
- **THEN** the commit runs all pre-commit hooks and `--no-verify` is not permitted

#### Scenario: Stream merge zero-bypass enforcement
- **GIVEN** a completed stream branch in a worktree ready for integration
- **WHEN** the stream is rebased and merged into the base branch
- **THEN** full pre-commit hooks and testing rails are executed without bypass

### Requirement: REQ-OSA-52 Declarative Command Shapes
All workflow protocols, developer documentation, and agent skills MUST mandate declarative target flags (`git -C <dir>`, package manager prefix flags like `npm --prefix <dir>`, and compiler manifest paths like `cargo --manifest-path <dir>`) rather than chained directory modifications (`cd <dir> && <cmd>`) to preserve shell auto-approvals, sandbox prefix matching, and process tree monitoring.

#### Scenario: Declarative target execution
- **GIVEN** a command targeting a file or repository inside an isolated worktree
- **WHEN** an agent or script executes the command
- **THEN** it specifies the target path via declarative flags without changing the working directory via `cd`

#### Scenario: Chained directory modification prohibited
- **GIVEN** workflow documentation and agent skill guides
- **WHEN** instructions illustrate commands targeting worktrees
- **THEN** `cd <dir> && <cmd>` patterns are strictly avoided in favor of declarative flags

### Requirement: REQ-OSA-53 Subagent Zero-Polling Invariant
Agent orchestration guidelines and skills MUST enforce a zero-polling invariant: agents launching background tasks (such as long-running test suites or mutation analysis) MUST NOT poll status, logs, or transcripts in loops, and MUST halt their turn immediately to rely on reactive wakeup notifications to maintain conversation context below 200,000 tokens.

#### Scenario: Background task dispatch
- **GIVEN** an agent initiating a long-running test or compilation command
- **WHEN** the command is backgrounded
- **THEN** the agent halts tool calls and yields the turn instead of polling task logs or status

#### Scenario: Reactive wakeup
- **GIVEN** an active background task
- **WHEN** the background task completes
- **THEN** the agent resumes execution upon receiving the system message notification

### Requirement: REQ-OSA-55 Developer-Owned Quality Gates
Generated `.pre-commit-config.yaml` hooks and `.github/workflows/spec-rails-ci.yml` MUST NOT invoke, install or otherwise depend on `spec-rails`. `spec-rails-ci.yml` MUST be a language-agnostic skeleton whose steps for unit tests, coverage and mutation are commented out and which performs no work until the developer edits it.

#### Scenario: Generated files have no spec-rails dependency
- **GIVEN** a repository with OpenSpec initialised and no spec-rails installed
- **WHEN** `spec-rails init` runs
- **THEN** `.pre-commit-config.yaml` and `.github/workflows/spec-rails-ci.yml` contain no `spec-rails` invocation

#### Scenario: Skeleton is inert
- **GIVEN** the generated `spec-rails-ci.yml`
- **WHEN** it is inspected
- **THEN** its test, coverage and mutation steps are comments and it contains no stack-specific command

### Requirement: REQ-OSA-56 Gate Setup TODO
`spec-rails init` MUST create `openspec/spec-rails/TODO.md` when absent, prompting the developer to replace the placeholder `Makefile` targets and to configure and enforce coverage and mutation testing, and MUST NOT overwrite it when present.

#### Scenario: TODO created once
- **GIVEN** no `openspec/spec-rails/TODO.md`
- **WHEN** `spec-rails init` runs
- **THEN** the file exists and mentions coverage and mutation

#### Scenario: Existing TODO preserved
- **GIVEN** a developer-edited `openspec/spec-rails/TODO.md`
- **WHEN** `spec-rails init` runs again
- **THEN** its content is unchanged

### Requirement: REQ-OSA-57 Stale Artifact Cleanup
`spec-rails init` MUST remove stale artifacts from earlier versions: the `spec-rails-check`, `spec-rails-verify` and `check-lgtm-directives` pre-commit hooks; the legacy files `spec-rails.config.json`, `rails.conf`, `mutmut.ini`, `openspec/spec-rails/rails.conf`, `openspec/spec-rails/spec-rails-check`, `openspec/spec-rails/spec-rails-verify`, `openspec/spec-rails/mutation/` and `docs/spec-rails/{WORKFLOW,GUIDE,COMMANDS,RAILS}.md`; and `opsx-*` entries under `.github/skills/`; and replace a `spec-rails-ci.yml` that invokes `spec-rails`, `openspec` or `openspec/spec-rails/spec-rails-*` with the skeleton. Shipped docs (`rules/WORKFLOW.md` and `openspec/spec-rails/WORKFLOW.md`) MUST NOT reference `rails.conf`, "checks" or mutmut. Re-running `init` MUST produce no further changes.

#### Scenario: Stale workflow replaced
- **GIVEN** a `spec-rails-ci.yml` calling `sh openspec/spec-rails/spec-rails-verify`
- **WHEN** `spec-rails init` runs
- **THEN** the file is the skeleton and contains no such call

#### Scenario: mutmut files removed
- **GIVEN** a root `mutmut.ini`
- **WHEN** `spec-rails init` runs
- **THEN** it is deleted and no mutmut file is created

#### Scenario: Idempotent upgrade
- **GIVEN** a repository already upgraded
- **WHEN** `spec-rails init` runs again
- **THEN** no file changes

### Requirement: REQ-OSA-58 Init Action Log
`spec-rails init` MUST print one console line per removed, updated or created artifact (and per skipped overlay target that still needs the `openspec` CLI), `already up to date` when nothing changed, and a reminder to complete `openspec/spec-rails/TODO.md` when it was created.

#### Scenario: Actions are logged
- **GIVEN** a repository with a stale workflow and a root `mutmut.ini`
- **WHEN** `spec-rails init` runs
- **THEN** the output lists the removed `mutmut.ini`, the updated workflow, the created `TODO.md` and the reminder to complete it

### Requirement: REQ-OSA-59 Root AGENTS.md Managed Block
`spec-rails init` MUST ensure the root `AGENTS.md` contains a block delimited by `<!-- spec-rails:start -->` and `<!-- spec-rails:end -->` that points agents to `openspec/spec-rails/AGENTS.md` and `WORKFLOW.md`. It MUST create the file when absent, append the block when the markers are absent, replace only the block's content otherwise, and never modify text outside the markers.

#### Scenario: Existing AGENTS.md is preserved
- **GIVEN** a root `AGENTS.md` with developer-written content and no markers
- **WHEN** `spec-rails init` runs twice
- **THEN** the developer content is unchanged and exactly one managed block follows it
