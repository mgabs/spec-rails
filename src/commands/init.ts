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
  if (fs.existsSync(path.join(devRoot, "schemas/spec-rails"))) {
    return devRoot;
  }
  const distRoot = path.resolve(currentDir, "..");
  if (fs.existsSync(path.join(distRoot, "schemas/spec-rails"))) {
    return distRoot;
  }
  return devRoot;
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
      - id: check-lgtm-directives
        name: check unresolved lgtm review directives
        entry: >-
          sh -c 'if [ -d .lgtm/reviews ]; then d=$(grep -rn "^#ref " .lgtm/reviews 2>/dev/null || true); if [ -n "$d" ]; then printf "ERROR: Unresolved LGTM directives in .lgtm/reviews/:\\n%s\\n" "$d" >&2; exit 1; fi; fi'
        language: system
        pass_filenames: false

      - id: branch-protection
        name: spec-rails branch protection
        entry: >-
          sh -c 'branch=$(git branch --show-current 2>/dev/null || echo ""); if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then echo "ERROR: Direct commits to $branch are forbidden by Spec-Rails workflow." >&2; exit 1; fi'
        language: system
        pass_filenames: false

      - id: spec-rails-check
        name: spec-rails gate and lane check
        entry: npx spec-rails check
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
  const stackOption = options.stack || "auto";
  const force = options.force || false;

  const detectedStack = stackOption === "auto" ? detectStack(cwd) : stackOption;
  const meta = getStackMeta(detectedStack);

  const configPath = path.join(cwd, "spec-rails.config.json");
  if (fs.existsSync(configPath) && !force) {
    throw new Error(`Configuration file already exists at ${configPath}. Use --force to overwrite.`);
  }

  const configPayload = {
    $schema: "https://raw.githubusercontent.com/openspec/spec-rails/main/schemas/spec-rails.schema.json",
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

  // If openspec exists in target directory, wire schemas, configs, skills and templates
  const openspecDir = path.join(cwd, "openspec");
  const root = findAssetRoot();

  if (fs.existsSync(openspecDir)) {
    // 1. Copy schemas
    const schemaSrc = path.join(root, "schemas/spec-rails");
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

    // 3. Copy documentation & rules
    copyFileSafe(path.join(root, "rules/AGENTS.md"), path.join(openspecDir, "spec-rails/AGENTS.md"), true);
    copyFileSafe(path.join(root, "rules/WORKFLOW.md"), path.join(openspecDir, "spec-rails/WORKFLOW.md"), true);
    copyFileSafe(path.join(root, "templates/bug-report.md"), path.join(openspecDir, "spec-rails/bug-report.md"), true);

    // 4. Copy mutation templates
    const mutSrc = path.join(root, "templates/mutation");
    const mutDest = path.join(openspecDir, "spec-rails/mutation");
    copyDirRecursive(mutSrc, mutDest);

    // 5. Copy skill
    copyFileSafe(path.join(root, "skills/spec-rails/SKILL.md"), path.join(cwd, ".agents/skills/spec-rails/SKILL.md"), true);

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
  }

  return {
    detectedStack,
    createdFiles,
  };
}
