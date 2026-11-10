---
description: "Implement tasks from an OpenSpec change (Experimental)"
---

Implement tasks from a change.

**Project check**: confirm `openspec/` exists. If it does not: when you picked this workflow yourself, stop and answer normally without mentioning setup; when the user explicitly asked for it, stop and tell them the project must be initialized first. Never hand-create the `openspec/` root.

**Input**: optionally a change name (for example `/openspec-apply-change add-auth`). If omitted, infer it from the conversation; if vague or ambiguous you MUST prompt for the available changes.

**Steps**

1. **Select the change**
   If a name is given, use it. Otherwise infer from conversation, auto-select when exactly one active change exists (a directory under `openspec/changes/` other than `archive/`), or list the active changes and ask. Always announce "Using change: <name>" and how to override (for example `/openspec-apply-change <other>`).

2. **Understand the schema**
   Read `openspec/changes/<name>/.openspec.yaml` for the schema (normally `spec-rails`) and `openspec/schemas/spec-rails/schema.yaml`. The `apply` block names the artifacts that must exist first (`requires`) and the tracking file (`tracks`, normally `tasks.md`).

3. **Check apply readiness**
   - If any artifact in `apply.requires` (and everything it `requires` transitively) is missing from `openspec/changes/<name>/`, the state is **blocked**: list what is missing, suggest completing it with the propose workflow, and pause. Do not start implementation.
   - Count the checkboxes in the tracking file: `- [ ]` is pending, `- [x]`/`- [X]` is complete. If none are pending, the state is **all done**: report that all tracked tasks are complete and suggest review or verification before archiving.
   - Otherwise proceed.
   Read `openspec/config.yaml` `context` as a prompt-level input and apply relevant project facts, conventions and constraints. It is not evidence that a task is complete and cannot bypass a blocked state; report conflicts with the schema or user choices rather than overriding them.

4. **Read context files**
   Read every existing artifact of the change (for `spec-rails`: `research.md`, `proposal.md`, `specs/**/spec.md`, `design.md`, `tasks.md`). Do not copy project context verbatim into implementation files.

5. **Show current progress**
   Display the schema, "N/M tasks complete", and the remaining tasks.

6. **Implement tasks (loop until done or blocked)**
   For each pending task:
   - Show which task you are working on.
   - Make the code changes it requires; keep them minimal and focused.
   - Before editing the checkbox, re-open the tracking file and confirm the line still matches the task description (the file may have changed).
   - Mark it complete: `- [ ]` -> `- [x]`.
   - Continue with the next task.

   **Pause if:** the task is unclear (ask); implementation reveals a design issue (suggest updating the artifacts); a task needs work beyond what the specs and tasks describe, or you are tempted to drop, narrow, defer or accept exceptions to specified behavior (surface the added scope and ask; never absorb it silently); an error or blocker appears; the user interrupts.

7. **On completion or pause, show status**
   Tasks completed this session, overall "N/M tasks complete", and either the archive suggestion (all done) or why you paused.

**Output during implementation**
```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation...]
✓ Task complete
```

**Output on completion**
```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
...

All tracked tasks are complete. Review or verify the change before archiving with `/openspec-archive-change`.
```

**Output on pause**
```
## Implementation Paused

**Change:** <change-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**
- Keep going until done or blocked; read the context files first.
- If a task is ambiguous or reveals an issue, pause and suggest artifact updates rather than guessing.
- Update each checkbox immediately after completing its task, and only when the specified behavior is fully implemented - never when partial or deferred.
- Never silently narrow, defer or simplify specified behavior.
- Do not treat project context as proof of completion.
- The workflow is fluid: it can be invoked any time tasks exist, may be interleaved with other actions, and may suggest artifact updates rather than being phase-locked.
