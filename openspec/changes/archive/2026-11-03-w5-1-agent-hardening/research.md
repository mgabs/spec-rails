# Research & Technical Tradeoffs

## 1. Intent & Ground Truth
AI coding agents frequently introduce "agentic slop", hallucinated abstractions, and architectural degradation during iterative modifications. Analysis of Carlos Kelkboom's lead-architect framework (Beyond Coding Podcast #272) identifies 4 proven mechanisms for deterministic AI software engineering:
1. **Understand or Delete**: Zero black-box code in PRs.
2. **Contract Scaffolding Rail**: Skeletons, contracts, and interfaces committed before agent delegation.
3. **Read-Only Primary Orchestrator**: Root agent is strictly read-only; execution isolated in subagents.
4. **Competitive Multi-Agent Bake-Off**: Optional parallel evaluation in Git worktrees for complex slices.

Spec-Rails already enforces Git worktree isolation and red-green mutation rails, but lacks:
- Explicit protocol rules banning root agent source mutation.
- A formalized contract scaffolding phase prior to Gate 5.x slice delegation.
- A mandatory human comprehension verification checkpoint in Gate 6 and review directives.
- An optional candidate bake-off recipe in `docs/how-tos/03-parallel-worktrees-multi-agent.md`.

## 2. Options Explored
- **Option A (Rules & Docs Hardening)**: Formally integrate the 4 rules across `rules/AGENTS.md`, `rules/WORKFLOW.md`, `docs/how-tos/03-parallel-worktrees-multi-agent.md`, and `schemas/spec-rails/templates/tasks.md` with bake-off documented as an explicit optional pattern. Zero new dependencies, full POSIX/OpenSpec compatibility.
- **Option B (Tooling Enforcement)**: Modify `bin/spec-rails-check` to parse Git authorship/agent headers or automate worktree bake-off diff scoring scripts. Adds scripting complexity and CLI coupling.
- **Option C (Ad-hoc Guidance Only)**: Add a one-off how-to guide without updating canonical rules or schema templates. Leaves protocol rules unaligned with actual agent behavior.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low | High | Very Low |
| **New Dependencies** | None | Potential bash tooling additions | None |
| **Performance & Latency** | Instant (doc/rule checks) | Adds check runtime | None |
| **Maintenance Burden** | Minimal | Medium | Low (high drift risk) |
| **Blast Radius** | Rules, templates, how-tos, selfcopy sync | Scripts, tests, hooks | Isolated doc file |

## 4. Recommendation
Option A: strict Ponytail mindset / YAGNI. Embed architectural boundaries directly into `rules/` and `templates/` where agents and humans evaluate work, keeping bake-off strictly optional.

## 5. Breaking Changes & Deprecations
None. Extends living specs with protocol invariants (`REQ-OSA-33` through `NFR-OSA-5`).

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A)
