import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import fg from "fast-glob";
import { loadConfigFile, loadConfig, getDefaultTestGlobs } from "../config.js";
import { validateTasksEvidence } from "../utils/evidence.js";
import { resolveCanonicalPath } from "../utils/paths.js";

export interface VerifyOptions {
  cwd?: string;
  configPath?: string;
  strict?: boolean;
  change?: string;
  /** Execute configured test/coverage/mutation commands. */
  runCommands?: boolean;
  /** Injectable command runner (tests). */
  exec?: CommandRunner;
  /** Injectable changed-file list; null/undefined = detect via git. */
  changedFiles?: string[] | null;
}

export type CommandRunner = (command: string, cwd: string) => { status: number; output: string };

export const defaultExec: CommandRunner = (command, cwd) => {
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status ?? 1, output: `${r.stdout}${r.stderr}` };
};

/** Last "NN%" / "NN.N%" in output, or null. */
export function parseScore(output: string): number | null {
  const all = [...output.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  return all.length ? parseFloat(all[all.length - 1][1]) : null;
}

/** True when every changed file is docs/spec-only (no source touched). */
export function isDocsOnlyChange(changedFiles: string[]): boolean {
  return changedFiles.every(
    (f) => /\.(md|mdx|txt)$/i.test(f) || /^(openspec|docs)\//.test(f)
  );
}

export function detectChangedFiles(cwd: string, baseRef = "main"): string[] | null {
  const r = spawnSync("git", ["diff", "--name-only", baseRef], { cwd, encoding: "utf-8" });
  if (r.status !== 0) return null;
  return r.stdout.split(/\r?\n/).filter(Boolean);
}

export interface RailSpec {
  name: string;
  command: string | undefined;
  minScore?: number;
  required: boolean;
}

export function runRail(spec: RailSpec, cwd: string, exec: CommandRunner): string[] {
  if (!spec.command || !spec.command.trim()) {
    return spec.required ? [`${spec.name} command is empty; configure it in spec-rails.config.json`] : [];
  }
  const res = exec(spec.command, cwd);
  if (res.status !== 0) {
    return [`${spec.name} command failed (exit ${res.status}): ${spec.command}\n${res.output}`];
  }
  if (spec.minScore !== undefined) {
    const score = parseScore(res.output);
    if (score !== null && score < spec.minScore) {
      return [`${spec.name} score ${score}% is below threshold ${spec.minScore}%`];
    }
  }
  return [];
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

  let testGlobs = getDefaultTestGlobs("auto");
  let strict = options.strict ?? true;
  let minCoverage = 95;
  let minMutation = 95;
  let rails: RailSpec[] = [];

  try {
    const config = options.configPath ? loadConfigFile(options.configPath) : loadConfig(cwd);
    testGlobs = config.testGlobs ?? getDefaultTestGlobs(config.stack);
    strict = options.strict !== undefined ? options.strict : config.strict;
    minCoverage = config.coverageMinScore;
    minMutation = config.mutationMinScore;
    rails = [
      { name: "test", command: config.testCommand, required: true },
      { name: "coverage", command: config.coverageCommand, minScore: config.coverageMinScore, required: false },
      { name: "mutation", command: config.mutationCommand, required: false },
    ];
  } catch (err: unknown) {
    errors.push(`Failed to load config: ${(err as Error).message}`);
  }

  const discoveredTests = discoverTests(cwd, testGlobs);
  const changed =
    options.runCommands || options.changedFiles !== undefined
      ? options.changedFiles === undefined
        ? detectChangedFiles(cwd)
        : options.changedFiles
      : null;
  const docsOnly = changed !== null && changed.length > 0 && isDocsOnlyChange(changed);
  if (options.runCommands) {
    const exec = options.exec ?? defaultExec;
    for (const rail of rails) {
      if (rail.name === "mutation" && docsOnly) {
        console.log("[spec-rails] mutation rail skipped: docs/spec-only changeset (informational pass)");
        continue;
      }
      errors.push(...runRail(rail, cwd, exec));
    }
  }
  if (discoveredTests.length === 0 && strict && !docsOnly) {
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
