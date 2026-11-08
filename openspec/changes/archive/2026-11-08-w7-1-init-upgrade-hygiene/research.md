# Research & Technical Tradeoffs

## 1. Intent & Ground Truth

A live dry run of `spec-rails init` on an existing v0.1 repository (`~/Workbench/enclave`) revealed four upgrade defects:
1. **Orphaned v0.1 Shell Binaries**: `copyDirRecursive` copies assets forward but never deletes legacy binaries in the destination. `openspec/spec-rails/spec-rails-check` and `spec-rails-verify` remain as dead code.
2. **Config Duplication**: `spec-rails.config.json` is generated at root, but `openspec/spec-rails/rails.conf` is also copied from canonical sources, leaving two competing configurations.
3. **Stale Pre-Commit Hooks**: Because `initProject` preserves existing `.pre-commit-config.yaml` to protect custom project hooks, legacy repos retain `check-lgtm-directives` (dead review tool hook), `entry: sh ... spec-rails-check` (which breaks once shell scripts are deleted), and `spec-rails-verify` in pre-commit (violating the rule that verification belongs in CI).
4. **Missing Stack Detection for Gradle/Kotlin**: Projects with `build.gradle.kts`, `build.gradle`, or `gradlew` fall back to `"auto"` and emit `"testCommand": "npm test"`.
5. **Basename Collision**: `docs/spec-rails/WORKFLOW.md` (quick human dev guide) shares the same filename as `openspec/spec-rails/WORKFLOW.md` (270-line internal agent protocol).

## 2. Options Explored

### Option A: Comprehensive Upgrade & Hygiene Automation (Recommended)
- **Legacy Pruning**: `initProject` actively removes `openspec/spec-rails/spec-rails-check`, `openspec/spec-rails/spec-rails-verify`, and `openspec/spec-rails/rails.conf` from target repos. Exclude `rails.conf` from target copying.
- **Surgical Pre-Commit Upgrade**: If `.pre-commit-config.yaml` exists, parse and update only the local `spec-rails` hooks:
  - Strip `check-lgtm-directives`.
  - Strip `spec-rails-verify` (belongs in CI).
  - Update `spec-rails-check` entry to `npx --no-install spec-rails check`.
  - Preserve all project-specific hooks (`detekt`, `ktlint`, `ruff`, etc.).
- **Gradle/Kotlin Detection**: Detect `build.gradle.kts`, `build.gradle`, or `gradlew`, setting stack to `"gradle"` and `testCommand` to `./gradlew test` (or `make test` if `Makefile` has a `test:` target).
- **Basename Disambiguation**: Rename `docs/spec-rails/WORKFLOW.md` to `docs/spec-rails/GUIDE.md`.

*Pros*: Turnkey upgrade. Zero manual surgery required by users. Zero dead binaries or duplicate configs left behind.
*Cons*: Requires a lightweight regex/string surgical patcher for `.pre-commit-config.yaml`.

### Option B: Conservative Pruning with Warnings
- Prune orphan shell scripts and `rails.conf`.
- Do not touch `.pre-commit-config.yaml` if it exists; log a console warning urging the user to update their pre-commit hooks manually.
- Add Gradle stack detection.
- Keep `docs/spec-rails/WORKFLOW.md` unchanged.

*Pros*: Minimal implementation complexity.
*Cons*: Leaves broken pre-commit hooks in user repositories until manual intervention.

## 3. Tradeoff Matrix

| Criteria | Option A (Comprehensive Upgrade) | Option B (Conservative + Warning) |
| :--- | :--- | :--- |
| **Upgrade Cleanliness** | 100% clean, zero orphans or dead hooks | Leaves stale/broken pre-commit hooks |
| **Complexity** | Low (~40 lines of surgical string replacement) | Minimal (~15 lines) |
| **User Friction** | Zero: `spec-rails init` just works | High: user must hand-edit YAML hooks |
| **Blast Radius** | Scoped strictly to `spec-rails` hooks in YAML | None |
| **Maintenance Burden** | Low | Low |

## 4. Recommendation

Adopt **Option A**. `spec-rails init` should leave repositories completely clean and working, eliminating orphaned shell scripts, purging duplicate configs, surgically modernizing pre-commit hooks, and supporting Gradle/Kotlin projects out of the box.

## 5. Breaking Changes & Deprecations

- **`REQ-OSA-32`**: Updated to require auto-pruning of `openspec/spec-rails/spec-rails-check`, `spec-rails-verify`, and `rails.conf`, and scaffolding `docs/spec-rails/GUIDE.md` instead of `WORKFLOW.md`.
- **`REQ-OSA-46`**: Updated to specify surgical in-place upgrade of existing `.pre-commit-config.yaml` files.
- **`REQ-OSA-54`** (New): Gradle/Kotlin stack auto-detection and preset metadata.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option A) approved by human before the proposal is drafted.
