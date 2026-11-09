import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  parseScore,
  isDocsOnlyChange,
  runRail,
  runVerify,
  type CommandRunner,
} from "../../src/commands/verify.js";
import { parseBaseline, findGateViolations } from "../../src/commands/check.js";

// REQ-OSA-47: strict rails execution
describe("REQ-OSA-47 strict rails", () => {
  it("parses last percentage", () => {
    expect(parseScore("a 10%\nscore 97.5%")).toBe(97.5);
    expect(parseScore("none")).toBeNull();
  });

  it("detects docs-only changesets", () => {
    expect(isDocsOnlyChange(["README.md", "openspec/x/spec.md", "docs/a.png"])).toBe(true);
    expect(isDocsOnlyChange(["README.md", "src/a.ts"])).toBe(false);
  });

  it("fails on non-zero exit with output", () => {
    const exec: CommandRunner = () => ({ status: 2, output: "boom" });
    const errs = runRail({ name: "test", command: "x", required: true }, ".", exec);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("exit 2");
    expect(errs[0]).toContain("boom");
  });

  it("fails on empty required command, ignores empty optional", () => {
    const exec: CommandRunner = () => ({ status: 0, output: "" });
    expect(runRail({ name: "test", command: " ", required: true }, ".", exec)).toHaveLength(1);
    expect(runRail({ name: "mutation", command: undefined, required: false }, ".", exec)).toEqual([]);
  });

  it("fails below threshold, passes at threshold", () => {
    const low: CommandRunner = () => ({ status: 0, output: "score 90%" });
    const ok: CommandRunner = () => ({ status: 0, output: "score 95%" });
    const spec = { name: "mutation", command: "m", minScore: 95, required: false };
    expect(runRail(spec, ".", low)[0]).toContain("below threshold 95%");
    expect(runRail(spec, ".", ok)).toEqual([]);
  });

  it("skips mutation and empty-tests error when docs-only", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rails-"));
    fs.writeFileSync(
      path.join(dir, "spec-rails.config.json"),
      JSON.stringify({ testCommand: "t", mutationCommand: "m" })
    );
    const ran: string[] = [];
    const exec: CommandRunner = (c) => {
      ran.push(c);
      return { status: 0, output: "" };
    };
    const res = runVerify({ cwd: dir, runCommands: true, exec, changedFiles: ["README.md"] });
    expect(ran).toEqual(["t"]);
    expect(res.success).toBe(true);

    ran.length = 0;
    const res2 = runVerify({ cwd: dir, runCommands: true, exec, changedFiles: ["src/a.ts"] });
    expect(ran).toEqual(["t", "m"]);
    expect(res2.success).toBe(false);
  });
});

// REQ-OSA-48: baseline
describe("REQ-OSA-48 baseline", () => {
  it("parses baseline ignoring comments/blank", () => {
    expect([...parseBaseline("# c\n\nfoo\n bar \n")]).toEqual(["foo", "bar"]);
  });

  it("violations exist for missing gate (so baseline matters)", () => {
    const v = findGateViolations(
      "c",
      [{ id: "proposal", status: "done" }, { id: "specs", requires: ["proposal"], status: "done" }],
      { proposal: "missing", specs: "ticked" },
      false
    );
    expect(v.length).toBeGreaterThan(0);
  });
});

// REQ-OSA-49 / REQ-OSA-50: template and docs
describe("REQ-OSA-49 CI template", () => {
  const ci = fs.readFileSync(path.join(__dirname, "../../templates/spec-rails-ci.yml"), "utf-8");
  it("is an inert skeleton with no spec-rails or make test step (REQ-OSA-49, REQ-OSA-55)", () => {
    expect(ci).not.toMatch(/spec-rails (check|verify)/);
    expect(ci).not.toContain("make test");
    expect(ci).toContain("# - name: Unit tests");
    expect(ci).toContain("# - name: Coverage");
    expect(ci).toContain("# - name: Mutation testing");
  });
});

describe("REQ-OSA-50 docs", () => {
  const doc = fs.readFileSync(
    path.join(__dirname, "../../docs/how-tos/05-configure-ai-agents.md"),
    "utf-8"
  );
  it("documents both names and commit guidance", () => {
    expect(doc).toContain("/opsx-");
    expect(doc).toContain("openspec-");
    expect(doc).toContain("Commit `.claude/`");
  });
});
