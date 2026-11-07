# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

W5.5 calls for stack-derived commands, `uv run` when `uv.lock` exists, mutmut 3 configuration, and a survivor-count mutation wrapper with a documented timeout policy.

- `initProject` already selects commands for TypeScript, Python, Go, and Rust. Python currently uses bare `pytest` and `mutmut run` and copies a `mutmut.ini` preset.
- `verify` runs configured commands and reads the last percentage in their output. A successful command without a percentage currently passes without a score check.
- The archived `w5-finish-rails` proposal and delta spec do not contain Review Gate sections; that archive has no documented human gate approvals.
- All W5.1-W5.13 roadmap rows currently say shipped, but W5.5 still has the gaps above. The checked row-status criterion is not evidence that the implementation is complete.

## 2. Options Explored

**Option A: Stack-aware initialization and a Python mutation wrapper.**
Use the detected Python project context to select `uv run` commands, provide a mutmut 3-compatible preset without overwriting existing project configuration, and supply a wrapper that reports a score from mutation results. Define how timeouts, missing results, and command errors affect the score and exit status in the specification.

**Option B: Document manual Python configuration.**
Keep initialization and verification unchanged; document commands and score calculation for each adopter to configure. This avoids new runtime code but does not deliver the W5.5 automated behavior.

**Option C: Generalize score handling for all mutation tools.**
Build a common adapter layer for Python, TypeScript, Go, and Rust tools. This might unify reporting but adds scope and tool-specific behavior not needed to close the identified Python gap.

## 3. Tradeoff Matrix

| Criteria | Option A | Option B | Option C |
| :--- | :--- | :--- | :--- |
| Complexity | Focused Python changes | Lowest | Highest |
| New Dependencies | None intended | None | Potential tool-specific dependencies |
| Performance & Latency | Mutation runtime plus result collection | Adopter-managed | Mutation runtime plus adapters |
| Maintenance Burden | One Python integration | Adopters maintain their own | Multiple integrations |
| Blast Radius | Python initialization and wrapper | Documentation only | All supported stacks |

## 4. Recommendation

Choose Option A. Specify the supported mutmut version, result format, zero-mutant behavior, and timeout policy before implementation; do not silently pass an unmeasurable mutation run.

## 5. Breaking Changes & Deprecations

Generated Python commands and the preset would change for newly initialized projects; existing configurations must not be overwritten without the existing force behavior. `REQ-OSA-36` (stack presets and initialization) may need modification and `REQ-OSA-47` (strict rail execution) must be checked for any score-handling changes; no deprecation is proposed.

## Disposition

Dropped at the user's request in favor of the language-neutral `w5-5-mutation-scores` change.

## Review Gate
- [x] **Gate 0 Decision**: Human decides Go (name the option) or No-Go before the proposal is drafted.
