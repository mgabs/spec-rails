# Spec-Rails Project Roadmap

Baseline: `main` · Status: `⬜ Planned` · `🚀 In Progress` · `✅ Shipped`

---

## 1. Completed Foundation (Waves 1–5 Summary)

| Wave | Scope | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Wave 1** | Core Workflow Protocol & Templates | ✅ | Language-agnostic workflow (`openspec/spec-rails/WORKFLOW.md`) and bug report template. |
| **Wave 2** | Pre-Commit & CI Automation | ✅ | Pre-commit framework integration (`.pre-commit-config.yaml`) and GitHub Actions workflow template (`templates/spec-rails-ci.yml`). |
| **Wave 3** | OpenSpec Addon Integration | ✅ | Custom `spec-rails` OpenSpec schema (`openspec/schemas/spec-rails/`), `openspec/` layout consolidation, requirement traceability. |
| **Wave 4** | OpenSpec v1.15/v1.16 Hardening | ✅ | Transitive gate DAG checks, OpenSpec JSON boundary handling, and agent skill packaging (`.agents/skills/spec-rails/SKILL.md`). |
| **Wave 5** | TypeScript CLI & Strict Testing Rails | ✅ | TypeScript CLI (`init`, `check`, `verify`, `audit`), `spec-rails.config.json`, stack detection (`ts`, `python`, `go`, `rust`), baseline mode (`openspec/spec-rails/baseline.txt`), docs-only mutation skip, and strict coverage/mutation score enforcement ($\ge 95\%$) with execution timeout. |

Dropped, do not re-propose:
- `spec-rails scaffold-check` (AST inspection of contract scaffolding; the Red rail already proves unfulfilled contracts).
- `spec-rails lint` (duplicates `openspec validate --strict` and schema constraints).
- Language-specific runner wrappers in core CLI (projects configure their own test/coverage/mutation commands in `spec-rails.config.json`).
- Mandatory `templates/roadmap.md` and `chore/roadmap-<id>` ceremony (OpenSpec tracks changes natively via `openspec list` and `openspec/changes/archive/`).

---

## 2. Wave 6: Pure OpenSpec Addon & Simplification

Refocus Spec-Rails as a thin, pure Spec Quality Gate and Testing-Railed workflow on top of `@fission-ai/openspec`: enforce step-by-step human review pauses at each gate (never drafting all artifacts in an unreviewed pass), validate real spec quality via `openspec validate --strict`, add pre-commit whitespace & EOF checks to prevent CI failures, fold test cases into `design.md`, replace rigid evidence regex tokens with free-text notes, collapse duplicate asset trees into a single source of truth, codify multi-agent worktree execution and subagent hygiene rails, remove external tool coupling, and unify all repository tests under Vitest.

| ID | Item | Depends on | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **W6.1** | Pure OpenSpec Schema & Gates 0–4 | — | ✅ Shipped | Remove `## Review Gate` from `spec.md` so OpenSpec delta specs stay 100% pure; fold test cases and strategy into `design.md` (**Gate 2**); renumber `tasks.md` to **Gate 3** and Verify & Archive to **Gate 4**; drop separate `.feature` tasks and Gate 5.x pauses from `schema.yaml` and `tasks.md` (`Contract scaffolding → Red → Green → Coverage & Mutation`). |
| **W6.2** | Spec Quality Gate, Review Pauses & Hygiene | W6.1 | ⬜ | Enforce step-by-step progression with explicit human review pauses at each gate (Gate 0 → Gate 1 → Gate 2 → Gate 3) before subsequent artifacts or code diffs are created; validate whitespace and EOF newline hygiene across change artifacts to catch formatting errors locally before pre-commit/CI fails; run `openspec validate <change> --strict` and verify every added/modified requirement in delta `spec.md` has a `REQ-<DOM>-<N>` or `NFR-<DOM>-<N>` key; simplify `evidence.ts` to require a free-text `Evidence:` note on ticked rail tasks. |
| **W6.3** | Single Asset Tree & Thin `init` | W6.2 | ⬜ | Set `package.json` name to `spec-rails` and use `npx --no-install spec-rails` in generated hooks and CI; use `openspec/schemas/spec-rails/`, `openspec/spec-rails/`, and `.agents/skills/spec-rails/` as the single canonical asset source (delete duplicate root `schemas/`, `rules/`, `skills/`, `templates/mutation/`, `openspec/spec-rails/mutation/`, legacy `rails.conf` parser, unused `templates/.pre-commit-config.yaml`, `templates/roadmap.md`, and non-existent `$schema` URL); fail fast in `spec-rails init` if `openspec/` is missing; scaffold developer guide in target repo (`docs/spec-rails/` explaining workflow, gates, commands, and rails); generate stack-matched CI workflow; remove all external review tool hooks and references. |
| **W6.4** | Vitest-Only Harness & Dead Code Deletion | W6.3 | 🚀 In Progress | Folded BDD lifecycle tests into `tests/unit/workflow.test.ts` and deleted `tests/bdd/`. Remaining: move `REQ-OSA-*` traceability IDs to `tests/unit/*.test.ts`; add `tests/unit/schema.test.ts`; port legacy `tests/*.sh` scripts to Vitest; delete `Makefile` and `tests/*.sh`; update `.github/workflows/` and `README.md` to use `npm test` and `npm run lint`. |
| **W6.5** | Worktree Execution Rails & Subagent Hygiene | W6.3 | ⬜ | Resolve Rule 4 vs Rule 3 friction by permitting `--no-verify` on atomic intermediate slice commits within isolated git worktrees, while strictly requiring the zero-bypass pre-commit + full verification suite before stream merge (Rule 2) and final gate; enforce declarative command shapes in Rule 3 (prohibit `cd <dir> && <cmd>`, mandating declarative target flags like `git -C`, package manager flags, and `--manifest-path` to maintain sandbox auto-approvals, prefix matching, and process tree monitors); codify zero-polling subagent invariant in `.agents/skills/spec-rails/SKILL.md` (prohibit status/log polling loops, mandating fire-and-halt with reactive wakeup on long-running test/mutation tasks to preserve token economy < 200k context). |

---

## 3. Wave 6 Exit Criteria

- [ ] All W6 items (W6.1–W6.5) marked `✅ Shipped`.
- [x] Planning workflow enforces step-by-step human review pauses at each gate (Gates 0–3); `spec.md` template has no `## Review Gate` footer.
- [ ] `spec-rails check` runs `openspec validate --strict`, validates whitespace/EOF newline hygiene on change artifacts, verifies `REQ-*`/`NFR-*` keys on delta requirements, and enforces Gates 0–3 before code diffs (`--audit`) or ticked implementation tasks.
- [ ] `spec-rails verify` accepts free-text `Evidence:` notes on rail tasks and verifies all `REQ-*`/`NFR-*` keys across `tests/unit/`.
- [ ] `spec-rails init` fails fast when `openspec/` is absent, scaffolds developer guide in `docs/spec-rails/`, and sets up stack-specific CI & pre-commit using `npx --no-install spec-rails`.
- [ ] Zero legacy `.sh` test scripts, zero `Makefile`, zero duplicate asset directories (`schemas/`, `rules/`, `skills/`, `templates/mutation/`), zero `templates/roadmap.md`, zero `.feature` files, and zero external review-tool hooks remain.
- [ ] Multi-agent worktree execution rails codified: declarative command shapes mandated, atomic worktree slice commit hook bypass permitted, and subagent zero-polling invariant enforced in `WORKFLOW.md` and agent skill.
- [ ] `npm test` and `npm run lint` pass with $\ge 95\%$ coverage and $\ge 95\%$ mutation kill score.
