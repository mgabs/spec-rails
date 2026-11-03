## MODIFIED Requirements

### Requirement: NFR-OSA-1 Dependencies
The Spec-Rails CLI and verification tooling (`@openspec/spec-rails`) MUST run on Node.js (>= 18) packaged as a self-contained single-file executable (`dist/cli.js`) with zero runtime production dependencies. The installer and verification tools MUST NOT require external `jq` binaries or platform-specific shell utilities. Shell scripts in `bin/spec-rails` MUST serve as lightweight trampolines invoking `node dist/cli.js` or `npx spec-rails`.

#### Scenario: Running without external jq
- **GIVEN** an environment where `jq` is not installed
- **WHEN** `spec-rails --version` or `spec-rails verify` runs
- **THEN** it executes cleanly using native JSON parsing and exits 0

#### Scenario: Single-file bundle execution
- **WHEN** the bundled CLI executable (`dist/cli.js`) is invoked
- **THEN** it runs without requiring `node_modules` to be installed in the target project

### Requirement: NFR-OSA-5 Rails
Installer and check scripts MUST have ≥ 95% line and branch coverage under their test suite and, where a mutation tool is available for the stack, a mutation kill score of at least 95% (≥ 95%) on core logic, with every remaining surviving mutant justified in the PR (equivalent mutant or accepted risk). The workflow protocol, schema instructions, templates, and documentation MUST state the same thresholds.

#### Scenario: Rails
- **WHEN** the test and mutation suites run
- **THEN** line and branch coverage is at least 95% and the mutation kill score is at least 95%

#### Scenario: Survivor justification
- **GIVEN** a mutation run at or above 95% with surviving mutants
- **WHEN** the PR is reviewed
- **THEN** each surviving mutant is listed with a reason, and killable survivors without a reason block merge

---

## ADDED Requirements

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


## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
