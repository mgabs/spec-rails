# Spec Delta: Worktree Execution Rails & Subagent Hygiene (W6.5)

## ADDED Requirements

### Requirement: REQ-OSA-51 Worktree Intermediate Commit Rails
In multi-agent and parallel development workflows, intermediate atomic commits within isolated Git worktrees (`.worktrees/<id>-<stream>`) MAY bypass local commit hooks (`git commit --no-verify`) to facilitate fine-grained test-driven development (such as committing failing Red tests); however, stream merges into the base feature branch, feature merges into `main`, and Gate 4 verification MUST strictly enforce all pre-commit hooks and testing rails with zero bypass.

#### Scenario: Intermediate slice commit in worktree
- **GIVEN** an isolated Git worktree under `.worktrees/`
- **WHEN** an intermediate TDD slice or Red reproduction commit is created
- **THEN** `--no-verify` is permitted to commit failing Red tests or partial slice progress without triggering full pre-commit blocks

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
