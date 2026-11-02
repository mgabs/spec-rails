# Spec-Rails Way of Working (WoW)

> **Spec-Driven, Testing-Railed Development** — An engineering handbook for humans and autonomous AI agents.

> **Where things live**: the gate-by-gate protocol ships with the addon as `openspec/spec-rails/WORKFLOW.md`; change artifacts live in `openspec/changes/<id>-<slug>/`; delivery status (`docs/ROADMAP.md`) and bug reports (`docs/bug-reports/`) live in `docs/`. See [Wiki §1.6](WIKI.md#16-where-things-live-and-why-docs).

---

## 1. Executive Summary & Core Invariants

Spec-Rails transforms AI-assisted software delivery from speculative, prompt-driven chaos into a deterministic, gated assembly line. It guarantees four engineering invariants:

1. **`main` is strictly immutable to direct edits**: Zero code, specs, or docs land directly on `main`. Every commit lands through an isolated lane via `--ff-only`.
2. **Code is a liability, not an asset**: The smallest diff that satisfies formal requirements and passes all rails wins.
3. **No untested code exists**: Code does not exist until a test fails for its absence. Coverage ($\ge 95\%$) is insufficient without a **100% mutation kill score**.
4. **Specs are evergreen living truth**: Specifications live in `openspec/specs/` and change only through OpenSpec delta specs, which `openspec archive` merges upon shipping. See `specs/WORKFLOW.md` §7.

```mermaid
flowchart TD
    subgraph Mindset [1. The Ponytail Discipline]
        YAGNI["Strict YAGNI: Default Answer is 'No'"]
        Liability["Code is Liability: Smallest Diff Wins"]
        Blast["Minimal Blast Radius & Ruthless Deletion"]
    end

    subgraph Lanes [2. Three Dedicated Lanes]
        Feat["Feature Lane: feat/id-slug (Gates 0-6)"]
        Fix["Bugfix Lane: fix/slug (Gates B1-B3)"]
        Chore["Chore Lane: chore/slug (Zero Behavior Change)"]
    end

    subgraph Rails [3. Verification Rails]
        BDD["BDD Given/When/Then (100% Behavior)"]
        RedGreen["Red-First Unit -> Minimal Green (>=95%)"]
        Mutation["100% Mutation Kill Score"]
    end

    subgraph Cockpit [4. LGTM Review Cockpit]
        Directives["#ref file:line Review Directives"]
        Preempt["Pre-Commit Hook Guard (Preemption)"]
        AntiFraud["Anti-Neutering & Anti-Fraud Static Guards"]
    end

    Mindset --> Lanes
    Lanes --> Rails
    Rails <--> Cockpit
```

---

## 2. The Mindset: Ponytail Discipline & Strict YAGNI

Spec-Rails adopts the **Ponytail Mindset** — the pragmatic, ruthless discipline of senior unix hackers who hate unnecessary code and refuse to be paged at 3 AM:

- **Default Answer is "No"**: Push back on speculative, vague, or unneeded requirements before typing code. Challenge requirements during Gate 0 and Gate 1.
- **Boring > Clever**: Choose standard library functions over third-party dependencies. Choose simple iterative loops over complex metaprogramming acrobatics.
- **Strict YAGNI**: Build strictly what the active vertical slice requires. Never add hypothetical abstractions, premature plugin interfaces, or speculative configuration toggles.
- **Minimal Blast Radius**: Touch only files strictly necessary for the active task. Do not reformat unrelated files or rename adjacent symbols.
- **Ruthless Deletion**: Deleting code is superior to adding code. When mutation testing discovers surviving mutants in defensive or unneeded branches, delete the dead code immediately.

---

## 3. The Three Development Lanes

Every unit of work travels down exactly one lane. Identify the lane before touching a single file.

```mermaid
flowchart LR
    Start{What is the change?}
    Start -- New or modified behavior --> F[Feature Lane: feat/id-slug]
    Start -- Contradicts spec / bug --> B[Bugfix Lane: fix/slug]
    Start -- Tooling / formatting / pure docs --> C[Chore Lane: chore/slug]

    F --> FGates[Gates 0 -> 6]
    B --> BGates[Gates B1 -> B3]
    C --> CGates[Pre-Commit & Full Test Suite]
```

### 3.1 Feature Lane (`feat/<id>-<slug>`)
- **Use when**: Adding new functionality, modifying existing user-visible behavior, or refactoring architectural boundaries that impact specifications.
- **Lifecycle**: Gates 0 through 6 (§4).
- **Branch naming**: `feat/<id>-<slug>` (e.g., `feat/w1.1-token-contracts`).
- **Target**: Merged into `main` via `--ff-only` upon completing Gate 6.

### 3.2 Bugfix Lane (`fix/<slug>`)
- **Use when**: Merged production behavior violates written specifications, documentation, or user intent.
- **Lifecycle**: Fast-Track Gates B1 through B3 (§5).
- **Branch naming**: `fix/<slug>` in disposable worktree `.worktrees/fix-<slug>` off `main`.
- **Target**: Merged into `main` via `--ff-only`.

### 3.3 Chore Lane (`chore/<slug>`)
- **Use when**: Zero behavior change — documentation updates, formatting, dependency updates, CI/workflow adjustments, and refactors that leave every existing test unchanged.
- **Lifecycle**: No gates required. Must pass pre-commit hooks, linters, and the full test suite.
- **Branch naming**: `chore/<slug>` (e.g., `chore/way-of-working-doc`, `chore/roadmap-w1.1`).
- **Rule**: If a chore turns out to alter runtime behavior, stop immediately and restart in the Feature or Bugfix lane.

---

## 4. The Feature Lifecycle Playbook (Gates 0 to 6)

Every feature follows 7 human-in-the-loop gates. Agents **never** self-approve or skip gates. A gate is passed only when its markdown artifact is signed off by a human reviewer.

```mermaid
sequenceDiagram
    autonumber
    actor Human as Developer / Human
    participant Agent as Coding Agent
    participant Git as Git Repo / Worktrees

    Human->>Agent: Assign Roadmap ID (W1.1)
    Agent->>Git: Checkout chore/roadmap-w1.1, mark In Progress
    Agent->>Git: Checkout feat/w1.1-slug
    Agent->>Agent: Draft research.md (2-3 options)
    Agent->>Human: Present Gate 0 (Research & Tradeoffs)
    Human-->>Agent: Gate 0 Approved (Go: Option A)

    Agent->>Agent: Draft proposal.md (In-Scope vs Out-of-Scope YAGNI)
    Agent->>Human: Present Gate 1 (Proposal)
    Human-->>Agent: Gate 1 Approved

    Agent->>Agent: Draft openspec/changes/id/spec.md (Full Capability Spec)
    Agent->>Human: Present Gate 2 (Specs)
    Human-->>Agent: Gate 2 Approved

    Agent->>Agent: Draft design.md (Pure Core vs IO Shell)
    Agent->>Human: Present Gate 3 (Design)
    Human-->>Agent: Gate 3 Approved

    Agent->>Agent: Draft tasks.md (DAG & Worktree Stream Partitioning)
    Agent->>Human: Present Gate 4 (Tasks)
    Human-->>Agent: Gate 4 Approved

    loop Per Vertical Slice (Gate 5.x)
        Agent->>Agent: Write Gherkin BDD Scenarios (.feature)
        Agent->>Human: Gate 5.x Approval
        Human-->>Agent: Approved
        Agent->>Agent: Red Unit Test -> Green Code -> Refactor
        Agent->>Agent: Verify Coverage >= 95% & Mutation Kill 100%
        Agent->>Git: Commit Tests + Code Together
    end

    Agent->>Git: Rebase onto main, re-verify all rails
    Agent->>Git: openspec archive (merge deltas into openspec/specs/, archive change)
    Agent->>Git: Merge --ff-only to main
    Agent->>Human: Present Gate 6 (Shipped)
```

### Gate 0: Research & Tradeoffs
- **Artifact**: `openspec/changes/<id>-<slug>/research.md`
- **Goal**: Investigate 2–3 viable technical options, verify ground truth in code/docs, identify breaking changes, and recommend an approach before writing code.
- **Decision**:
  - **Go**: Update `docs/ROADMAP.md` to `🚀 In Progress` via chore lane; proceed to Gate 1.
  - **No-Go**: Commit `research.md` to `openspec/changes/archive/<id>-<slug>/`, mark `❌ Dropped` in roadmap with rationale via chore lane, and delete the feature branch.

### Gate 1: Proposal & YAGNI Boundaries
- **Artifact**: `openspec/changes/<id>-<slug>/proposal.md`
- **Goal**: Lock down the problem, user stories, quantifiable success metrics, and strict **Out-of-Scope (YAGNI)** boundaries.
- **Rule**: Out-of-Scope items in `proposal.md` are binding prohibitions for the remainder of the feature.

### Gate 2: Full Capability Specifications
- **Artifact**: `openspec/changes/<id>-<slug>/specs/<capability>/spec.md`
- **Goal**: Formalize behavioral requirements (`REQ-*`), non-functional requirements (`NFR-*`), and Given/When/Then scenarios.
- **Rule**: **Delta specs**. Write `## ADDED|MODIFIED|REMOVED Requirements` with `### Requirement: REQ-<DOMAIN>-<N> <name>` headers; MODIFIED/REMOVED repeat the existing header exactly. `openspec archive` merges the deltas into `openspec/specs/` at Gate 6.

### Gate 3: Architecture & Design
- **Artifact**: `openspec/changes/<id>-<slug>/design.md`
- **Goal**: Define domain boundaries (Pure Core vs. I/O Shell), data structures, memory/latency budgets, and error recovery contracts.
- **Rule**: Core domain logic must have zero dependencies on I/O, network, or frameworks.

### Gate 4: Tasks DAG & Stream Partitioning
- **Artifact**: `openspec/changes/<id>-<slug>/tasks.md`
- **Goal**: Decompose design into an ordered Directed Acyclic Graph (DAG) of vertical slices.
- **Rule**: Group independent tasks into parallel worktree streams (e.g., Stream A: Core Parser, Stream B: Serializer). Dependent tasks execute sequentially.

### Gate 5.x: Vertical Slice Apply Loop
Each slice `x` runs three non-negotiable steps:
1. **5.x-A (BDD Scenarios)**: Write Gherkin `.feature` tests covering all `REQ-*` invariants. Stop for human Gate 5.x review.
2. **5.x-B (Red-Green-Refactor)**: Write failing unit test (`Red`) verified locally, implement minimal code (`Green`), refactor under green protection. **Red tests are never committed alone**; commit tests + code together. Line & branch coverage must be $\ge 95\%$.
3. **5.x-C (100% Mutation Kill)**: Run mutation analysis on the slice. Every surviving mutant is a blocking defect resolved by targeted assertions, dead code deletion, or equivalent-mutant restructuring.

### Gate 6: Living Spec Sync, Archive & Merge
1. Ensure all stream worktrees are merged, removed, and pruned (`git worktree prune`).
2. Rebase feature branch onto `main` and re-run all test and mutation rails.
3. Run `openspec validate <change>`, then `openspec archive <id>-<slug> --yes` (merges deltas into `openspec/specs/` and archives the change to `openspec/changes/archive/`).
4. Merge feature branch into `main` via `git merge --ff-only`.
5. Mark item `✅ Shipped` in `docs/ROADMAP.md` via chore lane.

---

## 5. The Fast-Track Bugfix Protocol (Gates B1 to B3)

When a defect is discovered in production, do not spawn a feature lifecycle. Use the 3-gate Fast-Track protocol:

```mermaid
flowchart LR
    B1["Gate B1: Bug Report\ndocs/bug-reports/date-slug.md"] --> B2["Gate B2: Red Test First\nFailing regression test"]
    B2 --> B3["Gate B3: Minimal Green\nFix + living spec sync"]
    B3 --> Merge["Rebase & Merge --ff-only to main"]
```

1. **Gate B1 (Bug Report & Reproduction)**:
   - Create isolated worktree: `git worktree add .worktrees/fix-<slug> -b fix/<slug> main`.
   - Copy `templates/bug-report.md` to `docs/bug-reports/<YYYY-MM-DD>-<slug>.md`.
   - Fill in actual behavior, expected behavior, root cause hypothesis, and affected `REQ-*`. Stop for human sign-off.
2. **Gate B2 (Red Regression Test First)**:
   - Write a unit or integration regression test that reproduces the defect.
   - Run the test suite against unmodified production code and demonstrate the test failing.
   - Do not commit the red test alone.
3. **Gate B3 (Green Fix, Spec Sync & Cleanup)**:
   - Implement the minimal fix to turn the test green (Ponytail discipline).
   - If the bug altered capability requirements, update the corresponding `openspec/specs/<capability>/spec.md`.
   - Commit regression test + fix + living spec together in a single atomic commit.
   - Rebase onto `main`, merge `--ff-only`.
   - Remove worktree: `git worktree remove .worktrees/fix-<slug>`, delete branch `git branch -d fix/<slug>`, and run `git worktree prune`.

---

## 6. Multi-Agent Git Worktree Parallelism

When Gate 4 identifies orthogonal streams, execute them in parallel Git worktrees without repository contamination:

```text
spec-rails/                           <-- Root worktree (main or feat/<id>)
├── .worktrees/
│   ├── w1.1-stream-a/           <-- Isolated worktree for Stream A (feat/w1.1/a)
│   └── w1.1-stream-b/           <-- Isolated worktree for Stream B (feat/w1.1/b)
```

### Worktree Invariants
- **Contract Lock First**: Shared types, interfaces, and contracts must be committed to the feature branch *before* worktrees are spawned. Streams code against locked contracts.
- **Ignored Directory**: `.worktrees/` must always be listed in `.gitignore`.
- **Zero Config Mutation**: Worktree operations must never mutate shared repository config.
- **Subagent Gate Escalation**: Subagents working in worktrees **never** self-approve gates. When a slice is ready for review, the subagent halts and escalates to the orchestrating agent to obtain human approval.
- **Sequential Integration**:
  - Stream 1 merges into the feature branch `--ff-only`.
  - Stream 2 rebases onto the updated feature branch, re-runs its test and mutation rails, and merges `--ff-only`.
  - Immediately remove worktree and prune:
    ```bash
    git worktree remove .worktrees/<id>-<stream>
    git branch -d feat/<id>/<stream>
    git worktree prune
    ```

---

## 7. The Review Cockpit: [mgabs/lgtm](https://github.com/mgabs/lgtm) Steering & Preemption

Spec-Rails pairs natively with `mgabs/lgtm` for real-time diff review and agent steering.

### Directive Preemption Protocol
Reviewers inject line-anchored chords into diffs:
```text
#ref path/to/file.rs:42 [ca] Add edge case test for empty byte slice
#ref path/to/service.py:88 [cs] Unsanitized parameter passed to shell
#ref path/to/module.ts:15 [cr] Delete unused helper function (YAGNI)
```
- **Preemption Rule**: When active directives exist in `.lgtm/reviews/` or chat, **all task execution halts**. The agent resolves directives, verifies tests, and clears the review file before resuming forward progress.
- **Pre-Commit Enforcement**: The pre-commit hook automatically halts `git commit` if any `#ref` directives remain in `.lgtm/reviews/`.

### Anti-Fraud & Test Neutering Guardrails
`lgtm` static guards reject pull requests and commits that attempt to cheat testing rails:
- **Test Neutering**: Deleting assertions, weakening bounds, commenting out tests, or adding `.skip` / `@Ignore` annotations.
- **Vacuous Mocks**: Assertions that assert mock returns against themselves (`assert mock.call() == mock.call()`).
- **Dead Code Additions**: Adding functions or methods with zero call-sites across the codebase.

---

## 8. Verification Rails & Pre-Commit Standards

Every repository initialized with `spec-rails` contains active pre-commit and CI verification rails:

### Pre-Commit Standards
- Pre-commit hooks run automatically on every `git commit`.
- **Zero-Bypass Policy**: `git commit --no-verify` or `-n` is strictly forbidden. If a check fails, resolve the defect.

### Mutation Testing Rails
- **100% Mutation Kill Score** on domain logic, zero exemptions.
- Reference configurations in `templates/mutation/`:
  - **Rust**: [templates/mutation/cargo-mutants.toml](file:///Users/mmetawea/Workbench/spec-rails/templates/mutation/cargo-mutants.toml)
  - **JS / TS**: [templates/mutation/stryker.config.json](file:///Users/mmetawea/Workbench/spec-rails/templates/mutation/stryker.config.json)
  - **Python**: [templates/mutation/mutmut.ini](file:///Users/mmetawea/Workbench/spec-rails/templates/mutation/mutmut.ini)

---

## 9. Communication Standards (Caveman Style)

When pair-programming or coordinating agents:
- **Caveman Communication**: Short, blunt, extremely direct. Absolute fewest words possible.
- **No Fluff**: No pleasantries, no apologies, no conversational filler, no narration of internal steps.
- **Clickable Links**: Always link referenced files using GitHub-style markdown links (`[file.ext](file:///abs/path)`).

---

## 10. Anti-Patterns & Hard Prohibitions

| Violation | Why It Is Forbidden | Remedy |
| :--- | :--- | :--- |
| **Direct commit on `main`** | Contaminates production, bypasses rebase verification | Enforced by pre-commit hook; checkout dedicated lane branch |
| **Committing Red tests alone** | Leaves broken commits in git history, breaks bisecting | Commit Red test together with Green implementation |
| **Full-copy spec duplicates** | Duplicates ground truth and drifts from OpenSpec | Delta specs merged by `openspec archive` at Gate 6 |
| **Surviving mutant excuses** | Surviving mutants prove missing assertions or dead code | Kill mutant with test, delete dead code, or restructure |
| **Subagent gate self-approval** | Eliminates human-in-the-loop safety | Halt and escalate to orchestrating agent for human sign-off |
| **Stale worktrees lingering** | Causes `.git/index.lock` collisions and disk bloat | Run `git worktree remove` and `git worktree prune` after every merge |
| **Unsolicited architecture** | Violates YAGNI, inflates maintenance cost | Build only what is specified; delete speculative code |
