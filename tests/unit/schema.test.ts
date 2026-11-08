import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// REQ-OSA-1, REQ-OSA-2, REQ-OSA-3, REQ-OSA-4, REQ-OSA-5, REQ-OSA-6, REQ-OSA-41
describe("OpenSpec spec-rails schema and templates (REQ-OSA-1..6, REQ-OSA-41)", () => {
  const schemaPath = path.resolve(__dirname, "../../schemas/spec-rails/schema.yaml");
  const schemaDir = path.dirname(schemaPath);
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  it("defines spec-rails as schema name (REQ-OSA-1)", () => {
    expect(schemaContent).toMatch(/^name:\s*spec-rails/m);
  });

  it("enforces artifact dependency DAG (REQ-OSA-2, REQ-OSA-3)", () => {
    // Expected order and dependencies:
    // research: []
    // proposal: [research]
    // specs: [proposal]
    // design: [specs]
    // tasks: [design]
    const lines = schemaContent.split("\n");
    let currentId = "";
    const deps: Record<string, string[]> = {};
    let inRequires = false;

    for (const line of lines) {
      const idMatch = line.match(/^\s\s-\sid:\s*([a-z0-9_-]+)/);
      if (idMatch) {
        currentId = idMatch[1];
        deps[currentId] = [];
        inRequires = false;
        continue;
      }
      if (/^\s\s\s\srequires:\s*\[\]/.test(line)) {
        inRequires = false;
        continue;
      }
      if (/^\s\s\s\srequires:/.test(line)) {
        inRequires = true;
        continue;
      }
      if (inRequires && line.startsWith("      - ")) {
        deps[currentId].push(line.replace("      - ", "").trim());
        continue;
      }
      if (/^[a-z]/.test(line) || /^\s\s[a-z]/.test(line)) {
        inRequires = false;
      }
    }

    expect(deps["research"]).toEqual([]);
    expect(deps["proposal"]).toEqual(["research"]);
    expect(deps["specs"]).toEqual(["proposal"]);
    expect(deps["design"]).toEqual(["specs"]);
    expect(deps["tasks"]).toEqual(["design"]);
  });

  it("declares exact artifact generates outputs", () => {
    const generates = Array.from(schemaContent.matchAll(/^\s\s\s\sgenerates:\s*([^\n]+)/gm)).map((m) =>
      m[1].replace(/"/g, "").trim()
    );
    expect(generates).toEqual([
      "research.md",
      "proposal.md",
      "specs/**/*.md",
      "design.md",
      "tasks.md",
    ]);
  });

  it("enforces apply requirements and tracks (REQ-OSA-6)", () => {
    const applyMatch = schemaContent.match(/apply:\s*\n\s\srequires:\s*\[tasks\]\s*\n\s\stracks:\s*tasks\.md/);
    expect(applyMatch).not.toBeNull();
  });

  it("enforces slice loop order: contract scaffolding -> red -> green -> coverage -> mutation (REQ-OSA-6)", () => {
    const applyIdx = schemaContent.indexOf("apply:");
    expect(applyIdx).toBeGreaterThan(0);
    const applySection = schemaContent.slice(applyIdx);
    const matches = Array.from(applySection.matchAll(/contract scaffolding|red|green|coverage|mutation/gi)).map((m) =>
      m[0].toLowerCase()
    );
    const unique = [...new Set(matches)];
    expect(unique).toEqual(["contract scaffolding", "red", "green", "coverage", "mutation"]);
  });

  it("contains mandatory instruction keywords (REQ-OSA-5)", () => {
    const checks = [
      { id: "research", term: "Tradeoff Matrix" },
      { id: "research", term: "Breaking Changes" },
      { id: "proposal", term: "Out-of-Scope (YAGNI)" },
      { id: "design", term: "Pure Core vs. I/O Shell" },
    ];

    for (const { id, term } of checks) {
      const regex = new RegExp(`-\\s*id:\\s*${id}[\\s\\S]*?instruction:\\s*\\|[\\s\\S]*?(?=-\\s*id:|apply:|$)`);
      const block = schemaContent.match(regex);
      expect(block, `missing instruction block for ${id}`).not.toBeNull();
      expect(block![0]).toContain(term);
    }
  });

  it("ensures templates exist, have unticked gate boxes, and end with the gate box (REQ-OSA-4)", () => {
    const templates = ["research", "proposal", "design", "tasks"];
    for (const name of templates) {
      const tplPath = path.join(schemaDir, "templates", `${name}.md`);
      expect(fs.existsSync(tplPath)).toBe(true);
      const content = fs.readFileSync(tplPath, "utf-8").trim();

      const untickedBoxes = content.match(/^- \[ \] \*\*Gate [0-4] /gm);
      expect(untickedBoxes?.length, `${name}.md must have one unticked gate box`).toBe(1);

      const tickedBoxes = content.match(/^- \[[xX]\]/gm);
      expect(tickedBoxes, `${name}.md must not have any ticked boxes`).toBeNull();

      const lastLine = content.split("\n").filter(Boolean).pop();
      expect(lastLine).toMatch(/^- \[ \] \*\*Gate [0-4] /);
    }
  });

  it("spec.md template has no Review Gate footer and has GIVEN steps (REQ-OSA-4, REQ-OSA-41)", () => {
    const specTplPath = path.join(schemaDir, "templates/spec.md");
    const content = fs.readFileSync(specTplPath, "utf-8");
    expect(content.includes("## Review Gate")).toBe(false);

    const givenMatches = content.match(/^- \*\*GIVEN\*\*/gm);
    expect(givenMatches?.length).toBe(2);
  });

  it("tasks.md template has no self-matching Evidence: literal", () => {
    const tasksTplPath = path.join(schemaDir, "templates/tasks.md");
    const content = fs.readFileSync(tasksTplPath, "utf-8");
    expect(content.includes("Evidence:")).toBe(false);
  });
});
