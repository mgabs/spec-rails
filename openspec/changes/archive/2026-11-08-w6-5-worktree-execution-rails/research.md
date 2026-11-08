# Research & Technical Tradeoffs: Worktree Execution Rails & Subagent Hygiene (W6.5)

## 1. Intent & Ground Truth
- **Context & Friction**:
  1. *Rule 4 vs Rule 3 friction*: Rule 4 mandates a zero-bypass pre-commit hook protocol (`git commit --no-verify` is strictly forbidden). In multi-agent parallel workflows, intermediate atomic commits within isolated `.worktrees/<id>-<stream>` often fail pre-commit because the slice is mid-flight (e.g. Red failing tests). Agents either waste turns hacking hook bypasses or struggle with bloated monolithic commits.
  2. *Declarative Command Shapes*: Agent shells frequently run `cd <worktree> && <cmd>`. Chained compound commands defeat shell prefix-matching auto-approvals, break directory-sensitive sandbox monitors, and cause session directory state leakage.
  3. *Subagent Polling & Context Bleed*: Agents running long background test or mutation tasks frequently enter active polling loops (`git status`, task checks, log reads every few seconds), consuming tens of thousands of tokens and inflating context near the 200k limit.
- **Verified Constraints**:
  - Pre-commit hooks currently run on every `git commit` unless explicitly disabled or scoped.
  - Git natively supports `-C <dir>`, npm supports `--prefix <dir>`, cargo supports `--manifest-path <dir>`.
  - The messaging and task infrastructure supports reactive wakeup; manual polling is unnecessary.

## 2. Options Explored

### Option A: Formal Worktree Commit Tiering, Declarative Command Discipline & Reactive Invariant (Recommended)
- **Worktree Commit Tiering**: Explicitly permit `--no-verify` for *atomic intermediate commits* within isolated git worktrees (`.worktrees/<id>-<stream>`), while strictly enforcing the zero-bypass pre-commit + full verification suite before stream rebase/merge and PR creation.
- **Declarative Command Shapes**: Mandate target-scoped command shapes (`git -C <dir>`, `npm --prefix <dir>`, `cargo --manifest-path <dir>`) and prohibit `cd <dir> && <cmd>` in workflows, rules, and skills.
- **Zero-Polling Invariant**: Codify the rule that subagents and orchestrators must fire background tasks and halt turns immediately, waiting for reactive wakeups rather than polling logs/status loops.

### Option B: Disable Git Hooks Globally in Worktrees
- Configure worktrees with `git config core.hooksPath /dev/null`.
- Cons: Dangerous; developers and agents might accidentally merge unverified code from worktrees without running hooks.

### Option C: Keep Strict Zero-Bypass Everywhere Without Exceptions
- Require all intermediate commits inside worktrees to pass all pre-commit hooks.
- Cons: Prevents committing atomic Red test slices (where tests intentionally fail), violating true Red-Green TDD and multi-commit slice cadence.

## 3. Tradeoff Matrix

| Criteria | Option A (Tiered Rails + Declarative) | Option B (Disable Hooks in WT) | Option C (Strict Everywhere) |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low (clear rule distinctions) | Medium (config mutation) | Low (status quo) |
| **New Dependencies** | 0 | 0 | 0 |
| **Developer / Agent Velocity**| High (smooth atomic commits) | High (unprotected) | Low (frustrating pre-commit blocks) |
| **Token Economy (<200k)** | High (zero-polling enforced) | Neutral | Poor (polling loops unchecked) |
| **Safety & Verification** | Complete (full rails at merge gate)| Compromised | Complete |

## 4. Recommendation
Go with **Option A**. Codify tiered commit policies for worktrees, declarative command flags, and the zero-polling reactive wakeup invariant across `WORKFLOW.md`, `AGENTS.md`, and `.agents/skills/spec-rails/SKILL.md`.

## 5. Breaking Changes & Deprecations
- **None**: Clarifies and relaxes intermediate worktree commit restrictions without lowering integration safety gates.

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (Option A) or No-Go before the proposal is drafted.
