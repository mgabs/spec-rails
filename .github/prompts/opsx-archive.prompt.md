---
description: "Archive a completed change in the experimental workflow"
---

Archive a completed change.

**Project check**: confirm `openspec/` exists. If it does not: when you picked this workflow yourself, stop and answer normally without mentioning setup; when the user explicitly asked for it, stop and tell them the project must be initialized first. Never hand-create the `openspec/` root.

**Input**: optionally a change name. If omitted, infer from the conversation; if vague or ambiguous you MUST prompt for the available changes.

**Steps**

1. **Select the change**
   If a name is given, use it. Otherwise infer from conversation, auto-select when exactly one active change exists, or list the active changes (directories under `openspec/changes/` other than `archive/`, with each change's schema from `.openspec.yaml`) and ask. Never offer already archived changes. Always announce "Using change: <name>" and how to override (for example `/openspec-archive-change <other>`).
   Read `openspec/config.yaml` `context` as a prompt-level input and apply relevant project facts and conventions; report conflicts with the steps below rather than overriding them, and do not copy it verbatim into specs, artifacts or summaries.

2. **Check artifact completion**
   Read `openspec/schemas/spec-rails/schema.yaml` and `openspec/changes/<name>/.openspec.yaml`. An artifact is `done` when its output file exists (for a glob, at least one match). If any artifact is neither done nor skipped (a change declaring `skip_specs` skips `specs`), warn with the list and ask the user to confirm before proceeding.

3. **Check task completion**
   Read the tracking file named by `apply.tracks` in `schema.yaml` (normally `openspec/changes/<name>/tasks.md`). Count `- [x]`/`- [X]` as complete; every other marker, including unfamiliar ones, is incomplete. If the file is unreadable, report the problem and stop before syncing or archiving. If incomplete tasks exist, warn with the count and ask the user to confirm. If there are no tasks, proceed without a task warning. Do not infer completion from artifact status.

4. **Assess delta spec sync state**
   The delta specs are the `spec.md` files under `openspec/changes/<name>/specs/**`. If there are none, proceed without a sync prompt and do not infer deltas from other artifacts.

   If deltas exist, compare each with its main spec at `openspec/specs/<capability-path>/spec.md`. A missing main spec is **not automatically** "already synced"; for a new capability the main spec is an output of the sync:
   - If the delta has MODIFIED or RENAMED requirements, only ADDED requirements can create a new main spec: mark the capability sync-blocked and never invent a requirement that has no current version.
   - Otherwise, if the delta has only REMOVED requirements and `.openspec.yaml` declares `retire_capabilities: true`, the capability is already retired: count it as synced, warn there is nothing left to remove, and do not recreate the spec (apply the same rule when verifying a completed sync).
   - Otherwise, if the delta has no ADDED requirements, no sync is possible: mark it sync-blocked (for REMOVED-only, warn there is no main spec to remove from and leave the specs tree unchanged).
   - Otherwise it needs sync; name it in the summary (`<capability-path>: new main spec will be created`). If it also has REMOVED requirements, warn they are ignored because there is no main spec to remove from.
   Determine the adds, modifications, removals and renames that would apply. Keep assessing the remaining capabilities when one is blocked, and show a combined summary before prompting.

   **Prompt options:**
   - Any capability sync-blocked: explain why and offer only "Archive without syncing" or "Cancel".
   - Otherwise, changes needed: "Sync now (recommended)" or "Archive without syncing".
   - Otherwise, already synced: "Archive now", "Sync anyway" or "Cancel".

   Route on the answer: "Cancel" stops without archiving; "Archive without syncing"/"Archive now" proceeds to step 5; "Sync now"/"Sync anyway" syncs then verifies (below) - never start a sync while a capability is sync-blocked, explain the blocker and repeat the choices; anything else, ask again rather than archiving.

   Before a selected sync writes any main spec, read the `specs` artifact `rules` from `openspec/config.yaml` (`rules.specs`) once, together with the `specs` instruction in `schema.yaml`; apply them only to the content and form of the merged main specs and never copy rule text into any output file. Then run the sync workflow (`/openspec-sync-specs`) inline for change `<name>`, passing the delta analysis and the rules you already read, and wait for it to finish. Do not delegate it to a background task - step 5 would move the change directory out from under a sync still reading it. If your agent can only delegate, delegate synchronously and wait.

   If the sync reports any stop or blocking condition, treat it as failed: stop the archive, skip the post-sync comparison, and do not move the change (nothing has moved, so the user can fix and re-run).

   After the sync writes each main spec, verify its structure:
   - A new main spec starts with a `# <capability> Specification` title; an existing one keeps its title exactly.
   - Existing `## Purpose` sections are untouched; for a new spec, the delta Purpose is copied verbatim (warn only if it is very short; if none is usable, use the TBD placeholder with a warning).
   - No delta headers (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`) remain.
   - Written or changed requirements use `### Requirement:` headings with `#### Scenario:` scenarios under `## Requirements`; content the delta does not mention is unchanged.

   Then repeat the comparison from the top of this step for every capability with a delta (not only those the sync reports touching). A successful sync leaves nothing to apply, so each capability must read as already synced: ADDED requirements present; MODIFIED requirements carrying the delta's changes with other scenarios intact; REMOVED requirements gone (a capability whose last requirement was removed has its main spec deleted rather than left empty); RENAMED requirements present under the new name and absent under the old.
   If the sync failed or any capability does not match, report what differs and stop - do not archive.

5. **Perform the archive**
   Create `openspec/changes/archive/` if it does not exist. The target name is the change name as-is when it already starts with a `YYYY-MM-DD-` prefix; otherwise `YYYY-MM-DD-<change-name>` with today's date. Never stack a second date. If the target already exists, fail and suggest renaming the existing archive or using a different date. Otherwise move `openspec/changes/<name>` to `openspec/changes/archive/<target-name>` (`.openspec.yaml` moves with it).

6. **Display summary**
   Change name, schema, archive location, whether specs were synced, and any warnings (incomplete artifacts or tasks).

**Output on success**

```markdown
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/<target-name>/
**Specs:** <"✓ Synced to main specs" only if step 4 verification passed; otherwise "No delta specs" or "Sync skipped">

<"All artifacts complete. All tasks complete." - or, when archived with warnings, list them (e.g. "Archived with 2 incomplete tasks")>
```

**Guardrails**
- Announce the selected change; prompt when ambiguous.
- Do not block the archive on warnings - inform and confirm.
- Preserve `.openspec.yaml` (it moves with the directory).
- If delta specs exist, always run the sync assessment and show the combined summary before prompting.
- Never archive while a sync is still in flight: run it inline and verify the main specs before moving the change.
- Artifact rules constrain only the specs being written; never copy context, rule text or guidance verbatim into output files.
