import { describe, it, expect } from "vitest";
import {
  parseEvidenceToken,
  parseTasksEvidence,
  validateEvidenceToken,
  validateTasksEvidence,
} from "../../src/utils/evidence.js";

describe("parseEvidenceToken", () => {
  it("parses full structured evidence token with percentages", () => {
    const line = "Evidence: [CMD: npm test] [EXIT: 0] [COVERAGE: 96%] [MUTATION: 95.5%]";
    const parsed = parseEvidenceToken(line);
    expect(parsed).toEqual({
      raw: "[CMD: npm test] [EXIT: 0] [COVERAGE: 96%] [MUTATION: 95.5%]",
      cmd: "npm test",
      exit: 0,
      coverage: 96,
      mutation: 95.5,
    });
  });

  it("parses unknown tokens without setting known fields and trims values", () => {
    const line = "Evidence: [CMD:   npm test   ] [UNKNOWN: foo]";
    const parsed = parseEvidenceToken(line);
    expect(parsed?.cmd).toBe("npm test");
    expect(parsed?.exit).toBeUndefined();
    expect(parsed?.coverage).toBeUndefined();
    expect(parsed?.mutation).toBeUndefined();
  });

  it("parses token without percentage signs", () => {
    const line = "Evidence: [CMD: pytest] [EXIT: 0] [COVERAGE: 100] [MUTATION: 98]";
    const parsed = parseEvidenceToken(line);
    expect(parsed).toEqual({
      raw: "[CMD: pytest] [EXIT: 0] [COVERAGE: 100] [MUTATION: 98]",
      cmd: "pytest",
      exit: 0,
      coverage: 100,
      mutation: 98,
    });
  });

  it("parses partial token with CMD and EXIT only", () => {
    const line = "Evidence: [CMD: go test ./...] [EXIT: 0]";
    const parsed = parseEvidenceToken(line);
    expect(parsed).toEqual({
      raw: "[CMD: go test ./...] [EXIT: 0]",
      cmd: "go test ./...",
      exit: 0,
    });
  });

  it("returns null when no Evidence marker exists", () => {
    const line = "Just a regular task description without evidence marker";
    expect(parseEvidenceToken(line)).toBeNull();
  });

  it("handles unstructured Evidence line", () => {
    const line = "Evidence: vitest run -> 3 passed";
    const parsed = parseEvidenceToken(line);
    expect(parsed).toEqual({
      raw: "vitest run -> 3 passed",
    });
  });
});

describe("validateEvidenceToken", () => {
  it("passes when exit is 0 and coverage/mutation meet 95% threshold", () => {
    const token = {
      raw: "[CMD: cargo test] [EXIT: 0] [COVERAGE: 95%] [MUTATION: 95%]",
      cmd: "cargo test",
      exit: 0,
      coverage: 95,
      mutation: 95,
    };
    const res = validateEvidenceToken(token, { minCoverage: 95, minMutation: 95 });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("fails when exit is non-zero and non-zero exit is not allowed", () => {
    const token = {
      raw: "[CMD: npm test] [EXIT: 1]",
      cmd: "npm test",
      exit: 1,
    };
    const res = validateEvidenceToken(token);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain("Command exited with non-zero code: 1");
  });

  it("allows non-zero exit when allowNonZeroExit is true (e.g. Red tests)", () => {
    const token = {
      raw: "[CMD: npm test] [EXIT: 1]",
      cmd: "npm test",
      exit: 1,
    };
    const res = validateEvidenceToken(token, { allowNonZeroExit: true });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("fails when coverage is below threshold", () => {
    const token = {
      raw: "[CMD: npm test] [EXIT: 0] [COVERAGE: 94%]",
      exit: 0,
      coverage: 94,
    };
    const res = validateEvidenceToken(token, { minCoverage: 95 });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toBe("Coverage 94% is below required 95%");
  });

  it("fails when mutation score is below threshold", () => {
    const token = {
      raw: "[CMD: npx stryker run] [EXIT: 0] [MUTATION: 91%]",
      exit: 0,
      mutation: 91,
    };
    const res = validateEvidenceToken(token, { minMutation: 95 });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toBe("Mutation score 91% is below required 95%");
  });

  it("fails in strict mode when required rail tokens are missing", () => {
    // Both missing
    const resBoth = validateEvidenceToken({ raw: "pass" }, { strict: true, requireRailTokens: true });
    expect(resBoth.valid).toBe(false);
    expect(resBoth.errors).toContain("Missing structured [CMD: ...] or [EXIT: 0] token in strict mode");

    // CMD present, EXIT missing
    const resNoExit = validateEvidenceToken({ raw: "pass", cmd: "test" }, { strict: true, requireRailTokens: true });
    expect(resNoExit.valid).toBe(false);
    expect(resNoExit.errors).toContain("Missing structured [CMD: ...] or [EXIT: 0] token in strict mode");

    // EXIT present, CMD missing
    const resNoCmd = validateEvidenceToken({ raw: "pass", exit: 0 }, { strict: true, requireRailTokens: true });
    expect(resNoCmd.valid).toBe(false);
    expect(resNoCmd.errors).toContain("Missing structured [CMD: ...] or [EXIT: 0] token in strict mode");
  });

  it("verifies exact boundary condition for coverage and mutation scores", () => {
    // Exact threshold 95 passes
    const resExact = validateEvidenceToken(
      { raw: "test", coverage: 95, mutation: 95 },
      { minCoverage: 95, minMutation: 95 }
    );
    expect(resExact.valid).toBe(true);

    // 1 below threshold fails
    const resBelow = validateEvidenceToken(
      { raw: "test", coverage: 94.9, mutation: 94.9 },
      { minCoverage: 95, minMutation: 95 }
    );
    expect(resBelow.valid).toBe(false);

    // Custom thresholds work
    const resCustom = validateEvidenceToken(
      { raw: "test", coverage: 90, mutation: 90 },
      { minCoverage: 90, minMutation: 90 }
    );
    expect(resCustom.valid).toBe(true);
  });

  it("passes in non-strict mode when required rail tokens are missing", () => {
    const token = {
      raw: "vitest run -> passed",
    };
    const res = validateEvidenceToken(token, { strict: false, requireRailTokens: true });
    expect(res.valid).toBe(true);
  });
});

describe("validateTasksEvidence", () => {
  it("returns empty array for empty tasks content", () => {
    expect(parseTasksEvidence("")).toEqual([]);
  });

  it("validates compliant tasks.md with structured evidence", () => {
    const tasksMd = `
# Tasks
- [x] 1.1 Red test Evidence: [CMD: npm test] [EXIT: 1]
- [x] 1.2 Green implementation Evidence: [CMD: npm test] [EXIT: 0]
- [x] 1.3 Coverage & mutation Evidence: [CMD: npm run test:coverage] [EXIT: 0] [COVERAGE: 96%] [MUTATION: 95%]
- [x] 1.4 Non-rail task approval sign-off
`;
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("ignores lines inside markdown code fences and non-bulleted lines even if indented", () => {
    const tasksMd = `
Regular paragraph mentioning - [x] 1.0 Green fake task in paragraph without evidence
   \`\`\`markdown
   - [x] 1.1 Green fake task in fence without evidence
   \`\`\`
   ~~~markdown
   - [x] 1.2 Red fake task in fence without evidence
   ~~~
- [x] 1.3 Green implementation Evidence: [CMD: npm test] [EXIT: 0]
`;
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(true);
  });

  it("fails with exact line number when a ticked rail task is missing Evidence", () => {
    const tasksMd = "Line 1\n- [x] 1.1 Green implementation without evidence\n";
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toBe("Line 2: Ticked rail task is missing Evidence:");
  });

  it("fails with exact line number when Evidence raw content is empty", () => {
    const tasksMd = "Line 1\n- [x] 1.1 Green implementation Evidence: \n";
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toBe("Line 2: Ticked rail task is missing Evidence:");
  });

  it("fails with exact line number when evidence has placeholder <command and result>", () => {
    const tasksMd = "Line 1\nLine 2\n- [x] 1.1 Green implementation Evidence: <command and result>\n";
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toBe("Line 3: Evidence has unresolved placeholder <command and result>");
  });

  it("accepts free-text evidence notes on rail tasks in strict mode", () => {
    const tasksMd = `
# Tasks
- [x] 1.1 Red test Evidence: vitest run failed with 1 error as expected
- [x] 1.2 Green implementation Evidence: vitest run passed with 12 tests
- [x] 1.3 Coverage & mutation Evidence: coverage 96% and mutation kill 95%
`;
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it("reports failed token validation errors formatted with line numbers", () => {
    const tasksMd = "- [x] 1.1 Green implementation Evidence: [CMD: npm test] [EXIT: 2]\n";
    const res = validateTasksEvidence(tasksMd, { strict: true });
    expect(res.valid).toBe(false);
    expect(res.errors[0]).toBe("Line 1: Command exited with non-zero code: 2");
  });
});
