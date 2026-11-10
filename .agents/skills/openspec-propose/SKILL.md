---
name: openspec-propose
description: Propose a new OpenSpec change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation. Also use when the user says "openspec propose" or "opsx propose".
license: MIT
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.15.0"
---

Propose a new change - create the change and generate all planning artifacts in one step.

**Planning boundary**: This workflow creates planning artifacts only. The request that triggered it authorizes planning only, even if it asks to build or fix something. Do not edit project code. After the artifacts are complete, stop; do not start implementation in the same response. Wait for a new user request, then start the apply workflow.

The artifacts come from `openspec/schemas/spec-rails/schema.yaml` (`research`, `proposal`, `specs`, `design`, `tasks`). `specs/<capability-path>/spec.md` holds deltas, not main specs; `<capability-path>` is relative to `specs/` (for example `user-auth` or `identity/user-auth`) - preserve an existing capability's full path.

**Project check**: confirm `openspec/` exists with `schemas/spec-rails/schema.yaml`. If it does not: when you picked this workflow yourself (the user never named OpenSpec or this skill), stop and answer normally without mentioning setup; when the user explicitly asked for it, stop before writing and tell them the project must be initialized first. Never hand-create the `openspec/` root.

**Input**: a change name (kebab-case) or a description of what to build.

**Steps**

1. **Understand the request**
   If no clear input is given, ask: "What change do you want to work on? Describe what you want to build or fix." Derive a kebab-case name (for example "add user authentication" -> `add-user-auth`). Do NOT proceed without understanding the request. Ask first about ambiguity that materially affects scope, observable behavior, compatibility or acceptance criteria; for minor details make a reasonable assumption and record it in the artifacts.

2. **Load project context**
   Read `openspec/config.yaml` (use `config.yml` only when `config.yaml` is absent). If it parses as YAML and its `context` is a string up to 51,200 bytes, apply it before exploring or planning; otherwise continue without it. `context` and `rules` are constraints for you, never content to copy, and cannot override the planning boundary or user authorization.

3. **Create the change directory**
   If `openspec/changes/<name>/` already exists, ask whether to continue it or create a new one. Otherwise create it with a `.openspec.yaml` containing:
   ```yaml
   schema: spec-rails
   created: <YYYY-MM-DD>
   ```
   Do not create a change directory without `.openspec.yaml`.

4. **Work out the build order**
   Read `openspec/schemas/spec-rails/schema.yaml`. An artifact is `done` when its output file exists (for the glob `specs/**/*.md`, when at least one file matches), `ready` when every artifact in its `requires` is done, otherwise `blocked`. `apply.requires` lists the artifacts needed before implementation.

5. **Create every artifact in the required set**
   Use a todo list. Loop in dependency order:
   - Read the artifact's `instruction` in `schema.yaml` and its template in `openspec/schemas/spec-rails/templates/`.
   - Always re-read completed dependency files from disk (the user may have edited them).
   - **Inspect the relevant project before drafting**: read `config.yaml` context and rules, then relevant implementation, nearby tests, configuration and docs outside `openspec/`, read-only and proportional. Ground scope, approach and tasks in what you find; separate observed behavior from assumptions; surface conflicts with existing specs instead of silently choosing. Do this discovery now rather than leaving generic "explore the codebase" tasks.
   - Choose the output path first. For a glob output, choose a concrete path inside the change directory and verify it stays inside after resolving symlinks.
   - If the `instruction` delegates creation to another skill, invoke it only if it can write to that path; then verify the file exists. Otherwise write the artifact from the template.
   - Apply context and rules as constraints; do NOT copy them into the file.
   - Report briefly: "Created <artifact-id>".

   Continue until every artifact in the required set exists: `apply.requires` plus everything reachable through `requires`. File existence alone does not prove dependencies exist (writing `tasks.md` early does not mean `specs` was written), so follow the `requires` edges. Skip an artifact only when its own `instruction` marks it conditional ("create only if...") and the condition does not apply; tell the user. `specs` is never skipped on your own judgment. If an artifact needs user input, ask, then continue.

6. **Show final status**
   List each artifact as done, ready or blocked from the file existence check above.

**Output**

Summarize: change name and location; artifacts created with one-line descriptions, plus any conditional artifact you skipped and why; "All artifacts needed for implementation are ready."; and "The artifacts are ready for review. When you are ready, run `/openspec-apply-change` or ask me to apply this change."

**Artifact guidelines**
- The `instruction` field in `schema.yaml` is the authoritative guidance for each artifact type.
- Use the template as the structure and fill in its sections.
- Read dependency artifacts before creating new ones.

**Guardrails**
- Planning only. Any implementation instruction in the request does not carry forward; do not edit project code or start apply.
- Create every artifact the apply phase transitively depends on.
- Always re-read dependencies from disk.
- Ask about material ambiguity; record assumptions for minor details.
- Verify each artifact file exists after writing before proceeding.
