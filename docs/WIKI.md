# Spec-Rails Wiki: Spec-Driven, Testing-Railed Development

Spec-Rails (Spec-Driven, Testing-Railed Development) is an engineering and AI-agent orchestration framework designed to eliminate hallucinated scope, stale documentation, untested regressions, and branch contamination in autonomous and pair-programming development.

For the comprehensive operational handbook, see [WAY_OF_WORKING.md](WAY_OF_WORKING.md). Delivery status: [ROADMAP.md](ROADMAP.md); design note: [DESIGN.md](DESIGN.md).

---

## 1. Core Principles

### 1.1 The Ponytail Discipline (Strict YAGNI)
- **Zero Unsolicited Architecture**: Build strictly what the active capability requires. Never introduce hypothetical abstractions, premature plugin frameworks, or configurable toggles before a concrete requirement demands them.
- **Minimal Blast Radius**: Code changes must touch only the files strictly necessary to satisfy the active vertical slice.

### 1.2 Zero-Contamination Isolation
- Production branches (`main` / `master`) are immutable to direct edits; everything lands via `--ff-only` after rebase + re-verification.
- Three lanes: features (`feat/<id>-<slug>`, Gates 0–6), bugfixes (`fix/<slug>`, Gates B1–B3), chores (`chore/<slug>`, zero behavior change, no gates).
- Concurrent subagent execution occurs in dedicated Git worktrees (`.worktrees/<id>-<stream>`).
- Bugfixes occur in dedicated bugfix worktrees (`.worktrees/fix-<slug>`) branching directly off the base branch, preventing feature-branch bleed into hotfixes.

### 1.3 Testing Rails (Red-First & >= 95% Mutation Kill)
- Code does not exist until a test fails for its absence.
- Red tests are verified locally, never committed alone; they ship in the same commit as the Green code, so every branch tip stays green.
- Coverage metrics ($\ge 95\%$ line & branch) are necessary but insufficient.
- Every logical branch must undergo mutation analysis (>= 95% mutation kill score on core business logic). Any surviving mutant below threshold is treated as a blocking bug.

### 1.4 Living Specifications
- Specs are not discarded design documents.
- Feature specs are OpenSpec delta specs; `openspec archive` merges them into `openspec/specs/` at Gate 6, keeping an evergreen, authoritative ground truth with no hand-copied files.

### 1.5 Pre-Commit Verification & Zero-Bypass Protocol
- Every project must maintain active pre-commit hooks (`.pre-commit-config.yaml`).
- Before any commit: inspect `git status` / `git diff`, run all linters, and execute all tests.
- Never bypass hooks using `git commit --no-verify` or `-n`. If a check fails, resolve the defect before committing.

### 1.6 Where Things Live (and Why `docs/`)
There is no `specs/` folder. Each artifact has one home, chosen by who owns it:

| Artifact | Home | Why |
| :--- | :--- | :--- |
| Capability specs, changes, archive | `openspec/specs/`, `openspec/changes/` | OpenSpec owns them; identical to upstream OpenSpec, so the CLI works unchanged. |
| Schema and templates | `openspec/schemas/spec-rails/` | The artifact graph is OpenSpec's extension point. |
| Protocol (`WORKFLOW.md`), `AGENTS.md`, `rails.conf`, checks | `openspec/spec-rails/` | Same text for every adopter, so it ships with the addon and survives `openspec update`. Agents in a target repo can actually read it. |
| Delivery status (`ROADMAP.md`) | `docs/` | Per-project data that spans changes; upstream OpenSpec has no roadmap concept, so it does not belong in `openspec/`. |
| Bug reports (`bug-reports/`) | `docs/` | Per-project triage records with no OpenSpec equivalent; a docs path is also what the CI audit accepts as spec-backing for fix PRs. |

Why `docs/` rather than `specs/`: `specs/` was easily confused with `openspec/specs/` (living specs), and it mixed the addon's protocol with project data. `docs/` is the conventional place humans look for project records, needs no new top-level folder, and keeps `openspec/` pure.

### 1.7 Specs Structure
Two kinds of spec exist: **delta specs** (proposed, inside a change) and **living specs** (shipped, under `openspec/specs/`). Everything is plain Markdown.

```text
openspec/
├── config.yaml                          # schema: spec-rails
├── specs/                               # LIVING specs: shipped ground truth
│   └── <capability>/spec.md             #   one folder per capability (e.g. openspec-addon)
├── changes/
│   ├── <id>-<slug>/                     # ONE ACTIVE CHANGE (e.g. w1-2-data-ingestion)
│   │   ├── research.md                  #   Gate 0: options, tradeoffs, Go/No-Go
│   │   ├── proposal.md                  #   Gate 1: intent, scope, YAGNI exclusions
│   │   ├── specs/<capability>/spec.md   #   Gate 2: DELTA spec for that capability
│   │   ├── design.md                    #   Gate 3: architecture, budgets, test strategy
│   │   └── tasks.md                     #   Gate 4: DAG, streams, vertical slices
│   └── archive/YYYY-MM-DD-<id>-<slug>/  # finished or dropped changes (same five artifacts)
├── schemas/spec-rails/                  # schema + artifact templates (installed copy)
└── spec-rails/                          # WORKFLOW.md, AGENTS.md, rails.conf, checks
```

**Lifecycle of a spec**
1. A change creates a delta at `openspec/changes/<id>-<slug>/specs/<capability>/spec.md` (Gate 2).
2. The delta uses `## ADDED`, `## MODIFIED`, `## REMOVED` or `## RENAMED Requirements`. A MODIFIED block repeats the full updated requirement and its exact header.
3. At Gate 6, `openspec archive` merges the requirement blocks into `openspec/specs/<capability>/spec.md` and moves the change folder into `changes/archive/`. Other sections, such as the `## Review Gate` footer, stay in the archive and are not merged.
4. A bugfix that alters a living requirement edits `openspec/specs/` directly in the same branch (B3), with no delta.

**Conventions**
- **Change naming:** roadmap IDs normalize dots to hyphens (`W1.2` → `w1-2-<slug>`, branch `feat/w1-2-<slug>`) so `openspec new change` (`[a-z0-9-]+` only) accepts them.
- **Capability path:** the folder name under `specs/` (for example `identity/user-auth`). A modified capability uses the exact existing path.
- **Requirement header:** `### Requirement: REQ-<DOMAIN>-<N> <Name>` (or `NFR-<DOMAIN>-<N>` for budgets). Keys are never reused; deprecated ones keep their exact header in `## MODIFIED Requirements` and place `**[DEPRECATED by <change>]**` at the start of the requirement body (or use `## RENAMED Requirements` when changing a header).
- **Wording and scenarios:** requirement text uses MUST or SHALL. Scenarios use exactly four hashtags (`#### Scenario:`) with WHEN and THEN.
- **New capabilities:** a delta for a new capability starts with `## Purpose`. Never add it to a delta for an existing capability.
- **Gates:** each artifact ends with an unticked `## Review Gate` box; a human ticks it before the next artifact is created. Commits follow stage boundaries: after planning, after the code (per slice is fine), and after archive.

**Not specs:** the roadmap and bug reports are project records under `docs/` (see §1.6).

---

## 2. Gate Architecture

Spec-Rails enforces 7 human-in-the-loop gates for features (Gates 0–6) and 3 fast-track gates for defects (Gates B1–B3).

```mermaid
flowchart TD
    subgraph Feature_Track [Feature Track]
        G0[Gate 0: Research & Tradeoffs] --> G1[Gate 1: Proposal]
        G1 --> G2[Gate 2: Specs]
        G2 --> G3[Gate 3: Architecture & Design]
        G3 --> G4[Gate 4: Tasks & Stream DAG]
        G4 --> G5[Gate 5.x: Per-Slice Apply Loop]
        G5 --> G6[Gate 6: Living Sync & Archive]
    end

    subgraph Bug_Track [Fast-Track Bugfix Track]
        GB1[Gate B1: Bug Report & Triage] --> GB2[Gate B2: Red Reproduction in Worktree]
        GB2 --> GB3[Gate B3: Green Surgical Fix & Sign-off]
    end
```

### 2.1 Feature Gate Matrix

| Gate | Name | Artifact | Required Content | Next Step |
| :--- | :--- | :--- | :--- | :--- |
| **Gate 0** | Research & Tradeoffs | `openspec/changes/<feat>/research.md` | Ground truth, 2–3 explored options, tradeoff matrix, recommendation, developer decision. | Draft Proposal (Gate 1) |
| **Gate 1** | Proposal Review | `openspec/changes/<feat>/proposal.md` | Intent, Problem Statement, Scope (In/Out-of-scope), Success Metrics, Assumptions (`ASM-GEN-*`). | Draft Specifications |
| **Gate 2** | Specifications Review | `openspec/changes/<feat>/specs/<cap>/spec.md` | Traceable Requirements (`REQ-*`), Non-Functional Budgets (`NFR-*`), Given/When/Then Scenarios. | Technical Design |
| **Gate 3** | Architecture Review | `openspec/changes/<feat>/design.md` | Overview, Domain Contracts, Boundary Rules, Latency/Allocation Budgets, Test Strategy. | Task Breakdown |
| **Gate 4** | Tasks Breakdown Review | `openspec/changes/<feat>/tasks.md` | Dependency DAG, Multi-agent worktree stream partitions, Test-first order of execution. | Launch Worktrees / Apply Phase |
| **Gate 5.x**| Slice Behavior Review | `tests/bdd/features/*.feature` | Gherkin scenarios covering all slice requirements before code is written. | Unit Red $\rightarrow$ Code Green |
| **Gate 6** | Living Sync & Archive | `openspec/specs/` + `tasks.md` | $\ge 95\%$ coverage, $> 90\%$ mutation kill, worktrees pruned, delta specs promoted to `openspec/specs/`. | Feature Complete |

### 2.2 Bugfix Gate Matrix (Fast-Track)

| Gate | Name | Artifact | Required Content | Next Step |
| :--- | :--- | :--- | :--- | :--- |
| **Gate B1** | Defect Triage | `docs/bug-reports/<date>-<slug>.md` | Steps to reproduce, expected vs actual behavior, root cause analysis. | Spawn `.worktrees/fix-<slug>` |
| **Gate B2** | Red Reproduction | Target test file in worktree | Failing test proving defect on unmodified base code. | Minimal surgical fix |
| **Gate B3** | Integration Sign-off | Worktree diff + test suite output | Green test, regression suite pass, `--ff-only` merge into base branch, prune worktree. | Hotfix Deployed |

---

## 3. Parallel Worktrees & Multi-Agent Streams

When a feature contains orthogonal tasks (decoupled modules, distinct endpoints, independent algorithms):

1. **Task DAG Partitioning (Gate 4)**: The feature lead breaks down independent streams in `tasks.md`:
   - `Stream A`: Core domain rules
   - `Stream B`: Parser / Data ingestion
2. **Worktree Spawning**:
   ```bash
   git worktree add .worktrees/<feat>-stream-a -b feat/<feat>/stream-a
   git worktree add .worktrees/<feat>-stream-b -b feat/<feat>/stream-b
   ```
3. **Agent Isolation**: Each subagent is scoped to its own worktree path. No agent can dirty another agent's working directory.
4. **Integration**: Every stream rebases onto the feature branch, re-runs unit + slice mutation suites, then merges fast-forward:
   ```bash
   git -C .worktrees/<feat>-stream-a rebase feat/<feat>-<name>
   git checkout feat/<feat>-<name>
   git merge --ff-only feat/<feat>/stream-a
   git worktree remove .worktrees/<feat>-stream-a
   git branch -d feat/<feat>/stream-a
   git worktree prune
   ```
5. **Rebasing**: The same rebase-and-re-verify rule applies to every merge in Spec-Rails — streams into features, features/fixes/chores into `main`.

---

## 4. Testing Rails & Mutation Verification

### 4.1 The Three-Layer Rail
1. **Behavioral Acceptance (BDD)**: Gherkin feature files validating end-to-end domain contracts from the user/caller perspective.
2. **Unit Red-Green-Refactor**: Fine-grained assertions on all code paths, edge cases, and boundary values.
3. **Mutation Testing**: Code mutating engines (e.g. `cargo-mutants`, `mutmut`, `stryker`) generate mutations (flipping conditionals, replacing arithmetic, deleting statements). Core logic must maintain a >= 95% mutation kill score; surviving mutants below threshold must be killed or deleted.

Spec-Rails tests itself with the same rails: `make test` includes a fresh-repo end-to-end test (`tests/test_e2e.sh`) that runs the real OpenSpec CLI plus the installer in a throwaway repo and checks that the `spec-rails` schema resolves and the hook blocks an unticked gate. The lint step also fails on broken doc links, manual template-copy instructions and unused shell helpers.

In CI, `spec-rails-verify` (installed to `openspec/spec-rails/`) makes the rails checkable without any language-specific tooling: every `REQ-*`/`NFR-*` in an active change must appear in a test file, ticked Red/Green/Coverage/Mutation tasks must carry `Evidence: <command and result>`, and the `RAILS_TEST`, `RAILS_COVERAGE` and `RAILS_MUTATION` commands in `openspec/spec-rails/rails.conf` must exit 0. It runs only in CI, never as a commit hook.

### 4.2 Surviving Mutant Protocol
When a mutant survives:
1. **Case A: Missing Assertion**: The test suite failed to assert a critical boundary. Fix: Add a targeted assertion.
2. **Case B: Dead Code**: The code survived because its deletion does not alter system behavior. Fix: Delete the dead code (Ponytail rule).
3. **Case C: Equivalent Mutant**: The mutant behaves identically to the original (e.g. `i < n` → `i != n` in an index loop), so no test can kill it. Fix: Restructure the code so the equivalence disappears (iterators instead of index loops, remove redundant conditions). No exemption lists, skip comments, or lowered thresholds.

---

## 5. Review Harness & Agent Steering: The LGTM Symbiosis

Spec-Rails relies on a human-in-the-loop review cockpit to steer coding agents in real time. We pair Spec-Rails natively with [mgabs/lgtm](https://github.com/mgabs/lgtm) (Fast terminal diff reviewer, agent steering TUI, and security scanner).

### 5.1 The Steering Feedback Loop

```mermaid
sequenceDiagram
    participant Reviewer as Human Reviewer (lgtm TUI)
    participant Harness as lgtm Guardrails
    participant Agent as Coding Agent
    participant Repo as Git Repository

    Agent->>Repo: Implement Slice (Green)
    Repo-->>Reviewer: Real-time File-Watcher Diff Update
    Reviewer->>Harness: Inspect Diff & Scope
    Harness-->>Reviewer: Flag Complexity Spike / Anti-Fraud / Typo
    Reviewer->>Agent: Send Directive chord (e.g. ca / cs / #ref file:line)
    Agent->>Agent: Parse #ref Directive & Target Line
    Agent->>Repo: Add Failing Test / Refactor / Fix
    Agent-->>Reviewer: Verified Pass & Update
```

### 5.2 Line-Anchored Directives (`#ref file:line <directive>`)
Rather than providing ambiguous conversational feedback, reviewers anchor corrections directly to exact file and line coordinates:
```text
#ref src/core/auth.rs:42 Ensure token expiration handles leap seconds and integer overflow.
```
In `lgtm`, this is injected via 1-key quick chords into the agent's active terminal pane (`tmux`, `zellij`, `wezterm`, `kitty`) or `.lgtm/reviews/`:
- `ca`: ⚡ Test Coverage (`Add unit/regression tests covering these branches.`)
- `cs`: 🔒 Security (`Ensure inputs are sanitized, parameterized, and auth checks enforced.`)
- `cr`: 🧹 Refactor / DRY (`Simplify logic, reduce cognitive nesting, eliminate duplication.`)
- `cp`: 🚀 Performance (`Optimize hot-path allocations and database query batching.`)
- `cw`: ❓ Rationale / Why (`Explain rationale and verify architectural invariants.`)

### 5.3 Automated Anti-Fraud & Guardrail Protection
Autonomous agents sometimes take shortcuts to satisfy gate requirements. `lgtm` enforces mechanical guardrails before commits:
1. **Test Neutering Guard**: Flags deleted assertions, skipped tests (`@pytest.mark.skip`, `#[ignore]`, `xit`), mock inflation, and self-assertions (`assert True`).
2. **Cognitive Complexity Spikes**: Flags functions where new branches/loops increase cognitive complexity by $\ge 5$.
3. **Dead Code Addition (YAGNI)**: Identifies newly added functions or methods with zero usages across the repository.
4. **Identifier Hallucination Guard**: Flags 1–2 character Levenshtein distance typos against the repository symbol index.
5. **Security Scan**: Catches SQLi, shell command injection, hardcoded secrets, and TLS bypass in diff hunks.

### 5.4 Native MCP Server Integration
AI agents operating under Spec-Rails connect directly to `lgtm` via its built-in Model Context Protocol server (`lgtm serve --mcp` / `lgtm mcp`), enabling agents to query diffs, verify static analysis status, and confirm resolution of review directives before requesting Gate sign-off.
