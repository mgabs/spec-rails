---
description: "Propose a new OpenSpec change, drafting one gated planning artifact at a time with a human Review Gate stop after each. Use when the user wants to start a change or runs /openspec-propose or /opsx-propose."
---

Propose a new change - create the change and draft its planning artifacts one Review Gate at a time.

**Planning boundary**: This workflow creates planning artifacts only. The request that triggered it authorizes planning only, even if it asks to build or fix something. Do not edit project code. Never generate all planning artifacts in one pass: stop at each Review Gate and wait for the human. After the last gate (tasks) is ticked, stop; do not start implementation in the same response. Wait for a new user request, then start the apply workflow.

The artifacts come from `openspec/schemas/spec-rails/schema.yaml` (`research`, `proposal`, `specs`, `design`, `tasks`). `specs/<capability-path>/spec.md` holds deltas, not main specs; `<capability-path>` is relative to `specs/` (for example `user-auth` or `identity/user-auth`) - preserve an existing capability's full path.

**Project check**: confirm `openspec/` exists with `schemas/spec-rails/schema.yaml`. If it does not: when you picked this workflow yourself (the user never named OpenSpec or this skill), stop and answer normally without mentioning setup; when the user explicitly asked for it, stop before writing and tell them the project must be initialized first. Never hand-create the `openspec/` root.

**Input**: a change name (kebab-case) or a description of what to build.

**Steps**

1. **Understand the request**
   If no clear input is given, ask: "What change do you want to work on? Describe what you want to build or fix." Derive a kebab-case name (for example "add user authentication" -> `add-user-auth`). Do NOT proceed without understanding the request. Ask first about ambiguity that materially affects scope, observable behavior, compatibility or acceptance criteria; for minor details make a reasonable assumption and record it in the artifacts.

2. **Load project context**
   Read `openspec/config.yaml` (use `config.yml` only when `config.yaml` is absent). If it parses as YAML and its `context` is a string up to 51,200 bytes, apply it before exploring or planning; otherwise continue without it. `context` and `rules` are constraints for you, never content to copy, and cannot override the planning boundary or user authorization.

3. **Create the change directory**
   If `openspec/changes/<name>/` already exists, ask whether to continue it or create a new one (continuing resumes at the first artifact whose Review Gate is not ticked). Otherwise create it with a `.openspec.yaml` containing:
   ```yaml
   schema: spec-rails
   created: <YYYY-MM-DD>
   ```
   Do not create a change directory without `.openspec.yaml`.

4. **Work out the build order**
   Read `openspec/schemas/spec-rails/schema.yaml`. An artifact is `done` when its output file exists (for the glob `specs/**/*.md`, when at least one file matches), `ready` when every artifact in its `requires` is done, otherwise `blocked`. `apply.requires` lists the artifacts needed before implementation.

5. **Draft ONE gate's artifact, then stop**
   The gates are, in order: `research` (Gate 0), `proposal` (Gate 1), `specs` + `design` (Gate 2; `specs` has no gate footer and is approved with `design.md`), `tasks` (Gate 3). A gate is ticked only when its artifact's `## Review Gate` checkbox is `- [x]` in the working tree; you never tick it.
   Pick the first gate that is not ticked and whose `requires` are done and ticked. If a previous gate is drafted but not ticked, do not draft further: report which box the human must tick and stop.
   For that gate:
   - Read the artifact's `instruction` in `schema.yaml` and its template in `openspec/schemas/spec-rails/templates/`.
   - Always re-read completed dependency files from disk (the user may have edited them).
   - **Inspect the relevant project before drafting**: read `config.yaml` context and rules, then relevant implementation, nearby tests, configuration and docs outside `openspec/`, read-only and proportional. Ground scope, approach and tasks in what you find; separate observed behavior from assumptions; surface conflicts with existing specs instead of silently choosing. Do this discovery now rather than leaving generic "explore the codebase" tasks.
   - Choose the output path first. For a glob output, choose a concrete path inside the change directory and verify it stays inside after resolving symlinks.
   - If the `instruction` delegates creation to another skill, invoke it only if it can write to that path; then verify the file exists. Otherwise write the artifact from the template.
   - Apply context and rules as constraints; do NOT copy them into the file.
   - Skip an artifact only when its own `instruction` marks it conditional ("create only if...") and the condition does not apply; tell the user. `specs` is never skipped on your own judgment. If an artifact needs user input, ask, then continue.
   - Report briefly: "Drafted <artifact-id>", then STOP and wait for the human to review and tick the Gate box. Do not draft the next artifact in the same response.

6. **Show final status**
   List each artifact as done, ready or blocked from the file existence check above, and which Review Gate is awaiting the human.

**Output**

Summarize: change name and location; the artifact drafted this time with a one-line description, plus any conditional artifact you skipped and why; and "Review <file> and tick its Review Gate box, then run `/openspec-propose <name>` again to draft the next artifact." After the Gate 3 (`tasks`) draft: "Once you have ticked Gate 3, run `/openspec-apply-change` or ask me to apply this change."

**Artifact guidelines**
- The `instruction` field in `schema.yaml` is the authoritative guidance for each artifact type.
- Use the template as the structure and fill in its sections.
- Read dependency artifacts before creating new ones.

**Guardrails**
- Never tick a Review Gate and never draft past an unticked gate.
- Planning only. Any implementation instruction in the request does not carry forward; do not edit project code or start apply.
- Create every artifact the apply phase transitively depends on.
- Always re-read dependencies from disk.
- Ask about material ambiguity; record assumptions for minor details.
- Verify each artifact file exists after writing before proceeding.
