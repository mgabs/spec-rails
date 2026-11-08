# Architecture & Technical Design

## 1. Overview & Invariants
Wave 6.1 aligns Spec-Rails with pure OpenSpec delta specifications and rationalizes the planning gates to Gates 0–4:
- **Invariant 1 (Pure Delta Specs)**: `specs/**/*.md` delta files contain strictly OpenSpec specification sections (`## Purpose`, `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, `## RENAMED Requirements`) and zero workflow metadata or review gate checkboxes.
- **Invariant 2 (Step-by-Step Gating)**: Every planning artifact that defines a milestone boundary ends with an unticked `## Review Gate` checkbox. Progression requires human sign-off:
  - Gate 0: `research.md` (Decision: Go or No-Go)
  - Gate 1: `proposal.md` (Scope & Problem Approval)
  - Gate 2: `design.md` (Specifications, Architecture & Test Strategy Approval)
  - Gate 3: `tasks.md` (Task Breakdown & DAG Approval before code/test execution)
  - Gate 4: Archival & spec synchronization (`openspec archive`)
- **Invariant 3 (Slice Loop Simplification)**: Per-slice execution follows `Contract Scaffolding → Red → Green → Coverage & Mutation` without separate `.feature` file ceremony or intermediate Gate 5.x pauses.

## 2. Domain Models, State & Interface Contracts

### 2.1 Schema Definition (`schema.yaml`)
- `specs` artifact:
  - `description`: "Gate 2 delta specifications with uniquely keyed requirements (pure OpenSpec specs; no Review Gate footer)"
  - `instruction`: Updates to state delta specs are pure contracts without review gate checkboxes. Approval is deferred to Gate 2 in `design.md`.
- `design` artifact:
  - `description`: "Gate 2 architecture, specs review and technical design"
  - `instruction`: Updates to reflect Gate 2 human approval.
- `tasks` artifact:
  - `description`: "Gate 3 task breakdown and dependency DAG"
  - `instruction`: Updates to reflect Gate 3 human approval. Drops Gate 5.x references.
- `apply` operation:
  - Updates to reflect `Contract scaffolding → Red → Green → Coverage & Mutation`.

### 2.2 CLI Gate Checking Contract (`src/commands/check.ts`)
```typescript
export function getGateNumber(id: string): number | string | null {
  switch (id) {
    case "research":
      return 0;
    case "proposal":
      return 1;
    case "design":
      return 2;
    case "tasks":
      return 3;
    case "specs":
      return null; // Pure specification artifact; not a gated checkbox
    default:
      return id;
  }
}
```
In `parseArtifactState(changeRoot, artifactId, existingOutputPaths)`:
- When `artifactId === "specs"`, if matching spec files exist, return `"ticked"` (pure content satisfied, no gate required). If no spec files exist, return `"missing"`.
In `findGateViolations`:
- When checking unapproved ancestors or early tasks, only artifacts with gate numbers (0, 1, 2, 3) are evaluated for missing/unticked Review Gates.
- `hasEarlyTasks` checks Gate 3 (`tasks.md`) rather than legacy Gate 4.

## 3. Architecture Diagram & Data Flow

```
+-------------------------------------------------------------------------------+
|                             SPEC-RAILS PLANNING DAG                           |
+-------------------------------------------------------------------------------+

  [Gate 0: research.md]
          |
     (Go Decision)
          v
  [Gate 1: proposal.md]
          |
     (Gate 1 Approval)
          v
  [specs/**/*.md]  <--- Pure OpenSpec Delta (No ## Review Gate footer)
          |
          v
  [Gate 2: design.md]  <--- Reviews Specs + Architecture + Test Strategy
          |
     (Gate 2 Approval)
          v
  [Gate 3: tasks.md]   <--- Task DAG & Slices
          |
     (Gate 3 Approval)
          v
  [Implementation / Slices] (Contract -> Red -> Green -> Coverage & Mutation)
          |
          v
  [Gate 4: openspec archive] (Spec Sync, Archive & Merge)
```

## 4. Boundary Rules & Budgets
- **Pure Core vs. I/O Shell**:
  - `check.ts` gate logic remains purely declarative given file content and parsed status objects.
  - Template files in `templates/` and `openspec/schemas/spec-rails/templates/` are static assets without runtime execution hooks.
- **Latency & Overhead Budget**:
  - `check.ts` execution overhead is reduced (no regex search for review gate footers in spec files).
  - Check latency remains comfortably under 3s budget (NFR-OSA-3).

## 5. Testing Strategy
1. **Unit Tests (`tests/unit/check.test.ts`)**:
   - Verify `parseArtifactState("specs")` does not fail when `spec.md` has no `## Review Gate`.
   - Verify `findGateViolations` reports Gate 0 (research), Gate 1 (proposal), Gate 2 (design), and Gate 3 (tasks).
   - Verify `hasEarlyTasks` flags unticked Gate 3 in `tasks.md`.
2. **Template Verification (`tests/test_schema.sh` / unit)**:
   - Verify `templates/spec.md` and `openspec/schemas/spec-rails/templates/spec.md` contain no `## Review Gate`.
   - Verify `design.md` template contains Gate 2 Approval.
   - Verify `tasks.md` template contains Gate 3 Approval and zero Gate 5.x tasks.
3. **Coverage & Mutation**:
   - Maintain >= 95% line and branch coverage and >= 95% mutation kill score across touched modules.

## Review Gate
- [x] **Gate 2 Approval**: Architecture & design reviewed and approved by human before task breakdown.
