import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { type Stack } from "../config.js";
import { fileURLToPath } from "node:url";

export interface InitOptions {
  cwd?: string;
  stack?: Stack;
  force?: boolean;
}

export interface InitResult {
  detectedStack: Stack;
  createdFiles: string[];
}

export function detectStack(targetDir: string): Stack {
  if (fs.existsSync(path.join(targetDir, "package.json"))) {
    return "ts";
  }
  if (
    fs.existsSync(path.join(targetDir, "pyproject.toml")) ||
    fs.existsSync(path.join(targetDir, "requirements.txt")) ||
    fs.existsSync(path.join(targetDir, "setup.py"))
  ) {
    return "python";
  }
  if (fs.existsSync(path.join(targetDir, "go.mod"))) {
    return "go";
  }
  if (fs.existsSync(path.join(targetDir, "Cargo.toml"))) {
    return "rust";
  }
  return "auto";
}

interface StackMeta {
  testCommand: string;
  coverageCommand?: string;
  mutationCommand?: string;
  presetFile?: string;
}

export function getStackMeta(stack: Stack): StackMeta {
  switch (stack) {
    case "ts":
      return {
        testCommand: "npm test",
        coverageCommand: "npm run test:coverage",
        mutationCommand: "npx stryker run",
        presetFile: "stryker.config.json",
      };
    case "python":
      return {
        testCommand: "pytest",
        coverageCommand: "pytest --cov",
        mutationCommand: "mutmut run",
        presetFile: "mutmut.ini",
      };
    case "go":
      return {
        testCommand: "go test ./...",
        coverageCommand: "go test -coverprofile=coverage.out ./...",
        mutationCommand: "gremlins unleash",
        presetFile: "gremlins.yaml",
      };
    case "rust":
      return {
        testCommand: "cargo test",
        coverageCommand: "cargo tarpaulin",
        mutationCommand: "cargo mutants",
        presetFile: "cargo-mutants.toml",
      };
    default:
      return {
        testCommand: "npm test",
      };
  }
}

export function findAssetRoot(currentDir: string = path.dirname(fileURLToPath(import.meta.url))): string {
  const devRoot = path.resolve(currentDir, "../..");
  if (fs.existsSync(path.join(devRoot, "openspec/schemas/spec-rails"))) {
    return devRoot;
  }
  const distRoot = path.resolve(currentDir, "..");
  if (fs.existsSync(path.join(distRoot, "openspec/schemas/spec-rails"))) {
    return distRoot;
  }
  return devRoot;
}

export function scaffoldDeveloperGuide(targetDir: string): string[] {
  const docsDir = path.join(targetDir, "docs/spec-rails");
  fs.mkdirSync(docsDir, { recursive: true });

  const workflowContent = `# Spec-Rails Workflow Guide

## Lanes
- **Feature Lane (\`feat/<id>-<slug>\`)**: Gated feature progression (Gates 0 → 4).
- **Bugfix Lane (\`fix/<slug>\`)**: Zero-contamination bug isolation with red test reproduction (Gates B1 → B3).
- **Chore Lane (\`chore/<slug>\`)**: Zero behavior change tasks (docs, maintenance).

## Sequential Gate Enforcement
- **Gate 0**: Research & Options Matrix
- **Gate 1**: Proposal & Intent
- **Gate 2**: Architecture Design & Living Spec Delta
- **Gate 3**: Tasks DAG Breakdown & Red-Green-Refactor Plan
- **Gate 4**: Verification & Evidence Check
- **Gate 5 / 6**: Stream Merges & Final Delivery

Direct commits to \`main\` or \`master\` are strictly blocked by branch protection.
`;

  const commandsContent = `# Spec-Rails CLI Commands

## Commands

### \`spec-rails init\`
Initialize Spec-Rails in an OpenSpec repository. Fails fast if \`openspec/\` is absent.
\`\`\`bash
npx --no-install spec-rails init [--stack ts|python|go|rust] [--force]
\`\`\`

### \`spec-rails check\`
Verify OpenSpec change gates, lane conventions, and task lists.
\`\`\`bash
npx --no-install spec-rails check [--audit]
\`\`\`

### \`spec-rails verify\`
Run test suite and verify coverage and mutation score thresholds.
\`\`\`bash
npx --no-install spec-rails verify
\`\`\`
`;

  const railsContent = `# Spec-Rails Testing Rails

## Minimum Thresholds
- **Coverage**: $\\ge 95%$ line / branch coverage.
- **Mutation Kill Score**: $\\ge 95%$ mutation score.

## Supported Stacks
- **TypeScript / Node.js**: Vitest / Jest + Stryker
- **Python**: Pytest + Mutmut
- **Go**: go test + Gremlins
- **Rust**: cargo test + cargo-mutants
`;

  const workflowPath = path.join(docsDir, "WORKFLOW.md");
  const commandsPath = path.join(docsDir, "COMMANDS.md");
  const railsPath = path.join(docsDir, "RAILS.md");

  fs.writeFileSync(workflowPath, workflowContent);
  fs.writeFileSync(commandsPath, commandsContent);
  fs.writeFileSync(railsPath, railsContent);

  return [workflowPath, commandsPath, railsPath];
}

export function findPresetsDir(currentDir: string = path.dirname(fileURLToPath(import.meta.url))): string {
  const devPresets = path.resolve(currentDir, "../../templates/presets");
  if (fs.existsSync(devPresets)) {
    return devPresets;
  }
  return path.resolve(currentDir, "../templates/presets");
}

export function generatePreCommitConfig(stack: Stack, testCommand: string): string {
  return `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: local
    hooks:
      - id: branch-protection
        name: spec-rails branch protection
        entry: >-
          sh -c 'branch=$(git branch --show-current 2>/dev/null || echo ""); if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then echo "ERROR: Direct commits to $branch are forbidden by Spec-Rails workflow." >&2; exit 1; fi'
        language: system
        pass_filenames: false

      - id: spec-rails-check
        name: spec-rails gate and lane check
        entry: npx --no-install spec-rails check
        language: system
        pass_filenames: false

      # Project-specific test hook tailored to detected stack (${stack})
      - id: test
        name: test suite
        entry: ${testCommand}
        language: system
        pass_filenames: false
`;
}

function copyFileSafe(src: string, dest: string, force: boolean = false): boolean {
  if (!fs.existsSync(src)) return false;
  if (fs.existsSync(dest) && !force) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirRecursive(srcDir: string, destDir: string): void {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function initProject(options: InitOptions = {}): InitResult {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const openspecDir = path.join(cwd, "openspec");
  if (!fs.existsSync(openspecDir)) {
    throw new Error("OpenSpec repository not detected: 'openspec/' directory is missing. Run 'openspec init' first before running 'spec-rails init'.");
  }

  const stackOption = options.stack || "auto";
  const force = options.force || false;

  const detectedStack = stackOption === "auto" ? detectStack(cwd) : stackOption;
  const meta = getStackMeta(detectedStack);

  const configPath = path.join(cwd, "spec-rails.config.json");
  if (fs.existsSync(configPath) && !force) {
    throw new Error(`Configuration file already exists at ${configPath}. Use --force to overwrite.`);
  }

  const configPayload = {
    stack: detectedStack,
    strict: true,
    testCommand: meta.testCommand,
    ...(meta.coverageCommand ? { coverageCommand: meta.coverageCommand, coverageMinScore: 95 } : {}),
    ...(meta.mutationCommand ? { mutationCommand: meta.mutationCommand, mutationMinScore: 95 } : {}),
  };

  fs.writeFileSync(configPath, JSON.stringify(configPayload, null, 2) + "\n");
  const createdFiles: string[] = [configPath];

  // Copy preset file if available
  if (meta.presetFile) {
    const presetsDir = findPresetsDir();
    const sourcePreset = path.join(presetsDir, detectedStack, meta.presetFile);
    const destPreset = path.join(cwd, meta.presetFile);

    if (!fs.existsSync(destPreset) || force) {
      if (fs.existsSync(sourcePreset)) {
        fs.copyFileSync(sourcePreset, destPreset);
        createdFiles.push(destPreset);
      }
    }
  }

  // Wire schemas, configs, skills, templates, and docs
  const root = findAssetRoot();

  // 1. Copy schemas from canonical openspec/schemas/spec-rails
  const schemaSrc = path.join(root, "openspec/schemas/spec-rails");
  const schemaDest = path.join(openspecDir, "schemas/spec-rails");
  copyDirRecursive(schemaSrc, schemaDest);

  // 2. Set schema: spec-rails in openspec/config.yaml
  const cfgPath = path.join(openspecDir, "config.yaml");
  let cfgContent = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, "utf-8") : "";
  if (!cfgContent.includes("schema: spec-rails")) {
    if (/^schema:\s*.*$/m.test(cfgContent)) {
      cfgContent = cfgContent.replace(/^schema:\s*.*$/m, "schema: spec-rails");
    } else {
      cfgContent = `schema: spec-rails\n${cfgContent}`;
    }
    fs.writeFileSync(cfgPath, cfgContent.trim() + "\n");
  }

  // 3. Copy documentation, rules, & mutation templates from canonical openspec/spec-rails
  const specRailsSrc = path.join(root, "openspec/spec-rails");
  const specRailsDest = path.join(openspecDir, "spec-rails");
  copyDirRecursive(specRailsSrc, specRailsDest);

  // 4. Copy skill from canonical .agents/skills/spec-rails
  const skillSrc = path.join(root, ".agents/skills/spec-rails/SKILL.md");
  const fallbackSkillSrc = path.join(root, "skills/spec-rails/SKILL.md");
  if (fs.existsSync(skillSrc)) {
    copyFileSafe(skillSrc, path.join(cwd, ".agents/skills/spec-rails/SKILL.md"), true);
  } else {
    copyFileSafe(fallbackSkillSrc, path.join(cwd, ".agents/skills/spec-rails/SKILL.md"), true);
  }

  // 5. Scaffold developer guide in docs/spec-rails/
  const docFiles = scaffoldDeveloperGuide(cwd);
  createdFiles.push(...docFiles);

  // 6. Write customizable templates
    const preCommitPath = path.join(cwd, ".pre-commit-config.yaml");
    if (!fs.existsSync(preCommitPath) || force) {
      fs.writeFileSync(preCommitPath, generatePreCommitConfig(detectedStack, meta.testCommand));
    }
    copyFileSafe(path.join(root, "templates/spec-rails-ci.yml"), path.join(cwd, ".github/workflows/spec-rails-ci.yml"), force);

    // 7. Configure .gitignore for .worktrees/
    const gitignorePath = path.join(cwd, ".gitignore");
    let giContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf-8") : "";
    if (!giContent.includes(".worktrees/")) {
      giContent = `${giContent.trim()}\n\n.worktrees/\n`;
      fs.writeFileSync(gitignorePath, giContent);
    }

    // 8. Configure pre-commit framework (clean up .legacy hook and install)
    const gitDir = path.join(cwd, ".git");
    if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
      const legacyHook = path.join(gitDir, "hooks/pre-commit.legacy");
      if (fs.existsSync(legacyHook)) {
        fs.rmSync(legacyHook, { force: true });
      }

      try {
        execSync("pre-commit install", { cwd, stdio: ["ignore", "ignore", "ignore"] });
      } catch {
        // pre-commit CLI may not be on PATH in minimal or test environments
      }
    }

  return {
    detectedStack,
    createdFiles,
  };
}
