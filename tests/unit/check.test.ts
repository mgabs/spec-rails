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

  it("flags early task completion when Gate 4 unticked", () => {
    const artifacts = [
      { id: "research", requires: [], status: "done" },
      { id: "tasks", requires: ["research"], status: "done" },
    ];
    const states = {
      research: "ticked" as const,
      tasks: "unticked" as const,
    };
    const violations = findGateViolations("test-change", artifacts, states, true);
    expect(violations).toContain("test-change: Gate 4 (tasks) unticked but implementation tasks are ticked");
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
        vi.mocked(execSync)
          .mockReturnValueOnce(Buffer.from("feat/test\n"))
          .mockReturnValueOnce(Buffer.from(JSON.stringify({ changes: ["old-change", "new-change"] })))
          .mockReturnValueOnce(Buffer.from(JSON.stringify({
            artifacts: [
              { id: "research", status: "done" },
              { id: "proposal", requires: ["research"], status: "done" },
            ],
          })))
          .mockReturnValueOnce(Buffer.from(JSON.stringify({
            artifacts: [
              { id: "research", status: "done" },
              { id: "proposal", requires: ["research"], status: "done" },
            ],
          })));
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
