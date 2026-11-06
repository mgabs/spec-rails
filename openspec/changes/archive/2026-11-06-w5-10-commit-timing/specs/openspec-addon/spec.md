## MODIFIED Requirements

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

## ADDED Requirements

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

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
