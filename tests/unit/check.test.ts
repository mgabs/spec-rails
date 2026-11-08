import { describe, it, expect, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { parseGateState, parseArtifactState, findGateViolations, checkBranchAllowed, runCheck, BASELINE_FILE } from "../../src/commands/check.js";

vi.mock("node:child_process", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:child_process")>(),
  execSync: vi.fn(),
}));

describe("Gate parsing (check.ts - REQ-OSA-16, REQ-OSA-42)", () => {
  it("detects ticked gate box", () => {
    const content = `
# Title
## Review Gate
- [x] **Gate 1 Approval**: Approved
`;
    expect(parseGateState(content)).toEqual({
      state: "ticked",
      ticked: true,
      isNoGo: false,
    });
  });

  it("detects uppercase [X]", () => {
    const content = `
## Review Gate
- [X] **Gate 2 Approval**: Approved
`;
    expect(parseGateState(content).state).toBe("ticked");
  });

  it("detects unticked gate box", () => {
    const content = `
## Review Gate
- [ ] **Gate 0 Decision**: Pending
`;
    expect(parseGateState(content)).toEqual({
      state: "unticked",
      ticked: false,
      isNoGo: false,
    });
  });

  it("treats No-Go decision as unticked for progression", () => {
    const content = `
## Review Gate
- [x] **Gate 0 Decision**: No-Go
`;
    const res = parseGateState(content);
    expect(res.state).toBe("unticked");
    expect(res.isNoGo).toBe(true);
  });

  it("returns missing when no Review Gate section exists", () => {
    const content = `
# Just docs
- [x] Task
`;
    expect(parseGateState(content).state).toBe("missing");
  });

  it("ignores checkboxes in code fences", () => {
    const content = `
\`\`\`markdown
## Review Gate
- [x] Fenced
\`\`\`
## Review Gate
- [ ] Real gate
`;
    expect(parseGateState(content).state).toBe("unticked");
  });
});

describe("Branch protection (check.ts)", () => {
  it("rejects main and master branches", () => {
    expect(checkBranchAllowed("main")).toBe(false);
    expect(checkBranchAllowed("master")).toBe(false);
  });

  it("allows feature, fix, chore, and detached branches", () => {
    expect(checkBranchAllowed("feat/w5-3-ts-cli")).toBe(true);
    expect(checkBranchAllowed("chore/cleanup")).toBe(true);
    expect(checkBranchAllowed("fix/bug-123")).toBe(true);
    expect(checkBranchAllowed("")).toBe(true);
  });
});

describe("Transitive DAG violations (check.ts)", () => {
  it("flags unticked ancestor gate when downstream is done", () => {
    const artifacts = [
      { id: "research", requires: [], status: "done" },
      { id: "proposal", requires: ["research"], status: "done" },
      { id: "specs", requires: ["proposal"], status: "done" },
    ];
    const states = {
      research: "unticked" as const,
      proposal: "ticked" as const,
      specs: "ticked" as const,
    };
    const violations = findGateViolations("test-change", artifacts, states, false);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toContain("Gate 0 (research) unticked");
  });

  it("flags early task completion when Gate 3 unticked", () => {
    const artifacts = [
      { id: "research", requires: [], status: "done" },
      { id: "tasks", requires: ["research"], status: "done" },
    ];
    const states = {
      research: "ticked" as const,
      tasks: "unticked" as const,
    };
    const violations = findGateViolations("test-change", artifacts, states, true);
    expect(violations).toContain("test-change: Gate 3 (tasks) unticked but implementation tasks are ticked");
  });

  it("flags unticked Gate 2 (design) when downstream tasks exists", () => {
    const artifacts = [
      { id: "research", requires: [], status: "done" },
      { id: "proposal", requires: ["research"], status: "done" },
      { id: "specs", requires: ["proposal"], status: "done" },
      { id: "design", requires: ["specs"], status: "done" },
      { id: "tasks", requires: ["design"], status: "done" },
    ];
    const states = {
      research: "ticked" as const,
      proposal: "ticked" as const,
      specs: "ticked" as const,
      design: "unticked" as const,
      tasks: "unticked" as const,
    };
    const violations = findGateViolations("test-change", artifacts, states, false);
    expect(violations).toContain("test-change: Gate 2 (design) unticked but 'tasks' exists");
  });

  it("treats pure spec files without Review Gate as satisfied in parseArtifactState", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pure-spec-test-"));
    try {
      const specDir = path.join(tempDir, "specs", "sample");
      fs.mkdirSync(specDir, { recursive: true });
      fs.writeFileSync(path.join(specDir, "spec.md"), "# Spec Delta\n## ADDED Requirements\n### Requirement: REQ-1 Test\nThe system MUST work.\n");
      const state = parseArtifactState(tempDir, "specs");
      expect(state).toBe("ticked");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("Baseline loading (check.ts - REQ-OSA-47)", () => {
  it("returns empty set without file and parses names with file", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { loadBaseline, BASELINE_FILE } = await import("../../src/commands/check.js");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bl-"));
    expect(loadBaseline(dir).size).toBe(0);
    fs.mkdirSync(path.dirname(path.join(dir, BASELINE_FILE)), { recursive: true });
    fs.writeFileSync(path.join(dir, BASELINE_FILE), "# c\nold-change\n\n");
    expect([...loadBaseline(dir)]).toEqual(["old-change"]);
  });

  it("filters only baselined changes and still writes all offenders", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-baseline-test-"));
    try {
      for (const name of ["old-change", "new-change"]) {
        const changeDir = path.join(dir, "openspec/changes", name);
        fs.mkdirSync(changeDir, { recursive: true });
        fs.writeFileSync(path.join(changeDir, "research.md"), "## Review Gate\n- [ ] Pending\n");
      }
      const baselinePath = path.join(dir, BASELINE_FILE);
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
      fs.writeFileSync(baselinePath, "old-change\n");

      const mockCommands = () => {
        vi.mocked(execSync).mockImplementation((cmd: string) => {
          if (cmd.includes("git branch")) return Buffer.from("feat/test\n");
          if (cmd.includes("openspec list")) return Buffer.from(JSON.stringify({ changes: ["old-change", "new-change"] }));
          if (cmd.includes("openspec status")) {
            return Buffer.from(JSON.stringify({
              artifacts: [
                { id: "research", status: "done" },
                { id: "proposal", requires: ["research"], status: "done" },
              ],
            }));
          }
          if (cmd.includes("openspec validate")) return Buffer.from("");
          return Buffer.from("");
        });
      };

      mockCommands();
      const result = runCheck({ cwd: dir });
      expect(result.success).toBe(false);
      expect(result.violations).toEqual([
        "new-change: Gate 0 (research) unticked but 'proposal' exists",
      ]);

      mockCommands();
      expect(runCheck({ cwd: dir, writeBaseline: true }).success).toBe(true);
      expect(fs.readFileSync(baselinePath, "utf-8")).toContain("new-change\nold-change\n");
    } finally {
      vi.mocked(execSync).mockReset();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("Artifact hygiene and requirement key checks (check.ts - REQ-OSA-49)", () => {
  it("detects missing trailing newline and trailing whitespace", async () => {
    const { checkArtifactHygiene } = await import("../../src/commands/check.js");
    const noEof = "# Title";
    const violations1 = checkArtifactHygiene("test.md", noEof);
    expect(violations1).toContainEqual({
      file: "test.md",
      message: "Missing trailing newline at EOF",
    });

    const trailingWs = "# Title  \nSecond line\t \nClean line\n";
    const violations2 = checkArtifactHygiene("test.md", trailingWs);
    expect(violations2).toContainEqual({
      file: "test.md",
      line: 1,
      message: "Trailing whitespace on line 1",
    });
    expect(violations2).toContainEqual({
      file: "test.md",
      line: 2,
      message: "Trailing whitespace on line 2",
    });

    const clean = "# Clean\nValid line\n";
    expect(checkArtifactHygiene("clean.md", clean)).toEqual([]);
  });

  it("validates REQ-* and NFR-* keys in delta requirements", async () => {
    const { checkRequirementKeys } = await import("../../src/commands/check.js");
    const invalidSpec = `
# Spec Delta
## ADDED Requirements
### Requirement: Unkeyed title
The system MUST do something.
### Requirement: REQ-VALID-1 Proper Keyed
The system MUST do something.
### Invalid Header Format
`;
    const errors = checkRequirementKeys("specs/test/spec.md", invalidSpec);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Invalid requirement header");
    expect(errors[0]).toContain("Unkeyed title");

    const validSpec = `
# Spec Delta
## ADDED Requirements
### Requirement: REQ-FOO-1 First
### Requirement: NFR-BAR-2 Second
## MODIFIED Requirements
### Requirement: REQ-FOO-3 Third
`;
    expect(checkRequirementKeys("specs/test/spec.md", validSpec)).toEqual([]);
  });

  it("flags unticked Gate 3 when code changes exist under audit", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gate3-audit-test-"));
    try {
      const changeDir = path.join(dir, "openspec/changes", "feat-test");
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, "tasks.md"), "## Review Gate\n- [ ] Pending\n");

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("git branch")) return Buffer.from("feat/my-feature\n");
        if (cmd.includes("diff")) return Buffer.from("src/index.ts\n");
        if (cmd.includes("openspec list")) return Buffer.from(JSON.stringify({ changes: ["feat-test"] }));
        if (cmd.includes("openspec status")) {
          return Buffer.from(JSON.stringify({
            changeRoot: path.join(dir, "openspec/changes/feat-test"),
            artifacts: [
              { id: "research", status: "done" },
              { id: "proposal", status: "done" },
              { id: "specs", status: "done" },
              { id: "design", status: "done" },
              { id: "tasks", status: "done" },
            ],
          }));
        }
        if (cmd.includes("openspec validate")) return Buffer.from("");
        return Buffer.from("");
      });

      const result = runCheck({ cwd: dir, audit: true });
      expect(result.success).toBe(false);
      expect(result.violations.some((v) => v.includes("Gate 3 (tasks) unticked but code changes exist"))).toBe(true);
    } finally {
      vi.mocked(execSync).mockReset();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs openspec validate --strict and flags validation errors", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "strict-validate-test-"));
    try {
      const changeDir = path.join(dir, "openspec/changes", "bad-change");
      fs.mkdirSync(changeDir, { recursive: true });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("git branch")) return Buffer.from("feat/my-feature\n");
        if (cmd.includes("openspec list")) return Buffer.from(JSON.stringify({ changes: ["bad-change"] }));
        if (cmd.includes("openspec status")) return Buffer.from(JSON.stringify({ artifacts: [] }));
        if (cmd.includes("openspec validate")) throw new Error("Validation failed: missing required section");
        return Buffer.from("");
      });

      const result = runCheck({ cwd: dir });
      expect(result.success).toBe(false);
      expect(result.violations.some((v) => v.includes("openspec validate bad-change --strict' failed"))).toBe(true);
    } finally {
      vi.mocked(execSync).mockReset();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
