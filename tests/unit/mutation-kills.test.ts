import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  initProject,
  defaultRunner,
  planInit,
  planOverlay,
  loadPorts,
  scanOverlayCandidates,
  bootstrapOpenspec,
  findAssetRoot,
  type Runner,
  type Assets,
} from "../../src/commands/init.js";
import { createCli } from "../../src/cli.js";
import pkg from "../../package.json" with { type: "json" };

const root = path.resolve(__dirname, "../..");
const ports = loadPorts(root);
const assets: Assets = { managed: {}, todo: "T", ci: "C", makefile: "M" };

let dir: string;
const p = (...s: string[]) => path.join(dir, ...s);
const w = (rel: string, content = "x") => {
  fs.mkdirSync(path.dirname(p(rel)), { recursive: true });
  fs.writeFileSync(p(rel), content);
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-kill-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("cli surface", () => {
  const capture = (fn: () => void): string => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      fn();
      return spy.mock.calls.map((c) => c.join(" ")).join("\n");
    } finally {
      spy.mockRestore();
    }
  };

  it("help and version describe the one command", () => {
    const help = capture(() => createCli().outputHelp());
    expect(help).toContain("spec-rails/");
    expect(help).toContain("Initialize Spec-Rails in the target repository");
    const initHelp = capture(() => createCli().parse(["node", "spec-rails", "init", "--help"]));
    expect(initHelp).toContain("--tools <list>");
    expect(initHelp).toContain("Comma-separated tools forwarded to `openspec init --tools`");
    expect(initHelp).toContain("(default: agents)");
    expect(help).toContain("-h, --help");
    expect(help).toContain("-v, --version");
    expect(capture(() => createCli().outputVersion())).toContain(`spec-rails/${pkg.version}`);
  });

  it("unknown commands list every argument", () => {
    expect(() => createCli().parse(["node", "spec-rails", "foo", "bar"])).toThrow("Unknown command: foo bar. Only 'init' is available.");
  });

  it("init prints notes and only claims up to date when nothing changed", () => {
    w("openspec/config.yaml", "schema: spec-rails\n");
    w(".claude/commands/opsx/onboard.md", "---\nname: x\n---\nopenspec\n");
    const line = "[spec-rails] skipped .claude/commands/opsx/onboard.md (still requires the openspec CLI (no port))";
    const first = capture(() => createCli().parse(["node", "spec-rails", "init", dir]));
    expect(first).toContain(line);
    expect(first).not.toContain("already up to date");
    const second = capture(() => createCli().parse(["node", "spec-rails", "init", dir]));
    expect(second.split("\n")).toEqual([line, "[spec-rails] already up to date"]);
  });
});

describe("findAssetRoot", () => {
  it("prefers the dev root even when the dist root also carries schemas, and ignores a bare dist root", () => {
    fs.mkdirSync(p("a/schemas/spec-rails"), { recursive: true });
    fs.mkdirSync(p("a/x/schemas/spec-rails"), { recursive: true });
    fs.mkdirSync(p("a/x/y"), { recursive: true });
    expect(findAssetRoot(p("a/x/y"))).toBe(p("a"));
    fs.mkdirSync(p("b/x/y"), { recursive: true });
    expect(findAssetRoot(p("b/x/y"))).toBe(p("b"));
  });
});

describe("generated docs and planInit edge cases", () => {
  it("keeps a spec-rails schema line with trailing spaces and whitespace-only .gitignore", () => {
    const plan = planInit({ files: { "openspec/config.yaml": "schema: spec-rails  \nx: 1\n", ".gitignore": "  \n" }, legacy: [] }, assets);
    expect(plan.writes["openspec/config.yaml"]).toBeUndefined();
    expect(plan.writes[".gitignore"]).toBe(".worktrees/\n");
  });

  it("reports skipped for kept owned files and a current CI workflow", () => {
    const plan = planInit({ files: { "openspec/spec-rails/TODO.md": "mine", ".github/workflows/spec-rails-ci.yml": "run: npm test\n" }, legacy: [] }, assets);
    expect(plan.writes["openspec/spec-rails/TODO.md"]).toBeUndefined();
    expect(plan.writes[".github/workflows/spec-rails-ci.yml"]).toBeUndefined();
    expect(plan.actions).toContainEqual({ kind: "skipped", path: "openspec/spec-rails/TODO.md" });
    expect(plan.actions).toContainEqual({ kind: "skipped", path: ".github/workflows/spec-rails-ci.yml" });
  });
});

describe("overlay planning and scanning", () => {
  const stale = "---\nname: x\nuser-invocable: false\n---\n\nrun `openspec list`\n";
  const bodyOf = (t: string) => t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^\s+/, "").replace(/\s*$/, "\n");

  it("loadPorts keeps only markdown files whose frontmatter names a workflow", () => {
    w("skills/ports/a.md", "---\nworkflow: alpha\n---\nbody\n");
    w("skills/ports/nofield.md", "---\nother: 1\n---\nbody\n");
    w("skills/ports/plain.md", "no frontmatter\n");
    w("skills/ports/EXCLUDED.md", "---\nworkflow: excluded\n---\nbody\n");
    w("skills/ports/b.txt", "---\nworkflow: text\n---\nbody\n");
    expect(Object.keys(loadPorts(dir))).toEqual(["alpha"]);
  });

  it("overlays opsx directory files without the word openspec and plain aliases that mention it", () => {
    const files = {
      ".x/commands/opsx/explore.md": "plain text\n",
      ".y/commands/explore.md": "uses openspec\n",
      ".y/commands/apply.md": "plain text\n",
    };
    const byPath = Object.fromEntries(planOverlay(files, ports).map((a) => [a.path, a]));
    expect(byPath[".x/commands/opsx/explore.md"].kind).toBe("updated");
    expect(byPath[".y/commands/explore.md"].kind).toBe("updated");
    expect(byPath[".y/commands/apply.md"]).toBeUndefined();
  });

  it("keeps frontmatterless files clean, trims leading port whitespace and orders by path", () => {
    const files = { ".z/commands/opsx-explore.md": "no frontmatter\n", ".a/commands/opsx-archive.md": "no frontmatter\n" };
    const actions = planOverlay(files, { explore: "---\nworkflow: explore\n---\n\n\n  new\n", archive: ports.archive });
    expect(actions.map((a) => a.path)).toEqual([".a/commands/opsx-archive.md", ".z/commands/opsx-explore.md"]);
    expect(actions[0].content).toBe(bodyOf(ports.archive));
    expect(actions[1].content).toBe("new\n");
    const framed = planOverlay({ ".z/commands/opsx-explore.md": stale }, { explore: "---\nworkflow: explore\n---\n\n\nnew\n" });
    expect(framed[0].content).toBe("---\nname: x\n---\n\nnew\n");
  });

  it("scan skips worktree and stryker dirs and does not recurse into prompts", () => {
    w(".worktrees/skills/s/SKILL.md");
    w(".stryker-tmp/skills/s/SKILL.md");
    w(".a/prompts/sub/deep.prompt.md");
    w(".a/prompts/top.prompt.md");
    expect(Object.keys(scanOverlayCandidates(dir))).toEqual([".a/prompts/top.prompt.md"]);
  });
});

describe("runner and bootstrap", () => {
  const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });

  it("defaultRunner passes stderr through and normalizes missing output", () => {
    expect(defaultRunner(process.execPath, ["-e", "process.stderr.write('e')"], { cwd: dir })).toMatchObject({ status: 0, stdout: "", stderr: "e" });
    expect(defaultRunner("spec-rails-no-such-binary", [], { cwd: dir })).toMatchObject({ stdout: "", stderr: "" });
  });

  it("probes in the target directory and treats failure by error or status", () => {
    const cwds: string[] = [];
    const run: Runner = (_c, args, o) => {
      if (args[0] === "--version") cwds.push(o.cwd);
      return ok("1.16.0\n");
    };
    bootstrapOpenspec({ cwd: dir, tools: "agents", run: (c, a, o) => (fs.mkdirSync(p("openspec"), { recursive: true }), run(c, a, o)), pinned: "1.16.0" });
    expect(cwds).toEqual([dir]);
    for (const res of [{ status: 0, stdout: "1.16.0", stderr: "", error: new Error("x") }, { status: 1, stdout: "1.16.0", stderr: "" }]) {
      fs.rmSync(p("openspec"), { recursive: true, force: true });
      expect(() => bootstrapOpenspec({ cwd: dir, tools: "agents", run: () => res, pinned: "1.16.0" })).toThrow(/not found on PATH/);
    }
  });

  it("compares trimmed major.minor and reports trimmed values", () => {
    expect(() => bootstrapOpenspec({ cwd: dir, tools: "agents", run: () => ok("11.6.0"), pinned: "1.16.0" })).toThrow(/requires/);
    expect(() => bootstrapOpenspec({ cwd: dir, tools: "agents", run: () => ok("1.15.2\n"), pinned: "1.16.0" })).toThrow("openspec 1.15.2 found on PATH but spec-rails requires 1.16.0 (same major.minor).");
    const run: Runner = (_c, a) => (a[0] === "--version" ? ok("1.16.0") : { status: 1, stdout: "", stderr: "boom\n" });
    expect(() => bootstrapOpenspec({ cwd: dir, tools: "agents", run, pinned: " 1.16.0\n" })).toThrow("'openspec init' failed: boom");
  });
});

describe("initProject integration", () => {
  it("writes nested managed assets and is idempotent", () => {
    w("openspec/config.yaml", "schema: spec-rails\n");
    initProject({ cwd: dir });
    const nested = fs.readdirSync(path.join(root, "schemas/spec-rails/templates"))[0];
    expect(fs.existsSync(p("openspec/schemas/spec-rails/templates", nested))).toBe(true);
    expect(initProject({ cwd: dir }).actions.filter((a) => a.kind !== "skipped")).toEqual([]);
  });

  it("does not resurrect overlay candidates inside removed legacy skill dirs", () => {
    w("openspec/config.yaml", "schema: spec-rails\n");
    w(".github/skills/opsx-explore/SKILL.md", "---\nname: openspec-explore\n---\nopenspec list\n");
    w(".github/skills/opsx-explore-extra/SKILL.md", "---\nname: openspec-explore\n---\nopenspec list\n");
    w(".agents/skills/openspec-explore/SKILL.md", "---\nname: openspec-explore\n---\nopenspec list\n");
    initProject({ cwd: dir });
    expect(fs.existsSync(p(".github/skills/opsx-explore"))).toBe(false);
    expect(fs.existsSync(p(".github/skills/opsx-explore-extra"))).toBe(false);
    expect(fs.readFileSync(p(".agents/skills/openspec-explore/SKILL.md"), "utf-8")).not.toContain("openspec list");
  });

  it("refuses to overlay through a symlinked commands dir but ignores symlinked unported files", () => {
    w("openspec/config.yaml", "schema: spec-rails\n");
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-kill-out-"));
    try {
      fs.writeFileSync(path.join(outside, "opsx-onboard.md"), "---\nname: x\n---\nopenspec\n");
      fs.mkdirSync(p(".claude"));
      fs.symlinkSync(outside, p(".claude/commands"));
      expect(() => initProject({ cwd: dir })).not.toThrow();
      fs.writeFileSync(path.join(outside, "opsx-explore.md"), "---\nname: x\n---\nopenspec list\n");
      expect(() => initProject({ cwd: dir })).toThrow(/symlink/);
      expect(fs.readFileSync(path.join(outside, "opsx-explore.md"), "utf-8")).toContain("openspec list");
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
