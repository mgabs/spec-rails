# Spec Delta

## MODIFIED Requirements

### Requirement: REQ-OSA-4 Gate Footers
Every artifact template for `research.md`, `proposal.md`, `design.md`, and `tasks.md` MUST end with a `## Review Gate` section containing an unticked `- [ ]` approval checkbox naming its gate (Gates 0, 1, 2, and 3 respectively). The `spec.md` template MUST NOT contain a `## Review Gate` section so that delta specifications remain 100% pure OpenSpec contracts.

#### Scenario: Planning gate footers
- **WHEN** `research.md`, `proposal.md`, `design.md`, or `tasks.md` template is read
- **THEN** it ends with an unticked `## Review Gate` checkbox naming its gate (Gate 0, 1, 2, or 3)

#### Scenario: Pure spec delta template
- **WHEN** `spec.md` template is read
- **THEN** it contains zero `## Review Gate` sections or checkboxes

### Requirement: REQ-OSA-5 Gate Instructions
Each artifact `instruction` MUST carry the Spec-Rails mandatory sections for its gate:
- `research.md` (Gate 0): Intent & Ground Truth, Options Explored (2–3), Tradeoff Matrix, Breaking Changes & Deprecations, Recommendation, and Gate 0 Decision.
- `proposal.md` (Gate 1): Intent, Problem Statement, Scope (In-Scope and Out-of-Scope (YAGNI)), Assumptions, Success Metrics, and Gate 1 Approval.
- `specs` (Pure Delta): OpenSpec delta requirements with stable `REQ-*` and `NFR-*` keys, GIVEN/WHEN/THEN scenarios, with no `## Review Gate` footer; approval is deferred to Gate 2 in `design.md`.
- `design.md` (Gate 2): Overview & Invariants, Domain Models, Architecture Diagram & Data Flow, Boundary Rules (Pure Core vs. I/O Shell), Concurrency/Latency Budgets, Testing Strategy (BDD, Unit >= 95%, Mutation >= 95%), and Gate 2 Approval.
- `tasks.md` (Gate 3): Dependency DAG, Streams & Worktrees, Slice test-first sequence (`Contract scaffolding → Red → Green → Coverage & Mutation`), Integration & Rebase Plan, and Gate 3 Approval.

#### Scenario: Gate instructions alignment
- **WHEN** an artifact instruction in `schema.yaml` is read
- **THEN** it specifies the exact mandatory sections and gate numbering (Gates 0–3) for that artifact

### Requirement: REQ-OSA-6 Slice Loop
`apply.instruction` MUST direct the agent through the vertical slice progression: Contract scaffolding → Red unit tests → Green implementation + commit → Coverage (>= 95%) and Mutation (>= 95% kill) per slice, and `apply.requires`/`tracks` MUST be `[tasks]` / `tasks.md`. Separate `.feature` file creation tasks and Gate 5.x pauses are removed.

#### Scenario: Simplified slice progression
- **WHEN** `apply.instruction` is read
- **THEN** it defines slice execution as Contract Scaffolding → Red → Green → Coverage & Mutation without `.feature` or Gate 5.x pauses

### Requirement: REQ-OSA-16 Gate Check
`spec-rails check` MUST inspect active changes and fail with a non-zero exit code if any Review Gate (Gate 0 in `research.md`, Gate 1 in `proposal.md`, Gate 2 in `design.md`, or Gate 3 in `tasks.md`) is unticked while a downstream artifact exists, or if implementation tasks are ticked before Gate 3 passes. It MUST NOT require or inspect a `## Review Gate` section within `spec.md`. It MUST run natively in TypeScript under Node.js >= 18 without requiring `jq` or external shell interpreters.

#### Scenario: Unticked gate blocks downstream
- **GIVEN** an active change with an unticked Gate 1 box in `proposal.md` while `design.md` or `tasks.md` exists
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero naming the change and the gate

#### Scenario: Spec files do not require Review Gate
- **GIVEN** an active change where `specs/**/*.md` exists without a `## Review Gate` section
- **WHEN** `spec-rails check` runs
- **THEN** it does not report missing Review Gate errors on spec files

#### Scenario: Gate 3 blocks implementation tasks
- **GIVEN** an active change with ticked implementation tasks in `tasks.md` while Gate 3 in `tasks.md` is unticked
- **WHEN** `spec-rails check` runs
- **THEN** it exits non-zero reporting Gate 3 (tasks) unticked
