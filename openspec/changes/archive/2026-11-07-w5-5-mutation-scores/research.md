# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

Make mutation score enforcement independent of programming language and mutation tool. Projects supply their own mutation commands.

- `verify` runs the configured command and searches its output for the last percentage.
- A successful command with no percentage currently passes without enforcing the configured threshold; an unrelated percentage can be mistaken for the mutation score.
- `REQ-OSA-47` requires a below-threshold mutation score to fail. W5.5 additionally mentions stack-specific initialization and a survivor-count wrapper; those are not part of this new change.

## 2. Options Explored

**Option A: Explicit score output contract.** Require the configured mutation command, or a project-supplied wrapper, to emit a clearly identified numeric score. Fail when the score is missing, ambiguous, invalid, or below threshold. Document the contract without implementing tool-specific adapters.

**Option B: Infer a score from arbitrary output.** Extend automatic parsing for multiple tools. This is convenient when formats are recognized, but cannot reliably distinguish all tools' output and requires ongoing tool-specific maintenance.

**Option C: Delegate the threshold entirely to the command.** Trust its exit code. This is simple, but does not let `verify` enforce its configured mutation threshold.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| Complexity | Small, explicit contract | Growing parser surface | Lowest |
| New Dependencies | None | Potential adapters | None |
| Performance & Latency | Negligible parsing overhead | Depends on output | No parsing overhead |
| Maintenance Burden | One stable contract | Per-tool formats | Adopter-managed |
| Blast Radius | Configured mutation commands | Tool-specific integrations | Threshold enforcement |

## 4. Recommendation

Choose Option A. Define the exact output marker, compatibility behavior, and failure cases in the spec before implementation; projects can adapt tools that do not emit the contract themselves.

**Human decision:** Option C. The configured mutation command owns threshold enforcement; `verify` relies on its exit status.

## 5. Breaking Changes & Deprecations

Under Option C, `verify` would no longer enforce its configured mutation threshold itself. Projects must configure commands to fail when their required threshold is missed. `REQ-OSA-47` would require a modified delta; no change to language presets or initialization is proposed.

## Review Gate
- [x] c
