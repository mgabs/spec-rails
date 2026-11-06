import { execSync } from "node:child_process";

export interface AuditOptions {
  cwd?: string;
  baseRef?: string;
  headRef?: string;
}

export interface AuditResult {
  success: boolean;
  isChoreExempt: boolean;
  codeChanges: string[];
  specChanges: string[];
  errors: string[];
}

export function classifyChanges(changedFiles: string[]): {
  codeChanges: string[];
  specChanges: string[];
} {
  const codeChanges: string[] = [];
  const specChanges: string[] = [];

  for (const file of changedFiles) {
    const trimmed = file.trim();
    if (!trimmed) continue;

    // Spec changes: openspec/changes/<change>/, openspec/specs/, docs/bug-reports/ (excluding archive)
    const isSpecChange =
      /^(openspec\/(?:changes\/[^/]+\/|specs\/)|docs\/bug-reports\/)/.test(trimmed) &&
      !/^openspec\/changes\/archive\//.test(trimmed);

    if (isSpecChange) {
      specChanges.push(trimmed);
      continue;
    }

    // Code changes: any modified file NOT under openspec/(changes|specs|schemas)/, NOT under docs/, and NOT markdown
    const isExempt =
      /^(openspec\/(?:changes|specs|schemas)\/|docs\/|.*\.md$)/.test(trimmed);

    if (!isExempt) {
      codeChanges.push(trimmed);
    }
  }

  return { codeChanges, specChanges };
}

export function evaluateAudit(
  branchName: string,
  codeChanges: string[],
  specChanges: string[]
): AuditResult {
  if (branchName.startsWith("chore/")) {
    return {
      success: true,
      isChoreExempt: true,
      codeChanges,
      specChanges,
      errors: [],
    };
  }

  const errors: string[] = [];
  if (codeChanges.length > 0 && specChanges.length === 0) {
    errors.push(
      `ERROR: Code modified without an openspec/ change or docs/bug-reports/ entry.\nModified files:\n${codeChanges
        .map((f) => `  - ${f}`)
        .join("\n")}`
    );
  }

  return {
    success: errors.length === 0,
    isChoreExempt: false,
    codeChanges,
    specChanges,
    errors,
  };
}

export function runAudit(options: AuditOptions = {}): AuditResult {
  const cwd = options.cwd || process.cwd();
  const baseRef = options.baseRef || process.env.BASE_REF || "main";

  let branchName = options.headRef || process.env.HEAD_REF || "";
  if (!branchName) {
    try {
      branchName = execSync("git branch --show-current", { cwd, stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      branchName = "";
    }
  }

  let changedFilesRaw = "";
  try {
    try {
      changedFilesRaw = execSync(
        `git -c core.quotePath=false diff --no-renames --name-only origin/${baseRef}...HEAD --`,
        { cwd, stdio: ["ignore", "pipe", "ignore"] }
      ).toString();
    } catch {
      changedFilesRaw = execSync(
        `git -c core.quotePath=false diff --no-renames --name-only ${baseRef}...HEAD --`,
        { cwd, stdio: ["ignore", "pipe", "ignore"] }
      ).toString();
    }
  } catch (err: any) {
    return {
      success: false,
      isChoreExempt: false,
      codeChanges: [],
      specChanges: [],
      errors: [`Failed to compute git diff against base ref '${baseRef}': ${err.message}`],
    };
  }

  const changedFiles = changedFilesRaw.split(/\r?\n/).filter(Boolean);
  const { codeChanges, specChanges } = classifyChanges(changedFiles);

  return evaluateAudit(branchName, codeChanges, specChanges);
}
