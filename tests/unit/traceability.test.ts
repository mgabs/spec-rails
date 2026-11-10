import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// Replaces the removed `check` command: every living-spec requirement must be named by a test.
describe("spec-to-test traceability", () => {
  const root = path.join(__dirname, "../..");
  const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), "utf-8");
  const ID = /\b(?:REQ|NFR)-[A-Z]+-\d+\b/g;

  it("every REQ/NFR id in openspec/specs appears in tests/unit", () => {
    const specs = fs.readdirSync(path.join(root, "openspec/specs")).map((d) => read("openspec/specs", d, "spec.md"));
    const ids = new Set(specs.flatMap((s) => [...s.matchAll(/^### Requirement: ((?:REQ|NFR)-[A-Z]+-\d+)\b/gm)].map((m) => m[1])));
    const tests = fs.readdirSync(path.join(__dirname)).filter((f) => f.endsWith(".ts") && f !== "traceability.test.ts");
    const traced = new Set(tests.flatMap((f) => [...read("tests/unit", f).matchAll(ID)].map((m) => m[0])));
    expect(ids.size).toBeGreaterThan(0);
    expect([...ids].filter((id) => !traced.has(id)).sort()).toEqual([]);
  });
});
