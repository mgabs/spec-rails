# Spec Delta

## MODIFIED Requirements

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
`init` MUST: bootstrap OpenSpec per REQ-POS-6 when `openspec/` is absent; copy the schema to `openspec/schemas/spec-rails/`; set `schema: spec-rails` in `openspec/config.yaml`; install `openspec/spec-rails/WORKFLOW.md`, `AGENTS.md` and `TODO.md`, the `.agents/skills/spec-rails/SKILL.md` skill, an inert `.pre-commit-config.yaml` (branch protection only) and `.github/workflows/spec-rails-ci.yml` skeleton when absent; apply the skill overlay of REQ-POS-7; and ensure `.worktrees/` is in `.gitignore`. It MUST refuse pre-planted symlinks inside the target.

#### Scenario: Fresh install
- **GIVEN** an empty git repository and the pinned `openspec` on PATH
- **WHEN** `init` runs
- **THEN** the OpenSpec tree, schema, workflow docs, overlaid skills, pre-commit config, CI skeleton and `.gitignore` entry exist

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
`init` MUST preserve existing `openspec/config.yaml` keys other than `schema`, MUST NOT overwrite a developer-edited `.pre-commit-config.yaml`, `.github/workflows/spec-rails-ci.yml` or `openspec/spec-rails/TODO.md`, and MUST refresh only files it manages (schema, WORKFLOW.md, AGENTS.md, skills) so a newer spec-rails upgrades them.

#### Scenario: Config preservation
- **WHEN** `config.yaml` has `context` and `rules` and developer-edited hook and CI files exist
- **THEN** those keys and files are unchanged and `schema: spec-rails` is set

### Requirement: REQ-OSA-32 Installer CLI Flags and Symlink Resolution
`spec-rails` MUST expose only the `init [dir] [--tools <list>]` command with `--help` and `--version`; it MUST resolve canonical filesystem paths using Node.js realpath APIs and MUST NOT accept `--stack` or `--force`. `init` MUST scaffold developer documentation in `docs/spec-rails/GUIDE.md`, `COMMANDS.md` and `RAILS.md`, and prune legacy `openspec/spec-rails/spec-rails-check`, `spec-rails-verify`, `rails.conf` and `spec-rails.config.json` files.

#### Scenario: Symlinked binary and CLI version
- **GIVEN** `spec-rails` invoked via `spec-rails --version` or `spec-rails <target>`
- **WHEN** executed
- **THEN** `--version` prints the version and exits 0, and `<target>` installs cleanly from the resolved bundle root

#### Scenario: Missing openspec directory fails fast
- **GIVEN** a target directory where `openspec/` does not exist
- **WHEN** `spec-rails init` runs
- **THEN** it exits non-zero when `openspec` is also unavailable, otherwise it bootstraps `openspec/` through REQ-POS-6

#### Scenario: Scaffolds target developer guide
- **GIVEN** a target directory
- **WHEN** `spec-rails init` runs
- **THEN** it creates `docs/spec-rails/GUIDE.md`, `docs/spec-rails/COMMANDS.md`, and `docs/spec-rails/RAILS.md`

#### Scenario: Pruning legacy shell scripts and duplicate config
- **GIVEN** an existing repository containing legacy `openspec/spec-rails/spec-rails-check`, `spec-rails-verify`, `rails.conf` or `spec-rails.config.json`
- **WHEN** `spec-rails init` runs
- **THEN** it removes those legacy files and does not seed them

#### Scenario: Only init exists
- **WHEN** `spec-rails --help` runs
- **THEN** only `init` is listed and `check`, `verify` and `audit` are unknown commands

### Requirement: REQ-OSA-46 Pre-Commit Framework Standard
`init` MUST NOT write standalone shell scripts to `.git/hooks/pre-commit`. When `.pre-commit-config.yaml` is absent it MUST scaffold it with only a local branch-protection hook for `main`/`master` and a commented placeholder for the developer's test hook; it MUST NOT detect a stack and MUST NOT include any `spec-rails` or `openspec` command. When it exists it MUST surgically remove legacy `spec-rails-check`, `check-lgtm-directives` and `spec-rails-verify` hooks, preserving every other hook, key and blank line, and MUST NOT otherwise overwrite it. When a git repository and `pre-commit` are present it MUST run `pre-commit install` and ensure no `.git/hooks/pre-commit.legacy` remains.

#### Scenario: Installer does not write raw git hook
- **GIVEN** a git repository initialized with `git init`
- **WHEN** `spec-rails init` runs
- **THEN** it does not write a standalone non-framework shell script to `.git/hooks/pre-commit` and leaves no `.legacy` hook file

#### Scenario: Stack-aware test hook generation
- **GIVEN** any repository
- **WHEN** `spec-rails init` scaffolds `.pre-commit-config.yaml`
- **THEN** the test hook is a commented placeholder, not a stack-specific command

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

#### Scenario: Placeholder only
- **GIVEN** no `.pre-commit-config.yaml`
- **WHEN** `init` runs
- **THEN** the file has the branch-protection hook and a commented test-hook placeholder

### Requirement: REQ-OSA-49 CI Template Hygiene
The CI template MUST NOT call `spec-rails` or `openspec`, MUST NOT install either, and MUST NOT contain a Makefile-only test step. All stack-specific steps MUST be commented out.

#### Scenario: Template is pinned and derived
- **GIVEN** `templates/spec-rails-ci.yml`
- **WHEN** it is inspected
- **THEN** it contains no `spec-rails` or `openspec` invocation or install step, no `make test` step, and stack steps are comments

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

## REMOVED Requirements

### Requirement: REQ-OSA-16 Gate Check
**Reason**: Quality gates are developer-owned; spec-rails no longer ships a check engine.
**Migration**: Delete `spec-rails check`; developers wire their own hooks and CI.

### Requirement: REQ-OSA-17 Lane Check
**Reason**: Runtime check engine removed.
**Migration**: None.

### Requirement: REQ-OSA-18 Status Source
**Reason**: Status came from the `openspec` CLI, which is no longer used.
**Migration**: Skills read change directories directly.

### Requirement: REQ-OSA-25 Fresh-Repo End-to-End
**Reason**: Depended on the real `openspec` CLI and gate blocking; replaced by REQ-OSA-13 and REQ-POS-6.
**Migration**: Use the idempotent `init` tests.

### Requirement: REQ-OSA-26 Requirement-to-Test Traceability
**Reason**: Verifier removed.
**Migration**: Developer-owned.

### Requirement: REQ-OSA-27 Task Evidence
**Reason**: Verifier removed.
**Migration**: Developer-owned.

### Requirement: REQ-OSA-36 Multi-Language Presets and Auto-Detection
**Reason**: Presets and stack detection only served the removed runtime commands.
**Migration**: Developer fills `TODO.md`.

### Requirement: REQ-OSA-37 Canonical Path Sandboxing
**Reason**: Applied to worktree verification, which is removed; init path handling is covered by REQ-OSA-32.
**Migration**: None.

### Requirement: REQ-OSA-38 Configurable Test Glob Discovery
**Reason**: Verifier removed.
**Migration**: None.

### Requirement: REQ-OSA-39 Structured Tokenized Evidence Rail
**Reason**: Verifier removed.
**Migration**: None.

### Requirement: REQ-OSA-42 Native TypeScript Gate and DAG Checker
**Reason**: Check engine removed.
**Migration**: None.

### Requirement: REQ-OSA-43 Integrated Spec-to-Code Audit
**Reason**: `audit` removed.
**Migration**: None.

### Requirement: REQ-OSA-44 Config JSON and Legacy Rails.conf Deprecation
**Reason**: No configuration file exists any more.
**Migration**: `init` deletes `spec-rails.config.json` and `rails.conf`.

### Requirement: REQ-OSA-47 Strict Rails Execution
**Reason**: Rails execution removed.
**Migration**: Developer-owned gates.

### Requirement: REQ-OSA-48 Gate Check Baseline
**Reason**: Check engine removed.
**Migration**: None.

### Requirement: REQ-OSA-49 Artifact Hygiene and Delta Requirement Key Validation
**Reason**: Enforced by `check`, which is removed.
**Migration**: Reviewers and the skills' guidance.

### Requirement: REQ-OSA-54 Gradle and Kotlin Stack Auto-Detection
**Reason**: Stack detection removed.
**Migration**: None.

### Requirement: NFR-OSA-3 Gate Check Latency
**Reason**: Check engine removed.
**Migration**: None.

### Requirement: NFR-OSA-8 End-to-End Budget
**Reason**: End-to-end test removed with REQ-OSA-25.
**Migration**: None.

### Requirement: NFR-OSA-9 Verifier Is Stack-Agnostic
**Reason**: Verifier removed.
**Migration**: None.
