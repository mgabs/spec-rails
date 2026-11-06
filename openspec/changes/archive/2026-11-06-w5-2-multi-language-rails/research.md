# Research & Technical Tradeoffs: Multi-Language Rails & Anti-Drift Engine

## 1. Intent & Ground Truth

Spec-Rails provides a gated specification and testing-railed workflow (Gates 0–6, Red-Green-Mutation rails, Git worktree streams) paired with `mgabs/lgtm` and OpenSpec. However, third-party adoption outside shell environments encounters two major friction points:
1. **Third-Party Onboarding Rigidity & Stack Bias**:
   - Blanket symlink rejection (`bin/spec-rails:46-96`) aborts installation on macOS `/var` / `$HOME`, pnpm virtual stores, and monorepos.
   - Shell scripts suffer portability issues on Windows and require external `jq` binaries.
   - Hardcoded test discovery (`RAILS_TEST_DIRS="tests"`) fails on Go (`*_test.go`), Rust (`src/**`), and TypeScript (`src/**/*.test.ts`).
   - Missing turnkey mutation presets leave adopters without working configs for Stryker, mutmut, gremlins, or cargo-mutants.
2. **Agentic Drift**:
   - Autonomous AI coding agents drift during planning and slice execution when relying on narrative prose instead of mechanical token verification.

## 2. Options Explored

### Option A: Pure POSIX Shell + jq Core
- **Description**: Keep maintaining `bin/spec-rails` and `bin/spec-rails-verify` exclusively as POSIX `sh` scripts with `jq`.
- **Pros**: Zero runtime beyond standard shell + `jq`.
- **Cons**: Broken on native Windows without WSL/Cygwin; non-portable regex/sed nuances between GNU and BSD; hard dependency on external `jq` binary.

### Option B: Bundled Zero-Dependency TypeScript/Node.js CLI (Selected)
- **Description**: Implement the CLI and verification tooling in TypeScript (`@openspec/spec-rails`), bundled via `tsup` into a self-contained single-file executable (`dist/cli.js`) with zero runtime dependencies. Retain `bin/spec-rails` as a lightweight trampoline.
- **Pros**: Full cross-platform support across Linux, macOS, and Windows; built-in JSON parsing eliminating `jq`; typed Zod configuration schema; turnkey presets for TypeScript, Python, Go, and Rust.
- **Cons**: Requires Node.js (>= 18) installed on the host machine.

### Option C: Monolithic Multi-Language Compiler / AST Scaffolding Engine
- **Description**: Implement a unified AST-based mutation testing and scaffolding inspection engine directly inside Spec-Rails.
- **Pros**: Deep syntax inspection.
- **Cons**: Massive scope creep, requires heavy WASM parsers (Tree-sitter) across 4 languages; redundant with the Red-First test rail.

## 3. Tradeoff Matrix

| Criteria | Option A (Shell + jq) | Option B (Bundled Node CLI) | Option C (Monolithic AST) |
| :--- | :--- | :--- | :--- |
| **Complexity** | Low | Low-Medium (single bundle) | High (parsers + AST) |
| **New Dependencies** | None (`jq` required) | Node.js >= 18 (zero npm deps) | Tree-sitter WASM grammars |
| **Cross-Platform Portability** | Poor (fails on Windows) | High (macOS, Linux, Windows) | Medium |
| **Maintenance Burden** | High (fragile shell logic) | Low (typed TypeScript + Zod) | Very High |
| **Blast Radius** | Isolated | Core installer & verifier | Large architectural change |

## 4. Recommendation

Adopt **Option B**. Update living spec `NFR-OSA-1` to permit a self-contained Node.js (>= 18) single-file executable (`dist/cli.js`), eliminating external `jq` and delivering cross-platform pathing. Rely on Red-First test rails for contract enforcement (rejecting Option C).

## 5. Breaking Changes & Deprecations

- `NFR-OSA-1 (Dependencies)`: **MODIFIED** from POSIX `sh` + `jq` to Node.js (>= 18) self-contained executable bundle with zero runtime npm dependencies.
- `NFR-OSA-5 (Rails)`: **MODIFIED** to calibrate mutation kill score and test coverage thresholds to $\ge 95\%$ across all stacks.

## Review Gate
- [x] **Gate 0 Decision**: Go (Option B - Bundled Zero-Dependency TypeScript/Node.js CLI).
