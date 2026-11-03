import * as fs from "node:fs";
import * as path from "node:path";
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
    case "auto":
    default:
      return {
        testCommand: "npm test",
      };
  }
}

export function findPresetsDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const devPresets = path.resolve(currentDir, "../../templates/presets");
  if (fs.existsSync(devPresets)) {
    return devPresets;
  }
  return path.resolve(currentDir, "../templates/presets");
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

  fs.writeFileSync(configPath, JSON.stringify(configPayload, null, 2) + "\n", "utf-8");
  const createdFiles: string[] = [configPath];

  // Copy preset file if available
  if (meta.presetFile) {
    const presetsDir = findPresetsDir();
    const sourcePreset = path.join(presetsDir, detectedStack, meta.presetFile);
    const destPreset = path.join(cwd, meta.presetFile);

    if (!fs.existsSync(destPreset) || force) {
      fs.copyFileSync(sourcePreset, destPreset);
      createdFiles.push(destPreset);
    }
  }

  return {
    detectedStack,
    createdFiles,
  };
}
