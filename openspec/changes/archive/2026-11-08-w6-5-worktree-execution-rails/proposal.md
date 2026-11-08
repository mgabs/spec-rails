# Proposal: Worktree Execution Rails & Subagent Hygiene (W6.5)

## Intent
Codify execution rails for multi-agent parallel Git worktrees and subagent token economics by defining a tiered commit verification policy (permitting `--no-verify` on intermediate slice commits within isolated worktrees while strictly requiring zero-bypass pre-commit before stream merges), mandating declarative command shapes (prohibiting `cd <dir> && <cmd>`), and establishing a strict subagent zero-polling invariant.

## Problem Statement
1. In multi-agent worktree workflows, running full pre-commit test suites on intermediate atomic commits (such as failing Red TDD steps) causes workflow friction, leading to monolithic un-sliceable commits.
2. Agents running chained shell commands like `cd .worktrees/foo && npm test` break terminal prefix matching, disable auto-approval rules, and contaminate process directories.
3. Subagents running test suites or mutation runs frequently poll task statuses and log files in tight loops, burning tens of thousands of tokens and inflating conversation context toward the 200k limit.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `openspec-addon`: Codify worktree intermediate commit permissions, declarative command flag requirements (`git -C`, `--prefix`), and the subagent zero-polling invariant in protocol documentation and rules.

## Scope

### In-Scope
- Update `WORKFLOW.md` (and canonical installed copies in `rules/`, `openspec/spec-rails/`):
  - Rule 3: Mandate declarative command shapes (`git -C`, `--prefix`, `--manifest-path`) and prohibit directory change chains (`cd <dir> && <cmd>`).
  - Rule 4: Clarify that `--no-verify` is permitted for intermediate atomic commits inside isolated worktrees (`.worktrees/`), but strictly prohibited on stream merges, feature branch integration, and production merges.
- Update `.agents/skills/spec-rails/SKILL.md` (and source `skills/spec-rails/SKILL.md`):
  - Codify the subagent zero-polling invariant: agents launching background tasks must halt their turn immediately and rely on reactive wakeups.
  - Document the declarative command flags and intermediate worktree commit patterns.
- Add test coverage in `tests/unit/hygiene.test.ts` to assert that documentation and skills reflect declarative command rules and zero-polling guidelines.

### Out-of-Scope (YAGNI)
- Implementing daemon-based process supervisors.
- Modifying core CLI binaries (`init`, `check`, `verify`, `audit`).

## Assumptions
- **ASM-GEN-1**: Pre-commit hooks installed by Spec-Rails will still protect developers against unverified commits on `main` and on feature/stream branch integration commits.
- **ASM-GEN-2**: Modern developer tools support declarative target flags (`git -C`, `npm --prefix`, `cargo --manifest-path`, `pytest --rootdir`).

## Success Metrics
- `WORKFLOW.md` explicitly defines intermediate worktree commit policy and declarative command flags.
- `.agents/skills/spec-rails/SKILL.md` codifies declarative shapes and the zero-polling invariant.
- All unit and hygiene tests pass with 100% compliance.

## Review Gate
- [x] **Gate 1 Approval**: Proposal reviewed and approved by human before drafting specs.
