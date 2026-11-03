# Proposal

## Intent
Harden the Spec-Rails development workflow by formalizing Carlos Kelkboom's lead-architect agent rules (upfront contract scaffolding and human comprehension verification), providing an optional parallel worktree bake-off pattern, updating documentation, and calibrating the mutation testing rail to > 90%.

## Problem Statement
Autonomous AI agents left unchecked produce architectural degradation, invent unauthorized abstractions, and attempt complex inline refactors on code they hallucinated. Without explicit protocol boundaries, agents edit files prematurely without contract scaffolding, and teams accept AI PRs they cannot mentally verify. Furthermore, teams lack a documented workflow for running competitive bake-offs across candidate models/prompts when tackling difficult algorithmic slices. In addition, an inflexible 100% mutation kill requirement creates friction on equivalent mutants and defensive logging/error branches without adding architectural value.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `openspec-addon`: Adds agent architectural guardrails (`REQ-OSA-33` Contract Scaffolding Rail, `REQ-OSA-34` Comprehension Verification Gate, `REQ-OSA-35` Optional Parallel Bake-Off Pattern, and `REQ-OSA-36` Mutation Threshold Calibration to > 90%).

## Scope

### In-Scope
- Update `rules/AGENTS.md` and `rules/WORKFLOW.md` to establish:
  - Contract Scaffolding Rail: types, interfaces, schemas, and empty function signatures committed before slice code generation.
  - Comprehension Verification: human must be able to explain every line of diff; ununderstood code is deleted immediately.
  - Mutation threshold calibration: update threshold from 100% to > 90% kill score on core logic.
- Update `docs/how-tos/03-parallel-worktrees-multi-agent.md` to document the optional competitive candidate bake-off mode (`.worktrees/<id>-cand-a`, `.worktrees/<id>-cand-b`) scored on rails pass, mutation kill (> 90%), and minimal diff complexity.
- Update documentation across `README.md`, `docs/WIKI.md`, `docs/WAY_OF_WORKING.md`, `docs/DESIGN.md`, and `docs/how-tos/` to reflect > 90% mutation kill score and the new agent rules.
- Update `schemas/spec-rails/templates/tasks.md` and `schemas/spec-rails/schema.yaml` to include scaffolding checklists, the comprehension sign-off item, and `mutation > 90%`.
- Sync installed copies in `openspec/spec-rails/`, `openspec/schemas/spec-rails/`, and ensure `make test` / selfcopy passes.

### Out-of-Scope (YAGNI)
- Forced worktree isolation for single-slice or linear tasks (standard lane branches write directly).
- Bake-off as a requirement (bake-offs are strictly optional).
- Tooling/scripting additions to `bin/` for automated LLM tournament scoring.
- Integration with third-party multi-agent frameworks.

## Assumptions
- **ASM-GEN-1**: Human developers retain final review authority and can evaluate diff clarity at Gate 6.
- **ASM-GEN-2**: Existing testing rails ($\ge 95\%$ coverage, $> 90\%$ mutation kill) provide objective scoring for candidate bake-offs and core verification.

## Success Metrics
- Protocol rules explicitly define contract scaffolding before slice dispatch, comprehension verification, and > 90% mutation score.
- Documentation provides clear, copy-pasteable recipe for optional parallel bake-offs in Git worktrees.
- All docs consistently reflect > 90% mutation kill.
- `make test` passes with all self-copies in sync.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
