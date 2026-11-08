import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import fg from "fast-glob";
import { runAudit, type AuditResult } from "./audit.js";

export interface CheckOptions {
  cwd?: string;
  store?: string;
  audit?: boolean;
  baseRef?: string;
  writeBaseline?: boolean;
}

export const BASELINE_FILE = "openspec/spec-rails/baseline.txt";

export function parseBaseline(content: string): Set<string> {
  return new Set(
    content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  );
}

export function loadBaseline(cwd: string): Set<string> {
  const file = path.join(cwd, BASELINE_FILE);
  if (!fs.existsSync(file)) return new Set();
  return parseBaseline(fs.readFileSync(file, "utf-8"));
}

export interface GateStateResult {
  ticked: boolean;
  isNoGo: boolean;
  state: "ticked" | "unticked" | "missing";
}

export interface CheckResult {
  success: boolean;
  violations: string[];
  auditResult?: AuditResult;
}

export interface ArtifactInfo {
  id: string;
  requires?: string[];
  status?: string;
}

export function parseGateState(content: string): GateStateResult {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let inReviewGate = false;
  let hasBox = false;
  let isTicked = false;
  let isNoGo = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^##\s+Review Gate\s*$/i.test(line)) {
      inReviewGate = true;
      hasBox = false;
      isTicked = false;
      isNoGo = false;
      continue;
    }

    if (/^##?\s+/.test(line)) {
      inReviewGate = false;
    }

    if (inReviewGate && /^-\s+\[[ xX]\]/.test(line)) {
      hasBox = true;
      if (/^-\s+\[[xX]\]/.test(line)) {
        if (/:[[:space:]]*no-go([[:space:].!]|$)/i.test(line) || /:\s*no-go([.\s!]|$)/i.test(line)) {
          isNoGo = true;
        } else {
          isTicked = true;
        }
      }
    }
  }

  let state: "ticked" | "unticked" | "missing" = "missing";
  if (isTicked && !isNoGo) {
    state = "ticked";
  } else if (hasBox || isNoGo) {
    state = "unticked";
  }

  return {
    ticked: isTicked && !isNoGo,
    isNoGo,
    state,
  };
}

export interface HygieneViolation {
  file: string;
  line?: number;
  message: string;
}

export function checkArtifactHygiene(filePath: string, content: string): HygieneViolation[] {
  const violations: HygieneViolation[] = [];
  if (content.length > 0 && !content.endsWith("\n")) {
    violations.push({ file: filePath, message: "Missing trailing newline at EOF" });
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/[ \t]+$/.test(lines[i])) {
      violations.push({ file: filePath, line: i + 1, message: `Trailing whitespace on line ${i + 1}` });
    }
  }
  return violations;
}

export function checkRequirementKeys(filePath: string, content: string): string[] {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/);
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+(ADDED|MODIFIED)\s+Requirements/i.test(line)) {
      inSection = true;
      continue;
    } else if (/^##\s+/.test(line)) {
      inSection = false;
      continue;
    }

    if (inSection && /^###\s+/.test(line)) {
      if (!/^###\s+Requirement:\s+(REQ|NFR)-[A-Z0-9]+-[0-9]+\s+.+$/.test(line)) {
        errors.push(
          `Invalid requirement header in ${filePath}:${i + 1}: '${line}'. Must match '### Requirement: (REQ|NFR)-<DOMAIN>-<N> <Name>'`
        );
      }
    }
  }
  return errors;
}

export function getGateNumber(id: string): number | string | null {
  switch (id) {
    case "research":
      return 0;
    case "proposal":
      return 1;
    case "design":
      return 2;
    case "tasks":
      return 3;
    case "specs":
      return null;
    default:
      return id;
  }
}

export function checkBranchAllowed(branchName: string): boolean {
  const trimmed = branchName.trim();
  if (trimmed === "main" || trimmed === "master") {
    return false;
  }
  return true;
}

export function hasTickedImplementationTasks(tasksContent: string): boolean {
  const lines = tasksContent.split(/\r?\n/);
  let inFence = false;
  let inReviewGate = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^##\s+Review Gate\s*$/i.test(line)) {
      inReviewGate = true;
      continue;
    }
    if (/^##?\s+/.test(line)) {
      inReviewGate = false;
    }

    if (!inReviewGate && /^\s*-\s+\[[xX]\]/.test(line)) {
      return true;
    }
  }

  return false;
}

export function parseArtifactState(
  changeDir: string,
  artifactId: string,
  existingOutputPaths?: string[]
): "ticked" | "unticked" | "missing" {
  if (artifactId === "specs") {
    let specFiles = existingOutputPaths || [];
    if (specFiles.length === 0) {
      specFiles = fg.sync(["specs/**/*.md"], {
        cwd: changeDir,
        absolute: true,
      });
    } else {
      specFiles = specFiles.map((f) => (path.isAbsolute(f) ? f : path.join(changeDir, f)));
    }

    if (specFiles.length === 0) return "missing";

    for (const file of specFiles) {
      if (!fs.existsSync(file)) return "missing";
    }
    return "ticked";
  }

  const filePath = path.join(changeDir, `${artifactId}.md`);
  if (!fs.existsSync(filePath)) return "missing";
  const content = fs.readFileSync(filePath, "utf-8");
  return parseGateState(content).state;
}

export function findGateViolations(
  changeName: string,
  artifacts: ArtifactInfo[],
  states: Record<string, "ticked" | "unticked" | "missing">,
  hasEarlyTasks: boolean
): string[] {
  const violations: string[] = [];

  // Compute transitive downstream map
  // downstream[u] = set of all artifacts that transitively depend on u
  const downstream = new Map<string, Set<string>>();
  for (const art of artifacts) {
    downstream.set(art.id, new Set<string>());
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const art of artifacts) {
      const artDownstream = downstream.get(art.id)!;
      for (const other of artifacts) {
        if (other.id === art.id) continue;
        const requires = other.requires || [];
        if (requires.includes(art.id) || requires.some((r) => artDownstream.has(r))) {
          if (!artDownstream.has(other.id)) {
            artDownstream.add(other.id);
            changed = true;
          }
        }
      }
    }
  }

  // Check transitive violations
  for (const art of artifacts) {
    const u = art.id;
    if (states[u] === "ticked") continue;

    const uDownstream = downstream.get(u) || new Set();
    const doneDownstream = artifacts.find(
      (d) => uDownstream.has(d.id) && d.status === "done"
    );

    if (doneDownstream) {
      const num = getGateNumber(u);
      if (num === null) continue;
      if (states[u] === "unticked") {
        violations.push(`${changeName}: Gate ${num} (${u}) unticked but '${doneDownstream.id}' exists`);
      } else {
        violations.push(
          `${changeName}: Gate ${num} (${u}) Review Gate section missing but '${doneDownstream.id}' exists`
        );
      }
    }
  }

  // Check early tasks
  if (hasEarlyTasks) {
    const tasksState = states["tasks"];
    if (tasksState === "unticked") {
      violations.push(`${changeName}: Gate 3 (tasks) unticked but implementation tasks are ticked`);
    } else if (tasksState !== "ticked") {
      violations.push(`${changeName}: Gate 3 (tasks) Review Gate section missing but implementation tasks are ticked`);
    }
  }

  return violations;
}

export function runCheck(options: CheckOptions = {}): CheckResult {
  const cwd = options.cwd || process.cwd();
  const violations: string[] = [];

  // 1. Branch protection check
  let branchName = "";
  try {
    branchName = execSync("git branch --show-current", { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    branchName = "";
  }

  if (branchName && !checkBranchAllowed(branchName)) {
    violations.push(
      `spec-rails-check: direct commits on '${branchName}' are not allowed; use a feature branch`
    );
  }

  // 2. Optional audit check
  let auditResult: AuditResult | undefined;
  if (options.audit) {
    auditResult = runAudit({ cwd, baseRef: options.baseRef });
    if (!auditResult.success) {
      violations.push(...auditResult.errors);
    }
  }

  // 3. OpenSpec list and status checking
  const storeFlag = options.store ? `--store ${options.store}` : "";
  let listOutput = "";
  try {
    listOutput = execSync(`openspec list --json ${storeFlag}`, {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
  } catch (err: any) {
    violations.push(`spec-rails-check: 'openspec list --json' failed: ${err.message}`);
    return { success: false, violations, auditResult };
  }

  let listData: any;
  try {
    listData = JSON.parse(listOutput);
  } catch {
    violations.push("spec-rails-check: cannot parse 'openspec list --json' output");
    return { success: false, violations, auditResult };
  }

  const changes = Array.isArray(listData.changes) ? listData.changes : [];
  const baseline = loadBaseline(cwd);
  const offenders = new Set<string>();
  for (const chg of changes) {
    const changeName = chg.name || chg;
    if (!changeName || typeof changeName !== "string") continue;

    let statusOutput = "";
    try {
      statusOutput = execSync(
        `openspec status --change ${changeName} --json ${storeFlag}`,
        { cwd, stdio: ["ignore", "pipe", "ignore"] }
      ).toString();
    } catch (err: any) {
      violations.push(`spec-rails-check: 'openspec status --change ${changeName} --json' failed`);
      continue;
    }

    let statusData: any;
    try {
      statusData = JSON.parse(statusOutput);
    } catch {
      violations.push(`spec-rails-check: cannot parse status JSON for '${changeName}'`);
      continue;
    }

    const changeRoot = statusData.changeRoot
      ? path.resolve(cwd, statusData.changeRoot)
      : path.join(cwd, "openspec/changes", changeName);

    const artifacts: ArtifactInfo[] = Array.isArray(statusData.artifacts)
      ? statusData.artifacts
      : [];

    const states: Record<string, "ticked" | "unticked" | "missing"> = {};
    for (const art of artifacts) {
      const outputPaths =
        statusData.artifactPaths?.[art.id]?.existingOutputPaths;
      states[art.id] = parseArtifactState(changeRoot, art.id, outputPaths);
    }

    let hasEarlyTasks = false;
    const tasksFile = path.join(changeRoot, "tasks.md");
    if (fs.existsSync(tasksFile)) {
      const tasksContent = fs.readFileSync(tasksFile, "utf-8");
      hasEarlyTasks = hasTickedImplementationTasks(tasksContent);
    }

    const changeViolations = findGateViolations(changeName, artifacts, states, hasEarlyTasks);

    // Validate change strictly using OpenSpec CLI
    try {
      execSync(`openspec validate ${changeName} --strict ${storeFlag}`.trim(), {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err: any) {
      changeViolations.push(
        `spec-rails-check: 'openspec validate ${changeName} --strict' failed: ${err.message}`
      );
    }

    // Assert Gate 3 is ticked if code modifications exist under audit
    if (auditResult && auditResult.codeChanges.length > 0 && !auditResult.isChoreExempt) {
      if (states["tasks"] !== "ticked") {
        changeViolations.push(
          `${changeName}: Gate 3 (tasks) unticked but code changes exist`
        );
      }
    }

    // Artifact hygiene & requirement key validation
    if (fs.existsSync(changeRoot)) {
      const mdFiles = fg.sync(["**/*.md"], { cwd: changeRoot, absolute: true });
      for (const mdFile of mdFiles) {
        const content = fs.readFileSync(mdFile, "utf-8");
        const relPath = path.relative(cwd, mdFile);
        const hygieneErrors = checkArtifactHygiene(relPath, content);
        for (const h of hygieneErrors) {
          changeViolations.push(
            h.line
              ? `${changeName}: ${h.file}:${h.line} ${h.message}`
              : `${changeName}: ${h.file} ${h.message}`
          );
        }

        if (mdFile.includes(`${path.sep}specs${path.sep}`) || mdFile.includes("/specs/")) {
          const keyErrors = checkRequirementKeys(relPath, content);
          for (const k of keyErrors) {
            changeViolations.push(`${changeName}: ${k}`);
          }
        }
      }
    }

    if (changeViolations.length > 0) offenders.add(changeName);
    if (!baseline.has(changeName)) violations.push(...changeViolations);
  }

  if (options.writeBaseline) {
    const file = path.join(cwd, BASELINE_FILE);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const names = [...offenders].sort();
    fs.writeFileSync(
      file,
      "# Grandfathered changes lacking Review Gate. New changes still gate.\n" +
        names.map((n) => `${n}\n`).join("")
    );
    return { success: true, violations: [], auditResult };
  }

  return {
    success: violations.length === 0,
    violations,
    auditResult,
  };
}
