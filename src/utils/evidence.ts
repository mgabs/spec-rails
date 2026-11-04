export interface EvidenceToken {
  raw: string;
  cmd?: string;
  exit?: number;
  coverage?: number;
  mutation?: number;
}

export interface ValidationOptions {
  minCoverage?: number;
  minMutation?: number;
  strict?: boolean;
  requireRailTokens?: boolean;
  allowNonZeroExit?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function parseEvidenceToken(line: string): EvidenceToken | null {
  const marker = "Evidence:";
  const idx = line.indexOf(marker);
  if (idx === -1) {
    return null;
  }

  const raw = line.slice(idx + marker.length).trim();
  const token: EvidenceToken = { raw };

  const matches = raw.matchAll(/\[([A-Z]+):\s*([^\]]+)\]/g);
  for (const m of matches) {
    const key = m[1];
    const val = m[2].trim();
    if (key === "CMD") {
      token.cmd = val;
    } else if (key === "EXIT") {
      token.exit = parseInt(val, 10);
    } else if (key === "COVERAGE") {
      token.coverage = parseFloat(val);
    } else if (key === "MUTATION") {
      token.mutation = parseFloat(val);
    }
  }

  return token;
}

export function validateEvidenceToken(
  token: EvidenceToken,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const minCoverage = options.minCoverage ?? 95;
  const minMutation = options.minMutation ?? 95;

  if (options.requireRailTokens && options.strict) {
    if (token.exit === undefined || token.cmd === undefined) {
      errors.push("Missing structured [CMD: ...] or [EXIT: 0] token in strict mode");
    }
  }

  if (!options.allowNonZeroExit && token.exit !== undefined && token.exit !== 0) {
    errors.push(`Command exited with non-zero code: ${token.exit}`);
  }

  if (typeof token.coverage === "number" && token.coverage < minCoverage) {
    errors.push(`Coverage ${token.coverage}% is below required ${minCoverage}%`);
  }

  if (typeof token.mutation === "number" && token.mutation < minMutation) {
    errors.push(`Mutation score ${token.mutation}% is below required ${minMutation}%`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function parseTasksEvidence(tasksContent: string): {
  lineNumber: number;
  line: string;
  isRailTask: boolean;
  isRedTask: boolean;
  isCoverageMutationTask: boolean;
  token: EvidenceToken | null;
  hasPlaceholder: boolean;
}[] {
  const results: ReturnType<typeof parseTasksEvidence> = [];
  const lines = tasksContent.split(/\r?\n/);
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    if (/^\s*-\s*\[[xX]\]/.test(line)) {
      const lower = line.toLowerCase();
      const isRedTask = /\bred\b/.test(lower);
      const isGreenTask = /\bgreen\b/.test(lower);
      const isCoverageMutationTask = /\b(coverage|mutation)\b/.test(lower);
      const isRailTask = isRedTask || isGreenTask || isCoverageMutationTask;
      const token = parseEvidenceToken(line);
      const hasPlaceholder = line.includes("<command and result>");

      results.push({
        lineNumber: i + 1,
        line,
        isRailTask,
        isRedTask,
        isCoverageMutationTask,
        token,
        hasPlaceholder,
      });
    }
  }

  return results;
}

export function validateTasksEvidence(
  tasksContent: string,
  options: ValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const parsed = parseTasksEvidence(tasksContent);

  for (const item of parsed) {
    if (item.hasPlaceholder) {
      errors.push(`Line ${item.lineNumber}: Evidence has unresolved placeholder <command and result>`);
      continue;
    }

    if (item.isRailTask) {
      if (!item.token || item.token.raw.length === 0) {
        errors.push(`Line ${item.lineNumber}: Ticked rail task is missing Evidence:`);
        continue;
      }

      const tokenValidation = validateEvidenceToken(item.token, {
        ...options,
        allowNonZeroExit: item.isRedTask,
        requireRailTokens: item.isCoverageMutationTask,
      });

      for (const err of tokenValidation.errors) {
        errors.push(`Line ${item.lineNumber}: ${err}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
