---
description: "Sync delta specs from a change to main specs"
---

Sync delta specs from a change to the main specs.

This is an **agent-driven** operation: read the delta specs and edit the main specs directly. This allows intelligent merging (for example, adding one scenario without copying the whole requirement).

**Project check**: confirm `openspec/` exists. If it does not: when you picked this workflow yourself, stop and answer normally without mentioning setup; when the user explicitly asked for it, stop and tell them the project must be initialized first. Never hand-create the `openspec/` root.

`<capability-path>` is the spec directory relative to `specs/` (for example `user-auth` or `identity/user-auth`); preserve the full path from each delta spec when resolving its main spec.

**Input**: optionally a change name. If omitted, infer from the conversation; if vague or ambiguous you MUST prompt for the available changes.

**Steps**

1. **Select the change**
   If a name is given, use it. Otherwise infer from conversation, auto-select when exactly one active change exists, or list the active changes that have delta specs (`openspec/changes/<name>/specs/`) and ask. Always announce "Using change: <name>" and how to override (for example `/openspec-sync-specs <other>`).

2. **Find delta specs**
   The delta specs are the `spec.md` files under `openspec/changes/<name>/specs/**`. Main specs live at `openspec/specs/<capability-path>/spec.md`. If there are no delta specs, report that there is nothing to sync and stop without writing; never infer deltas from other artifacts.
   Sync every delta unless the caller narrowed the set by naming complete delta paths (archive does this inline; a user can too). Then sync only those, never widen back to all, and report and stop if a named path is not a delta spec of the change. An empty named list means nothing to sync.
   Delta files contain `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` and `## RENAMED Requirements` (FROM:/TO: lines) sections.

3. **Apply the changes for each selected delta**
   Before the first main-spec write, read the `specs` artifact `rules` from `openspec/config.yaml` (`rules.specs`, when present) and the `specs` instruction and template in `openspec/schemas/spec-rails/`. Apply rules only to the content and form of the main specs you write; never copy rule text into a main spec or summary. If archive supplied them inline, reuse them.

   For each delta:
   a. Read the delta spec.
   b. Read the main spec (it may not exist). **If it does not exist** (a new capability), only ADDED requirements may be applied: for MODIFIED or RENAMED, stop the sync for that capability and report that its main spec does not exist (never invent the missing requirement); for REMOVED, skip it and warn.
   c. Apply intelligently:
      - **ADDED**: add the requirement if absent; if it already exists, update it to match (implicit MODIFIED).
      - **MODIFIED**: find the requirement and apply the change - add scenarios the main spec lacks, modify existing scenarios, change the description. Preserve scenarios and content the delta does not mention.
      - **REMOVED**: remove the whole requirement block. Delete the entire `spec.md` (and its directory once nothing else is left) only when ALL hold: (1) removing the requirements this run left no requirement blocks; (2) the rest of the spec is well-formed (it still has `## Purpose`); (3) the main spec was not already empty before this sync; (4) every other nonblank line is accounted for as the title, Purpose, Requirements header, or a canonical requirement's statement, scenarios or fenced examples; (5) the change's `.openspec.yaml` declares `retire_capabilities: true`; (6) the `spec.md` resolves inside the real `openspec/specs/` (do not follow a symlink to delete an external file). If removal would leave no requirement blocks and any condition fails, do not modify the main spec: stop for that capability, report the blocking condition, and say how to resolve it (if only the marker is missing, say so). Never write or leave an empty `## Requirements` section. When retiring, name the deleted `spec.md` and its Purpose, and give pasteable `git checkout` recovery if the spec was tracked.
      - **RENAMED**: find the FROM requirement and rename it to TO.
      - **`## Purpose` in the delta**: when the main spec already has one it is authoritative - leave it alone.
   d. **Create a new main spec** only when the delta has ADDED requirements and no MODIFIED/RENAMED block stopped this capability. Otherwise create nothing. For a REMOVED-only delta, if `.openspec.yaml` declares `retire_capabilities: true`, report it as already retired and do not recreate the spec; without that marker report the sync as blocked (a spec needs at least one requirement). An empty delta has nothing to sync; report it as blocked. Create `openspec/specs/<capability-path>/spec.md`: copy the delta's `## Purpose` body verbatim when it has one, otherwise write a brief TBD placeholder; add `## Requirements` with the ADDED requirements, following the Main Spec Format Reference below.

4. **Validate the updated main specs by hand**
   There is no validator: re-read each main spec you wrote and check that no delta headers (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`) remain; every requirement is a `### Requirement:` block under one `## Requirements` section with at least one `#### Scenario:`; each requirement has a normative statement (SHALL/MUST); a MODIFIED block kept every scenario the main spec still has. If anything fails, report the problems and do not claim success.

5. **Show a summary**
   Capabilities updated; what changed (added/modified/removed/renamed); any new main spec left with a TBD Purpose so it gets written now; any capability retired.

**Delta Spec Format Reference**

```markdown
# Spec Delta

## Purpose
Only on a delta that introduces a brand-new capability. Seeds the new main spec.

## ADDED Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y

## MODIFIED Requirements

### Requirement: Existing Feature
The system SHALL keep doing the existing thing, now also handling A.

#### Scenario: Scenario the main spec already has
- **WHEN** user does X
- **THEN** system does Y

#### Scenario: New scenario to add
- **WHEN** user does A
- **THEN** system does B

## REMOVED Requirements

### Requirement: Deprecated Feature

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

**Main Spec Format Reference**

Main specs must never contain delta operation headers. After syncing, every requirement lives under a single `## Requirements` section:

```markdown
# <capability> Specification

## Purpose
Short description of what this capability does and why it exists.

## Requirements

### Requirement: New Feature
The system SHALL do something new.

#### Scenario: Basic case
- **WHEN** user does X
- **THEN** system does Y
```

**Key principle: intelligent merging.** A MODIFIED block carries the whole requirement - body plus every scenario that survives the change. Keep anything the delta does not mention, in the main spec's existing order, and use judgment to merge sensibly.

**Output on success**

```markdown
## Specs Synced: <change-name>

Updated main specs:

**<capability-1>**:
- Added requirement: "New Feature"
- Modified requirement: "Existing Feature" (added 1 scenario)

**<capability-2>**:
- Created new spec file
- Added requirement: "Another Feature"

Main specs are now updated. The change remains active - archive when implementation is complete.
```

**Guardrails**
- Read both delta and main specs before changing anything; preserve content the delta does not mention.
- Never copy a delta file into a main spec as-is - merge, keeping the Main Spec Format Reference structure.
- If something is unclear, ask. Show what you are changing as you go.
- The operation is idempotent: running twice gives the same result.
- Use only the change's own delta specs; honor a caller-supplied subset and never widen it.
- Artifact rules constrain only the specs being written and are never copied into output files.
