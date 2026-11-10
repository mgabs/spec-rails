---
description: "Update a change - revise existing planning artifacts and keep them coherent (Experimental)"
---

Revise a change's existing planning artifacts and keep them coherent. Never edit code.

**Project check**: confirm `openspec/` exists. If it does not: when you picked this workflow yourself, stop and answer normally without mentioning setup; when the user explicitly asked for it, stop and tell them the project must be initialized first. Never hand-create the `openspec/` root.

**Input**: optionally a change name. If omitted, infer from the conversation; if vague or ambiguous you MUST prompt for the available changes.

This workflow revises artifacts that already exist; it never creates missing ones. When an artifact is missing, point the user to the propose workflow, which reads that artifact's `instruction` and template from `openspec/schemas/spec-rails/`.

**Steps**

1. **Select the change**
   If a name is given, use it. Otherwise infer from conversation, auto-select when exactly one active change exists (a directory under `openspec/changes/` other than `archive/`), or list the active changes sorted by most recent modification (file modification time) and ask. Show the top 3-4 with name, status ("0/5 tasks", "complete", "no tasks", counted from `- [ ]`/`- [x]` boxes in `tasks.md`) and recency; mark the most recent "(Recommended)". Always announce "Using change: <name>" and how to override (for example `/openspec-update-change <other>`).

2. **Get the change's artifacts**
   Read `openspec/schemas/spec-rails/schema.yaml` (never assume artifact ids; custom schemas must work unchanged) and `openspec/changes/<name>/.openspec.yaml`. For each artifact: `done` when its output file exists (for a glob such as `specs/**/*.md`, the matching existing files), `ready` when all `requires` are done, otherwise `blocked`. The files to edit are the concrete files that exist on disk, plus any confirmed concrete path under a partly populated glob artifact (step 4). Never write to a glob pattern itself.

3. **Understand the request**
   If the user asked for a specific revision ("the design now uses X"), that is the starting edit. If they only said "update" or "make this coherent", do a coherence review: read the existing artifacts and check them against each other for contradictions, gaps and duplication.

4. **Read and reconcile**
   - Read the artifacts the request touches and the change's other existing artifacts.
   - Draft the requested edit in the conversation, not in files; step 5 owns every write. Then check every other existing artifact against the drafted edit in ANY direction - an edit to a later artifact may require revising an earlier one. Build order is a reading order, not a constraint.
   - Note everything now inconsistent, missing or contradictory.
   - Propose revisions only to files that already exist. An artifact with no existing files and status `ready` or `blocked` is noted and left for the propose workflow. Leave `skipped` artifacts untouched.
   - For a glob artifact whose existing files are non-empty, if reconciliation identifies a missing file: read the artifact's `instruction` and template from `schema.yaml` and the templates directory (treat `config.yaml` context and rules as constraints, not content); read current dependency files from disk and stop if a required one is missing; choose a concrete path inside the change directory that matches the glob and does not exist, verifying it stays inside after resolving symlinks; include it in the proposed revisions and create it only after confirmation, re-checking immediately before creation that it still does not exist (create must fail if the target exists). If any check fails, stop and reconcile with the user rather than replacing content or choosing another path.
   - If the change is already coherent, say so and propose no revisions.

5. **Confirm and apply, one artifact at a time**
   This step performs every artifact write. Show each proposed revision and why - including the requested edit - and write only after the user confirms. If a revision is rejected, leave that artifact unchanged. For a substantial rewrite, first read the artifact's `instruction` and template.

6. **Point to the next step (guidance only - NEVER act on it)**
   - Artifacts with no files and status `ready` or `blocked`: point the user to the propose workflow.
   - Change already implemented (tasks checked off): the code may no longer match the revised plan; suggest `/openspec-apply-change`.
   - Everything done and implemented: suggest `/openspec-archive-change`.

**Output**

Show: which artifacts were revised (and which proposed revisions were rejected); any file created under a partly populated glob artifact; anything deferred because it does not exist yet (never `skipped` artifacts); where the change stands and the recommended next command.

**Guardrails**
- Planning artifacts only - NEVER edit implementation code. If the revised plan implies code changes, stop and point to `/openspec-apply-change`.
- Use the artifact ids and paths from `schema.yaml`; never branch on hardcoded artifact names.
- Edit only existing files, plus a confirmed concrete path under a partly populated glob artifact; never a glob pattern.
- Do not advance the build frontier: creating whole missing artifacts is a separate workflow. Leave `skipped` artifacts untouched.
- Confirm every edit with the user before writing.
- If the request changes the change's intent rather than refining it, recommend starting a fresh change (the "Update vs. Start Fresh" heuristic).
