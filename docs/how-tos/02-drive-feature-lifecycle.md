# How-To: Drive a Feature Through Gates 0–6

This guide demonstrates end-to-end execution of a feature under the Spec-Rails lifecycle.

---

## Step 1: Branch Creation

Never work on `main`. Normalize roadmap IDs to lowercase hyphens (`W1.1` → `w1-1`) and start a dedicated feature branch:

```bash
git checkout -b feat/w1-1-user-authentication
```

Scaffold the change with OpenSpec (`openspec new change` accepts `[a-z0-9-]+` only — no dots):

```bash
openspec new change w1-1-user-authentication
openspec status --change w1-1-user-authentication
```

For gated planning, generate one artifact at a time with `openspec instructions <artifact> --change w1-1-user-authentication`, pausing for a human to review, tick its `## Review Gate` checkbox, and commit before generating the next file. Note that `/opsx-propose` drafts all planning artifacts in one pass, so `spec-rails-check` will block commits until Gates 0–3 are reviewed and ticked. Run `/opsx-apply` and `/opsx-archive` only after Gate 4 is ticked by a human; agents never self-tick Gate 0–4 or Gate 5.x sign-off boxes.

---

## Step 2: Gate 0 — Research & Technical Tradeoffs

1. Generate `research.md` (`openspec instructions research --change w1-1-user-authentication`).
2. Document:
   - **Ground Truth**: Verified constraints in existing codebase and docs.
   - **2–3 Options**: Concrete candidate architectures (e.g. standard library vs minimal custom vs alternative).
   - **Tradeoff Matrix**: Compare complexity, dependencies, performance, and maintenance burden.
   - **Recommendation**: Agent's reasoned suggestion.
3. **Gate 0 Review**: Present options to human developer. The developer explicitly selects the winning path before Gate 1 starts.

---

## Step 3: Gate 1 — Feature Proposal

1. Generate `proposal.md` (`openspec instructions proposal --change w1-1-user-authentication`).
2. Fill in:
   - **Intent**: High-level capability summary.
   - **Scope**: Explicit In-Scope list and Out-of-Scope (YAGNI) list based on the chosen Gate 0 option.
   - **Assumptions**: `ASM-GEN-*`.
   - **Success Metrics**: Quantifiable outcomes.
3. **Gate 1 Review**: Present proposal to human reviewer. Do not proceed until approved.

---

## Step 4: Gate 2 — Specifications

1. For each capability, write a **delta spec** (`## ADDED|MODIFIED|REMOVED Requirements`):
   - **Existing capability** — MODIFIED/REMOVED deltas repeat the existing `### Requirement: REQ-... <name>` header verbatim so OpenSpec header matching succeeds (for retired requirements, keep the exact header and place `**[DEPRECATED by w1-1-user-authentication]**` at the start of the requirement body; never reuse keys).
   - **New capability** — ADDED requirements in `openspec/changes/w1-1-user-authentication/specs/token-verification/spec.md`, structured per `openspec instructions specs --change w1-1-user-authentication`.
2. Fill in:
   - **Functional Requirements**: `REQ-AUTH-1`, `REQ-AUTH-2`, etc.
   - **Non-Functional Requirements & Budgets**: `NFR-AUTH-1` (e.g. verification latency $< 2\text{ms}$).
   - **Given / When / Then Scenarios**: Behavioral test cases.
3. **Gate 2 Review**: Present specifications to human reviewer.

---

## Step 5: Gate 3 — Architecture & Design

1. Generate `design.md` (`openspec instructions design --change w1-1-user-authentication`).
2. Document:
   - Domain models, state machines, and interfaces.
   - Boundary rules: Pure core logic isolated from I/O and network.
   - Concurrency, allocation, or frame deadline invariants.
3. **Gate 3 Review**: Human approval required before writing task breakdown.

---

## Step 6: Gate 4 — Task Breakdown & Worktree DAG

1. Generate `tasks.md` (`openspec instructions tasks --change w1-1-user-authentication`).
2. Structure the DAG into vertical slices and identify orthogonal streams suitable for parallel worktrees.
3. **Gate 4 Review**: Human approval required before writing any test code.

---

## Step 7: Step 5.x — Vertical Slice Apply Phase

For each vertical slice:

1. **Step 5.x-A (BDD)**: Write Gherkin `.feature` scenarios.
   - **Gate 5.x Review**: Human inspects scenarios.
2. **Step 5.x-B (Red-Green-Refactor)**:
   - Write failing unit tests (`Red`). Verify test failure. Do **not** commit yet — the pre-commit suite would reject it.
   - Implement minimal code to pass (`Green`). Commit tests and code together.
   - Clean up code under green test protection.
   - Enforce $\ge 95\%$ line and branch coverage.
3. **Step 5.x-C (Mutation Testing)**:
   - Run mutation tests scoped to the slice.
   - Kill 100% of survivors: add an assertion, delete dead code, or restructure equivalent mutants away. No exemptions.

---

## Step 8: Gate 6 — Sync, Archive & Merge

1. Merge stream worktrees (rebase + re-verify each, then `--ff-only`) and prune them.
2. Rebase onto `main`, then run the full test suite and full-project mutation suite.
3. Tick completed slice items and the final integration task in `tasks.md` (with `Evidence:` on Red/Green/Coverage/Mutation items), then validate:
   ```bash
   openspec validate w1-1-user-authentication
   ```
4. Sync and archive in one step (via `openspec archive` or `/opsx-archive`), commit, and merge:
   ```bash
   openspec archive w1-1-user-authentication --yes
   git add -A
   git commit -m "feat(w1-1): ship user authentication"
   git checkout main
   git merge --ff-only feat/w1-1-user-authentication
   git branch -d feat/w1-1-user-authentication
   ```
5. Mark `✅ Shipped` in `docs/ROADMAP.md` through a `chore/roadmap-w1-1` branch.
