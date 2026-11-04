import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { loadConfigFile, getDefaultTestGlobs } from "../config";
import { validateTasksEvidence } from "../utils/evidence";
import { resolveCanonicalPath } from "../utils/paths";

export interface VerifyOptions {
  cwd?: string;
  configPath?: string;
  strict?: boolean;
  change?: string;
}

export interface TraceabilityResult {
  valid: boolean;
  missing: string[];
}

export interface VerifyResult {
  success: boolean;
  errors: string[];
  discoveredTests: string[];
}

export function discoverTests(cwd: string, globs: string[]): string[] {
  return fg.sync(globs, {
    cwd,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });
}

export function extractDeltaSpecKeys(specContent: string): string[] {
  const lines = specContent.split(/\r?\n/);
  const keys: string[] = [];
  let inAddedOrModified = false;
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    if (/^##\s+(?:ADDED|MODIFIED)\s+Requirements/i.test(line)) {
      inAddedOrModified = true;
      continue;
    }
    if (/^##\s+/.test(line)) {
      inAddedOrModified = false;
      continue;
    }

    if (inAddedOrModified) {
      const match = line.match(/^###\s+Requirement:\s*((?:REQ|NFR)-[A-Za-z0-9-]+-[0-9]+)/i);
      if (match) {
        keys.push(match[1]);
      }
    }
  }

  return keys;
}

export function verifyTraceability(
  testFiles: string[],
  deltaSpecKeys: string[]
): TraceabilityResult {
  const missing: string[] = [];
  const testContents = testFiles.map((file) => {
    try {
      return fs.readFileSync(file).toString();
    } catch {
      return "";
    }
  });

  for (const key of deltaSpecKeys) {
    const regex = new RegExp(`(^|[^A-Za-z0-9_-])${key}([^A-Za-z0-9_-]|$)`);
    const isFound = testContents.some((content) => regex.test(content));
    if (!isFound) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function runVerify(options: VerifyOptions = {}): VerifyResult {
  const rawCwd = options.cwd ?? process.cwd();
  const cwd = resolveCanonicalPath(rawCwd);
  const errors: string[] = [];

  const configFilePath = options.configPath ?? path.join(cwd, "spec-rails.config.json");
  let testGlobs = getDefaultTestGlobs("auto");
  let strict = options.strict ?? true;
  let minCoverage = 95;
  let minMutation = 95;

  if (fs.existsSync(configFilePath)) {
    try {
      const config = loadConfigFile(configFilePath);
      testGlobs = config.testGlobs;
      strict = options.strict !== undefined ? options.strict : config.strict;
      minCoverage = config.coverageMinScore;
      minMutation = config.mutationMinScore;
    } catch (err: unknown) {
      errors.push(`Failed to load config: ${(err as Error).message}`);
    }
  }

  const discoveredTests = discoverTests(cwd, testGlobs);
  if (discoveredTests.length === 0 && strict) {
    errors.push(`No test files found matching globs: ${testGlobs.join(", ")}`);
  }

  // Scan openspec changes
  const changesDir = path.join(cwd, "openspec/changes");
  if (fs.existsSync(changesDir)) {
    const changeEntries = fs.readdirSync(changesDir, { withFileTypes: true });
    for (const entry of changeEntries) {
      if (!entry.isDirectory() || entry.name === "archive") {
        continue;
      }
      if (options.change && entry.name !== options.change) {
        continue;
      }

      const changePath = path.join(changesDir, entry.name);
      const tasksPath = path.join(changePath, "tasks.md");
      if (fs.existsSync(tasksPath)) {
        const tasksContent = fs.readFileSync(tasksPath).toString();
        const evResult = validateTasksEvidence(tasksContent, {
          strict,
          minCoverage,
          minMutation,
        });
        for (const evErr of evResult.errors) {
          errors.push(`[${entry.name}/tasks.md] ${evErr}`);
        }
      }

      // Check specs for traceability
      const specsDir = path.join(changePath, "specs");
      const specFiles = fg.sync(["**/*.md"], { cwd: specsDir, absolute: true });
      for (const specFile of specFiles) {
        const specContent = fs.readFileSync(specFile).toString();
        const keys = extractDeltaSpecKeys(specContent);
        const traceResult = verifyTraceability(discoveredTests, keys);
        for (const missingKey of traceResult.missing) {
          errors.push(
            `Traceability error in ${path.relative(cwd, specFile)}: ${missingKey} is not covered in any test files`
          );
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    discoveredTests,
  };
}
