# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
Roadmap item W5.8:
- In `templates/spec.md`: scenarios currently template only `- **WHEN**` and `- **THEN**`. Add `- **GIVEN**` to match OpenSpec 1.16 `--strict` BDD convention.
- In `schema.yaml`: clarify that `## MODIFIED Requirements` and `## REMOVED Requirements` must repeat the exact legacy heading (e.g. `### REQ-...`) when modifying or removing legacy living spec requirements that lack the `Requirement:` prefix.
- In `schema.yaml`: clarify that formal requirement identifiers (`REQ-*` / `NFR-*`) are assigned at Gate 2 (specs artifact), while proposal.md (Gate 1) defines high-level capabilities, scope, and `ASM-GEN-*` assumptions without pre-assigning requirement IDs.

Existing constraints:
- `schemas/spec-rails/schema.yaml` lines 58-60 already mandate: `Scenarios use exactly four hashtags (#### Scenario:) with GIVEN/WHEN/THEN steps (for OpenSpec 1.16 --strict)`. But `templates/spec.md` lines 11-13 and 18-20 only have `WHEN` and `THEN`.
- OpenSpec header matching for delta application is exact string matching. For legacy living specs created before `Requirement:` prefix convention was introduced, matching fails if delta headers add the prefix.
- `schemas/spec-rails` and `openspec/schemas/spec-rails` must remain byte-identical per self-copy sync (`tests/test_selfcopy.sh`).

## 2. Options Explored
**Option A: Update templates, schema instructions, living spec, and test harness.**
- Add `- **GIVEN**` to `templates/spec.md`.
- Update `schema.yaml` instructions for `proposal` and `specs` to explicitly document requirement ID assignment at Gate 2 and legacy heading verbatim matching.
- Add assertions in `tests/test_schema.sh` to enforce `GIVEN` in `spec.md` template and the new schema instructions.
- Sync `schemas/spec-rails/` to `openspec/schemas/spec-rails/`.

**Option B: Code-level heading normalization in OpenSpec core.**
- Out-of-scope for Spec-Rails; OpenSpec core parser behavior is external and fixed.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B |
| :--- | :--- | :--- |
| **Complexity** | Low (docs, schema, templates, test assertions) | High (requires upstream OpenSpec CLI PR) |
| **New Dependencies** | None | None |
| **Performance & Latency** | Zero impact | N/A |
| **Maintenance Burden** | Low | N/A |
| **Blast Radius** | Template & schema definitions; backward-compatible | Upstream dependency lock |

## 4. Recommendation
Option A: Standardize template, clarify schema instructions, and guard with unit assertions in `tests/test_schema.sh`.

## 5. Breaking Changes & Deprecations
- No breaking changes. Existing compliant delta specs continue to pass without change.
- Living spec adds `REQ-OSA-41` (Schema and Template Alignment).

## Review Gate
- [x] **Gate 0 Decision**: Go, Option A.
