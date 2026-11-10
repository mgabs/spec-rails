# How-To: Drive a Feature Through Gates 0–4

This guide demonstrates end-to-end execution of a feature under the Spec-Rails lifecycle. Agent runbook with exact artifacts and evidence rules: [agentic-how-tos/02](../agentic-how-tos/02-drive-feature-lifecycle.md).

---

## Step 1: Branch Creation

Never work on `main`. Normalize roadmap IDs to lowercase hyphens (`W1.1` → `w1-1`) and start a dedicated feature branch:

```bash
git checkout -b feat/w1-1-user-authentication
```

Scaffold the change with `/opsx-propose` (CLI-free after `init`; names use `[a-z0-9-]+` only, no dots). It creates `openspec/changes/w1-1-user-authentication/`; the artifact order and instructions come from `openspec/schemas/spec-rails/schema.yaml`.

Draft planning artifacts one by one, pausing after each gate for explicit human review and checkbox approval before drafting the next artifact (never generate all planning artifacts in one unreviewed pass). Run `/opsx-apply` and `/opsx-archive` only after Gate 3 is ticked by a human.

---

## Step 2: Gate 0 — Research & Technical Tradeoffs

1. Generate `research.md`.
2. Document:
   - **Ground Truth**: Verified constraints in existing codebase and docs.
   - **2–3 Options**: Concrete candidate architectures (e.g. standard library vs minimal custom vs alternative).
   - **Tradeoff Matrix**: Compare complexity, dependencies, performance, and maintenance burden.
   - **Recommendation**: Agent's reasoned suggestion.
3. **Gate 0 Review**: Present options to human developer. The developer explicitly selects the winning path (Go) before Gate 1 starts.

---

## Step 3: Gate 1 — Feature Proposal

1. Generate `proposal.md`.
2. Fill in:
   - **Intent**: High-level capability summary.
   - **Scope**: Explicit In-Scope list and Out-of-Scope (YAGNI) list based on the chosen Gate 0 option.
   - **Assumptions**: `ASM-GEN-*`.
   - **Success Metrics**: Quantifiable outcomes.
3. **Gate 1 Review**: Present proposal to human reviewer. Do not proceed until approved.

---

## Step 4: Gate 2 — Architecture & Technical Design

1. Generate delta specifications (`specs/<capability>/spec.md`):
   - **Functional Requirements**: `REQ-AUTH-1`, `REQ-AUTH-2`, etc.
   - **Non-Functional Requirements & Budgets**: `NFR-AUTH-1` (e.g. latency $< 2\text{ms}$).
   - **Given / When / Then Scenarios**: Behavioral test contracts.
2. Generate `design.md`:
   - Domain models, state machines, and interface contracts.
   - Boundary rules: Pure core logic isolated from I/O and network shell.
   - Concurrency, allocation, or performance invariants.
   - Concrete test strategy and test cases covering all `REQ-*` and `NFR-*` requirements.
3. **Gate 2 Review**: Present architecture, specs, and test strategy to human reviewer.

---

## Step 5: Gate 3 — Task Breakdown & Worktree DAG

1. Generate `tasks.md`.
2. Structure the DAG into vertical slices and identify orthogonal streams suitable for parallel worktrees.
3. **Gate 3 Review**: Human approval required before writing test code or spawning slice worktrees.

---

## Step 6: Vertical Slice Apply Phase

For each vertical slice:

1. **Contract Scaffolding**: Commit domain interfaces, types, schemas, and empty function signatures before implementation.
2. **Red-Green-Refactor**:
   - Write failing unit tests (`Red`). Verify test failure. Do **not** commit yet — the pre-commit suite would reject it.
   - Implement minimal code to pass (`Green`). Commit tests and code together.
   - Clean up code under green test protection.
   - Enforce $\ge 95\%$ line and branch coverage.
3. **Mutation Testing**:
   - Run mutation tests scoped to the slice.
   - Maintain >= 95% mutation kill score: add an assertion, delete dead code, or restructure equivalent mutants away.

---

## Step 7: Gate 4 — Verify, Archive & Merge

1. Merge stream worktrees (rebase + re-verify each, then `--ff-only`) and prune them.
2. Rebase onto `main`, then run your full test, coverage and mutation commands.
3. Tick completed slice items and the final integration task in `tasks.md` (with `Evidence:` notes on Red/Green/Coverage/Mutation items), then validate:
   ```bash
   openspec validate w1-1-user-authentication   # optional, only if the openspec CLI is installed
   ```
4. Sync and archive in one step (`/opsx-archive`, or `openspec archive` if the CLI is installed), commit, and merge:
   ```bash
   openspec archive w1-1-user-authentication --yes
   git add -A
   git commit -m "feat(w1-1): ship user authentication"
   git checkout main
   git merge --ff-only feat/w1-1-user-authentication
   git branch -d feat/w1-1-user-authentication
   ```
