import { describe, it, expect } from "vitest";
import { classifyChanges, evaluateAudit } from "../../src/commands/audit.js";

describe("Spec-to-code audit (audit.ts - REQ-OSA-43)", () => {
  it("exempts chore branches", () => {
    const res = evaluateAudit("chore/w5-12-review", ["src/index.ts"], []);
    expect(res.success).toBe(true);
    expect(res.isChoreExempt).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it("classifies code and spec changes accurately", () => {
    const files = [
      "src/commands/check.ts",
      "README.md",
      "docs/ROADMAP.md",
      "openspec/changes/w5-3-ts-cli/spec.md",
      "openspec/changes/archive/2026-11-06-w5-8-schema-fixes/spec.md",
      "docs/bug-reports/2026-11-06-fix.md",
    ];

    const classified = classifyChanges(files);
    expect(classified.codeChanges).toEqual(["src/commands/check.ts"]);
    expect(classified.specChanges).toContain("openspec/changes/w5-3-ts-cli/spec.md");
    expect(classified.specChanges).toContain("docs/bug-reports/2026-11-06-fix.md");
    // Archive changes do not count as active spec changes
    expect(classified.specChanges).not.toContain("openspec/changes/archive/2026-11-06-w5-8-schema-fixes/spec.md");
  });

  it("fails when code is modified without active spec change on feature branch", () => {
    const res = evaluateAudit("feat/w5-3-ts-cli", ["src/commands/check.ts"], []);
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("Code modified without an openspec/ change or docs/bug-reports/ entry");
  });

  it("passes when code is modified with active spec change", () => {
    const res = evaluateAudit(
      "feat/w5-3-ts-cli",
      ["src/commands/check.ts"],
      ["openspec/changes/w5-3-ts-cli/specs/openspec-addon/spec.md"]
    );
    expect(res.success).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it("passes when only docs or markdown are modified", () => {
    const res = evaluateAudit("feat/docs-update", [], []);
    expect(res.success).toBe(true);
    expect(res.errors.length).toBe(0);
  });
});
