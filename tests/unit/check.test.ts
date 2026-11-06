import { describe, it, expect } from "vitest";
import { parseGateState, parseArtifactState, findGateViolations, checkBranchAllowed } from "../../src/commands/check";

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
