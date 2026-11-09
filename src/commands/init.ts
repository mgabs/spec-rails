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
  actions: string[];
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
  if (
    fs.existsSync(path.join(targetDir, "build.gradle.kts")) ||
    fs.existsSync(path.join(targetDir, "build.gradle")) ||
    fs.existsSync(path.join(targetDir, "gradlew"))
  ) {
    return "gradle";
  }
  return "auto";
}

interface StackMeta {
  testCommand: string;
  coverageCommand?: string;
  mutationCommand?: string;
  presetFile?: string;
}

export function getStackMeta(stack: Stack, targetDir?: string): StackMeta {
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
    case "gradle": {
      let testCommand = "./gradlew test";
      if (targetDir) {
        const makefilePath = path.join(targetDir, "Makefile");
        if (fs.existsSync(makefilePath)) {
          const content = String(fs.readFileSync(makefilePath));
          if (/^test:/m.test(content)) {
            testCommand = "make test";
          }
        }
      }
      return {
        testCommand,
      };
    }
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

export function pruneLegacyFiles(targetDir: string): string[] {
  const legacyFiles = [
    "openspec/spec-rails/spec-rails-check",
    "openspec/spec-rails/spec-rails-verify",
    "openspec/spec-rails/rails.conf",
    "openspec/spec-rails/mutation/mutmut.ini",
    "mutmut.ini",
  ];
  const pruned: string[] = [];
  for (const file of legacyFiles) {
    const fullPath = path.join(targetDir, file);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath);
      pruned.push(fullPath);
    }
  }
  return pruned;
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
- **Python**: Pytest
- **Go**: go test + Gremlins
- **Rust**: cargo test + cargo-mutants
`;

  const guidePath = path.join(docsDir, "GUIDE.md");
  const oldWorkflowPath = path.join(docsDir, "WORKFLOW.md");
  fs.rmSync(oldWorkflowPath, { force: true });
  const commandsPath = path.join(docsDir, "COMMANDS.md");
  const railsPath = path.join(docsDir, "RAILS.md");

  fs.writeFileSync(guidePath, workflowContent);
  fs.writeFileSync(commandsPath, commandsContent);
  fs.writeFileSync(railsPath, railsContent);

  return [guidePath, commandsPath, railsPath];
}

export function findPresetsDir(currentDir: string = path.dirname(fileURLToPath(import.meta.url))): string {
  const devPresets = path.resolve(currentDir, "../../templates/presets");
  if (fs.existsSync(devPresets)) {
    return devPresets;
  }
  return path.resolve(currentDir, "../templates/presets");
}

const indentOf = (line: string): number => line.length - line.trimStart().length;

export function removeHookBlock(yaml: string, hookId: string): string {
  const lines = yaml.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^[ \\t]*-[ \\t]+id:[ \\t]+${hookId}\\b`).test(l));
  if (start === -1) return yaml;
  const marker = indentOf(lines[start]);
  let end = start + 1;
  while (end < lines.length && indentOf(lines[end]) > marker) end++;
  const from = start > 0 && lines[start - 1] === "" ? start - 1 : start;
  lines.splice(from, end - from);
  return lines.join("\n");
}

export function modernizePreCommitConfig(content: string): string {
  let updated = content;
  for (const id of ["check-lgtm-directives", "spec-rails-verify", "spec-rails-check"]) {
    updated = removeHookBlock(updated, id);
  }
  return updated;
}

export function isStaleWorkflow(content: string): boolean {
  return /spec-rails (check|verify)|openspec\/spec-rails\/spec-rails-/.test(content);
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

      # Project-specific test hook tailored to detected stack (${stack})
      - id: test
        name: test suite
        entry: ${testCommand}
        language: system
        pass_filenames: false
`;
}

function copyFileSafe(src: string, dest: string, force: boolean = false): boolean {
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
  const meta = getStackMeta(detectedStack, cwd);

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
  const actions: string[] = [`created ${path.relative(cwd, configPath)}`];

  // Copy preset file if available
  if (meta.presetFile) {
    const presetsDir = findPresetsDir();
    const sourcePreset = path.join(presetsDir, detectedStack, meta.presetFile);
    const destPreset = path.join(cwd, meta.presetFile);

    if (!fs.existsSync(destPreset) || force) {
      fs.copyFileSync(sourcePreset, destPreset);
      createdFiles.push(destPreset);
      actions.push(`created ${meta.presetFile}`);
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

  // 3. Prune legacy v0.1 files and copy documentation, rules, & mutation templates
  for (const pruned of pruneLegacyFiles(cwd)) {
    actions.push(`removed ${path.relative(cwd, pruned)}`);
  }
  const specRailsSrc = path.join(root, "openspec/spec-rails");
  const specRailsDest = path.join(openspecDir, "spec-rails");
  copyDirRecursive(specRailsSrc, specRailsDest);
  fs.rmSync(path.join(specRailsDest, "rails.conf"), { force: true });

  // 4. Copy skill from canonical .agents/skills/spec-rails
  const skillSrc = [".agents/skills/spec-rails/SKILL.md", "skills/spec-rails/SKILL.md"]
    .map((rel) => path.join(root, rel))
    .find((candidate) => fs.existsSync(candidate));
  if (skillSrc) {
    copyFileSafe(skillSrc, path.join(cwd, ".agents/skills/spec-rails/SKILL.md"), true);
  }

  // 5. Scaffold developer guide in docs/spec-rails/
  const docFiles = scaffoldDeveloperGuide(cwd);
  createdFiles.push(...docFiles);

  // 6. Write or modernize customizable templates
  const preCommitPath = path.join(cwd, ".pre-commit-config.yaml");
  if (!fs.existsSync(preCommitPath)) {
    fs.writeFileSync(preCommitPath, generatePreCommitConfig(detectedStack, meta.testCommand));
    actions.push("wrote .pre-commit-config.yaml");
  } else {
    const existingPreCommit = fs.readFileSync(preCommitPath, "utf-8");
    const modernized = modernizePreCommitConfig(existingPreCommit);
    if (modernized !== existingPreCommit) {
      fs.writeFileSync(preCommitPath, modernized);
      actions.push("removed spec-rails hooks from .pre-commit-config.yaml");
    }
  }

  const workflowPath = path.join(cwd, ".github/workflows/spec-rails-ci.yml");
  const workflowExists = fs.existsSync(workflowPath);
  if (!workflowExists || isStaleWorkflow(String(fs.readFileSync(workflowPath)))) {
    copyFileSafe(path.join(root, "templates/spec-rails-ci.yml"), workflowPath, true);
    actions.push(`${workflowExists ? "replaced" : "created"} .github/workflows/spec-rails-ci.yml`);
  }

  const todoPath = path.join(specRailsDest, "TODO.md");
  if (copyFileSafe(path.join(root, "templates/TODO.md"), todoPath)) {
    actions.push("created openspec/spec-rails/TODO.md");
  }
  actions.push("TODO: complete openspec/spec-rails/TODO.md (coverage and mutation checks)");

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
      fs.rmSync(path.join(gitDir, "hooks/pre-commit.legacy"), { force: true });

      // Stryker disable all: depends on the host's pre-commit CLI and would rewrite this repo's own hook
      try {
        execSync("pre-commit install", { cwd, stdio: ["ignore", "ignore", "ignore"] });
      } catch {
        // pre-commit CLI may not be on PATH in minimal or test environments
      }
      // Stryker restore all
    }

  return {
    detectedStack,
    createdFiles,
    actions,
  };
}
