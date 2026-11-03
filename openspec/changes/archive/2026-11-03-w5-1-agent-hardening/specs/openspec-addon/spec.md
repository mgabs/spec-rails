# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: NFR-OSA-5 Rails
Installer and check scripts MUST have ≥ 95% line and branch coverage under the existing shell test suite and, where a mutation tool is available for the stack, a mutation kill score greater than 90% (> 90%) on core logic, with every remaining surviving mutant justified in the PR (equivalent mutant or accepted risk). The workflow protocol, schema instructions, templates, and documentation MUST state the same thresholds.

#### Scenario: Rails
- **WHEN** the shell suites run
- **THEN** line and branch coverage is at least 95% and the mutation kill score exceeds 90%

#### Scenario: Survivor justification
- **GIVEN** a mutation run above 90% with surviving mutants
- **WHEN** the PR is reviewed
- **THEN** each surviving mutant is listed with a reason, and killable survivors without a reason block merge

## Review Gate
- [x] **Gate 2 Approval**: Specifications reviewed and approved by human before technical design.
