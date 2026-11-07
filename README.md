# Spec-Rails — Spec-Driven, Testing-Railed Development

Distributable, language-agnostic development workflow combining **Spec-Driven** human review gates, **Multi-Agent Git Worktree** parallelism, **BDD + Red-Green-Mutation Testing Rails**, and **Zero-Contamination Bug Isolation**.

Paired with [mgabs/lgtm](https://github.com/mgabs/lgtm) as the real-time code review cockpit and agent steering harness.

---

## Methodology & Logic

Spec-Rails solves the core failure modes of autonomous and pair-programming AI development: **hallucinated scope**, **stale architectural documentation**, **tautological/untested code**, and **branch pollution**.

```mermaid
flowchart LR
    subgraph SPEC_RAILS_Protocol [Spec-Rails Protocol & Rails]
        Specs[1. Specs & Invariants] --> RedTest[2. BDD & Unit Red]
        RedTest --> Green[3. Minimal Green Code]
        Green --> Mutation["4. Mutation >=95% Kill"]
    end

    subgraph LGTM_Harness [mgabs/lgtm Review Cockpit]
        TUI[Terminal Diff & Static Guard] --> Directives["#ref file:line Directives"]
        Directives --> AntiFraud[Anti-Neutering & YAGNI Guard]
    end

    SPEC_RAILS_Protocol <--> LGTM_Harness
```

### 1. Spec-Driven, Not Prompt-Driven (The Ponytail Mindset & Strict YAGNI)
- AI agents easily over-engineer or misinterpret informal prompts.
- Spec-Rails applies the **Ponytail Mindset**: strictly adhere to YAGNI (You Aren't Gonna Need It), eliminating speculative abstractions and unsolicited features.
- Structured **Human Gates** enforce boundaries before code is written:
  - **Gate 0 (Research)**: Explores 2–3 options and tradeoffs; the human decides Go or No-Go.
  - **Gate 1 (Proposal)**: Pinpoints intent, measurable success metrics, and strict Out-of-Scope (YAGNI) boundaries.
  - **Gate 2 (Specs)**: Formalizes uniquely keyed requirements (`REQ-*`, `NFR-*`) and Given/When/Then scenarios.
  - **Gate 3 (Design)**: Enforces domain boundaries (Pure Core vs. I/O Shell) and latency/allocation budgets.
  - **Gate 4 (Tasks DAG)**: Maps dependencies and partitions orthogonal tasks into parallel worktree streams.
  - **Apply (Gate 5.x) and Gate 6**: Per vertical slice, BDD sign-off then Red, Green, coverage, mutation; finally `openspec validate` and `openspec archive`.
- Drive changes with `openspec new change`, `openspec instructions <artifact>` or the `/opsx-*` commands (equivalently the `openspec-*` skills; see `docs/how-tos/05-configure-ai-agents.md`).

### 2. Testing Rails: BDD, Red-Green, >= 95% Mutation Kill
- Tests are not written after the fact as documentation. They are rails that guide the code.
- **Red-First**: Unit tests must fail before production code is written.
- **Mutation Verification**: Coverage numbers ($\ge 95\%$) can be gamed with tautological assertions. Spec-Rails requires **$\ge 95\%$ mutation kill score** on domain logic. Any surviving mutant below threshold flips the status to blocking failure: either an assertion is missing, or dead code was written and must be deleted.

### 3. Zero-Contamination Git Worktree Isolation
- `main` is always shippable and pristine.
- Vertical slices execute in disposable Git worktrees (`.worktrees/`).
- Bugfixes use the **Fast-Track Protocol** (Gates B1–B3): isolated in `.worktrees/fix-<slug>` off `main`, verified with a failing Red test before code changes, and merged via `--ff-only`.

### 4. Harness Pairing: [mgabs/lgtm](https://github.com/mgabs/lgtm)
Spec-Rails pairs natively with [mgabs/lgtm](https://github.com/mgabs/lgtm), a keyboard-driven terminal diff reviewer and AI agent steering TUI:
- **Line-Anchored Directives (`#ref file:line <directive>`)**: Human reviewers navigate streaming diffs using Vim keybindings and inject actionable steering chords (`ca` coverage, `cs` security, `cr` refactor) directly into active agent panes.
- **Anti-Fraud & Test Neutering Guardrails**: `lgtm`'s static analysis automatically blocks test neutering (deleted assertions, skipped tests, mock inflation, self-assertions) and dead function addition (YAGNI violations).
- **Native MCP Agent Mode**: Coding agents query diffs, security audits, and review directives programmatically via `lgtm serve --mcp`.

### 5. Companion Tools & Agent Ecosystem
Spec-Rails integrates with and draws inspiration from complementary agent tooling:
- **[mgabs/lgtm](https://github.com/mgabs/lgtm)**: Real-time terminal diff review cockpit, anti-fraud guardrails, and line-anchored agent steering harness.
- **[google/elephant-goldfish-model](https://github.com/google/elephant-goldfish-model)**: Dual-agent spec-driven framework pairing context-rich drafting (The Elephant) with adversarial zero-context review (The Goldfish).
- **[obra/superpowers](https://github.com/obra/superpowers)**: Composable agent skills and capability harnesses for autonomous workflows.
- **[dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail)**: The Ponytail engineering discipline: strict YAGNI, boring over clever, and code liability minimization.
- **[JordanCoin/codingskills](https://github.com/JordanCoin/codingskills)**: Curated agent coding skills, testing playbooks, and development heuristics.

---

## Repository Layout

Why this shape: the protocol and rules ship with the addon (`openspec/spec-rails/`); per-project data (delivery status, bug reports) lives in `docs/`. See [Where Things Live](docs/WIKI.md#16-where-things-live-and-why-docs) for the rationale and [Specs Structure](docs/WIKI.md#17-specs-structure) for how changes, delta specs and living specs fit together. There is no `specs/` folder; it was easily confused with `openspec/specs/`.

```text
spec-rails/
├── src/                      # TypeScript CLI implementation (init, check, verify, audit)
├── dist/cli.js               # Bundled CLI binary (Node >= 18)
├── schemas/spec-rails/       # OpenSpec schema + artifact templates (copied into target repos)
├── templates/                # spec-rails-ci.yml, bug-report.md, roadmap.md, presets, pre-commit config
├── rules/                    # AGENTS.md (always-on guardrails), WORKFLOW.md (canonical protocol, shipped to openspec/spec-rails/)
├── skills/spec-rails/SKILL.md# Agent skill runbook
├── openspec/                 # This repo's own OpenSpec layout (specs, changes, installed schema and spec-rails/ copies)
├── .agents/, .github/        # OpenSpec-generated skills, prompts, agent; CI workflows
├── docs/                     # ROADMAP (delivery status), DESIGN, WAY_OF_WORKING, WIKI, bug-reports/, how-tos/01–05
├── tests/                    # installer, check, schema, lint suites + bdd/
├── Makefile                  # `make test`
└── plugin.json               # Agent plugin manifest
```

---

## Quick Start

### Install on an OpenSpec Project
Prerequisites: an existing `openspec init` project, OpenSpec ≥ 1.15.0, and Node.js ≥ 18.
```bash
npx spec-rails init [target-repo]
```

Scaffolds `spec-rails.config.json` with detected stack commands and thresholds, copies the `spec-rails` schema to `openspec/schemas/spec-rails/`, sets `schema: spec-rails` in `openspec/config.yaml`, installs local hooks into `.pre-commit-config.yaml` (spec-rails gate check, unresolved LGTM directives, branch protection), copies mutation presets, agent rules (`openspec/spec-rails/`), and `.agents/skills/spec-rails/SKILL.md` automatically, and ignores `.worktrees/`. Re-running is a no-op. Spec requirements use `### Requirement: REQ-<DOMAIN>-<N> <name>` headers in OpenSpec delta specs. Gate and lane check: `npx spec-rails check`. See `openspec/spec-rails/WORKFLOW.md` §7.

### Documentation & Guides

- **Suggested Watch**: [Lead Architect Reveals His Rules for Coding Agents (Beyond Coding #272)](https://www.youtube.com/watch?v=mkN4uRZYPfs) — Carlos Kelkboom on contract scaffolding, understanding generated code, and parallel worktrees.
- **Delivery Status**: [docs/ROADMAP.md](docs/ROADMAP.md); **Design Note**: [docs/DESIGN.md](docs/DESIGN.md)
- **Architecture & Methodology Wiki**: [docs/WIKI.md](docs/WIKI.md)
- **Review Harness & Agent Steering**: [github.com/mgabs/lgtm](https://github.com/mgabs/lgtm)
- **How-To 1**: [Bootstrap a New Project](docs/how-tos/01-bootstrap-new-project.md)
- **How-To 2**: [Drive Feature Lifecycle (Gates 0–6)](docs/how-tos/02-drive-feature-lifecycle.md)
- **How-To 3**: [Parallel Worktrees & Multi-Agent Streams](docs/how-tos/03-parallel-worktrees-multi-agent.md)
- **How-To 4**: [Fast-Track Bugfix Protocol](docs/how-tos/04-fast-track-bugfix.md)
- **How-To 5**: [Configure AI Agents](docs/how-tos/05-configure-ai-agents.md)

### Running Tests
```bash
make test        # lint, installer, schema, gate check, CI audit, self-copy sync, e2e, BDD
make test-e2e    # real OpenSpec CLI in a throwaway repo; skips if openspec is missing
```
`make test-lint` also checks that doc links resolve, docs do not tell users to copy templates by hand, and no shell helper is unused.

### Verifying the Test Rails in CI
The CI workflow runs `npx spec-rails verify` as a verification step (never a commit hook). It fails the PR when:
- A `REQ-*`/`NFR-*` key in an active change appears in no discovered test file matching `testGlobs`.
- A ticked Red/Green/Coverage/Mutation task lacks `Evidence: <command and result>`.
- Any configured command (`testCommand`, `coverageCommand`, `mutationCommand`) exits non-zero.
- The coverage score falls below `coverageMinScore` (default: 95%).
- The mutation command output lacks a numeric percentage score or falls below `mutationMinScore` (default: 95%).
- Any rail command execution exceeds the process execution timeout (default: 10 minutes).

The commands are yours, configured in `spec-rails.config.json`, so any language or stack works. For docs-only or spec-only changesets, the mutation rail is skipped with an informational pass. Tag requirements in tests, for example `@REQ-X-1` in a `.feature` file.
