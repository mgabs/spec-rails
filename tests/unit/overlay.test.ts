import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { planOverlay, loadPorts, scanOverlayCandidates, initProject, findAssetRoot, type Action, type Runner } from "../../src/commands/init.js";

const root = path.resolve(__dirname, "../..");
const pinned = fs.readFileSync(path.join(root, "openspec-version"), "utf-8").trim();
const vendor = path.join(root, "vendor/openspec", pinned);

function readTree(dir: string, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) Object.assign(out, readTree(path.join(dir, e.name), rel));
    else out[rel] = fs.readFileSync(path.join(dir, e.name), "utf-8");
  }
  return out;
}

const WORKFLOW_DIRS = ["explore", "propose", "apply-change", "archive-change", "sync-specs", "update-change"];
const UNPORTED_DIRS = ["new-change", "verify-change", "onboard"];
const LAYOUTS = [".agents", ".github", ".claude"];
const ports = loadPorts(root);
const bodyOf = (t: string) => t.replace(/^---\n[\s\S]*?\n---\n/, "");

function applyActions(files: Record<string, string>, actions: Action[]): Record<string, string> {
  const next = { ...files };
  for (const a of actions) if (a.content !== undefined) next[a.path] = a.content;
  return next;
}

describe("planOverlay (REQ-POS-7, REQ-POS-8)", () => {
  const upstream = readTree(vendor);

  it("loads the six ports keyed by workflow", () => {
    expect(Object.keys(ports).sort()).toEqual(["apply", "archive", "explore", "propose", "sync", "update"]);
  });

  it("overlays CLI-free bodies in all three layouts, keeping path and name (REQ-POS-7)", () => {
    const actions = planOverlay(upstream, ports);
    const out = applyActions(upstream, actions);
    for (const layout of LAYOUTS) {
      for (const wf of WORKFLOW_DIRS) {
        const file = `${layout}/skills/openspec-${wf}/SKILL.md`;
        expect(actions.some((a) => a.path === file && a.kind === "updated"), file).toBe(true);
        const before = upstream[file];
        const after = out[file];
        expect(after.match(/^name: .*$/m)?.[0]).toBe(before.match(/^name: .*$/m)?.[0]);
        expect(bodyOf(after)).not.toMatch(/\bopenspec [a-z]/);
        expect(after).not.toContain("Bash(openspec");
        expect(after).not.toContain("user-invocable: false");
        expect(after).not.toContain("Requires openspec CLI");
        expect(after).toContain("generatedBy");
      }
    }
  });

  it("leaves unported workflows untouched and logs them (REQ-POS-7)", () => {
    const actions = planOverlay(upstream, ports);
    for (const layout of LAYOUTS) {
      for (const wf of UNPORTED_DIRS) {
        const file = `${layout}/skills/openspec-${wf}/SKILL.md`;
        const a = actions.find((x) => x.path === file);
        expect(a).toMatchObject({ kind: "skipped", note: expect.stringContaining("still requires the openspec CLI") });
        expect(a?.content).toBeUndefined();
      }
    }
  });

  it("is idempotent (REQ-POS-7)", () => {
    const once = applyActions(upstream, planOverlay(upstream, ports));
    const again = planOverlay(once, ports);
    expect(again.filter((a) => a.kind === "updated")).toEqual([]);
    expect(applyActions(once, again)).toEqual(once);
  });

  it("restores CLI-free bodies after an openspec update regenerates them (REQ-POS-8)", () => {
    const once = applyActions(upstream, planOverlay(upstream, ports));
    const regenerated = { ...once };
    for (const layout of LAYOUTS) {
      const f = `${layout}/skills/openspec-explore/SKILL.md`;
      regenerated[f] = upstream[f];
    }
    const restored = applyActions(regenerated, planOverlay(regenerated, ports));
    expect(restored).toEqual(once);
  });

  it("overlays command and prompt layouts and ignores unrelated files (REQ-POS-7)", () => {
    const cmd = "---\nname: x\nuser-invocable: false\nallowed-tools: Bash(openspec:*)\n---\n\nrun `openspec list --json`\n";
    const files: Record<string, string> = {
      ".claude/commands/opsx/explore.md": cmd,
      ".github/prompts/opsx-apply.prompt.md": cmd,
      ".foo/commands/opsx-archive.md": "no frontmatter, run openspec list\n",
      ".foo/commands/opsx-onboard.md": cmd,
      ".foo/commands/explore.md": "my own explore command\n",
      ".foo/commands/explore2.md": "openspec explore alias but unknown name\n",
      ".agents/skills/spec-rails/SKILL.md": "---\nname: spec-rails\n---\nbody\n",
      ".agents/skills/odd/SKILL.md": "no frontmatter\n",
    };
    const actions = planOverlay(files, ports);
    const out = applyActions(files, actions);
    expect(out[".claude/commands/opsx/explore.md"]).toMatch(/^---\nname: x\n---\n\n/);
    expect(out[".claude/commands/opsx/explore.md"]).toContain(ports.explore.split("---\n").slice(2).join("---\n").trim().slice(0, 40));
    expect(out[".github/prompts/opsx-apply.prompt.md"]).not.toContain("user-invocable");
    expect(out[".foo/commands/opsx-archive.md"].startsWith("\n")).toBe(false);
    expect(out[".foo/commands/opsx-archive.md"]).not.toMatch(/\bopenspec [a-z]/);
    expect(out[".foo/commands/opsx-onboard.md"]).toBe(cmd);
    expect(out[".foo/commands/explore.md"]).toBe(files[".foo/commands/explore.md"]);
    expect(out[".foo/commands/explore2.md"]).toBe(files[".foo/commands/explore2.md"]);
    expect(actions.find((a) => a.path === ".foo/commands/opsx-onboard.md")?.note).toBeDefined();
    expect(actions.find((a) => a.path === ".agents/skills/spec-rails/SKILL.md")).toBeUndefined();
    expect(actions.find((a) => a.path === ".foo/commands/explore.md")).toBeUndefined();
  });

  it("works with a port lacking a trailing newline and skips missing ports", () => {
    const files = { ".agents/skills/openspec-explore/SKILL.md": "---\nname: openspec-explore\n---\nold\n", ".agents/skills/openspec-apply-change/SKILL.md": "---\nname: openspec-apply-change\n---\nold\n" };
    const out = applyActions(files, planOverlay(files, { explore: "---\nworkflow: explore\n---\nnew" }));
    expect(out[".agents/skills/openspec-explore/SKILL.md"]).toBe("---\nname: openspec-explore\n---\n\nnew\n");
    expect(out[".agents/skills/openspec-apply-change/SKILL.md"]).toBe(files[".agents/skills/openspec-apply-change/SKILL.md"]);
  });
});

describe("scanOverlayCandidates and initProject overlay (REQ-POS-7, REQ-POS-8, NFR-POS-1)", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-overlay-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const copyVendor: Runner = (_cmd, args, { cwd }) => {
    if (args[0] === "--version") return { status: 0, stdout: `${pinned}\n`, stderr: "" };
    fs.mkdirSync(path.join(cwd, "openspec"), { recursive: true });
    for (const [rel, content] of Object.entries(readTree(vendor))) {
      fs.mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
      fs.writeFileSync(path.join(cwd, rel), content);
    }
    return { status: 0, stdout: "", stderr: "" };
  };

  it("scans one level of dot-directories for skills, commands and prompts, ignoring symlinks", () => {
    const w = (rel: string) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), "x");
    };
    w(".a/skills/s/SKILL.md");
    w(".a/commands/o/c.md");
    w(".a/prompts/p.prompt.md");
    w(".a/prompts/other.txt");
    w(".a/deep/skills/s/SKILL.md");
    w(".git/skills/s/SKILL.md");
    w("plain/skills/s/SKILL.md");
    fs.writeFileSync(path.join(dir, ".afile"), "x");
    fs.symlinkSync(path.join(dir, ".a/commands/o/c.md"), path.join(dir, ".a/commands/link.md"));
    expect(Object.keys(scanOverlayCandidates(dir)).sort()).toEqual([".a/commands/o/c.md", ".a/prompts/p.prompt.md", ".a/skills/s/SKILL.md"]);
  });

  it("init bootstrap overlays three layouts; rerun without openspec changes nothing (REQ-POS-6, REQ-POS-7, NFR-POS-1)", () => {
    fs.writeFileSync(path.join(dir, "package.json"), "{}\n");
    const first = initProject({ cwd: dir, tools: "agents,github-copilot,claude", run: copyVendor });
    expect(first.actions.filter((a) => a.kind === "updated" && a.path.includes("openspec-")).length).toBe(18);
    expect(first.actions.filter((a) => a.note).length).toBe(9);
    const snap = readTree(dir);
    const missing: Runner = () => ({ status: null, stdout: "", stderr: "", error: new Error("ENOENT") });
    const second = initProject({ cwd: dir, run: missing });
    expect(readTree(dir)).toEqual(snap);
    expect(second.actions.filter((a) => a.kind !== "skipped")).toEqual([]);
    for (const [rel, content] of Object.entries(snap)) {
      if (/openspec-(explore|propose|apply-change|archive-change|sync-specs|update-change)\/SKILL\.md$/.test(rel)) {
        expect(bodyOf(content), rel).not.toMatch(/\bopenspec [a-z]/);
      }
    }
    expect(fs.readFileSync(path.join(dir, "package.json"), "utf-8")).toBe("{}\n");
  });

  it("init refuses to overlay through a symlinked skill directory path", () => {
    copyVendor("openspec", ["init"], { cwd: dir });
    const f = path.join(dir, ".agents/skills/openspec-explore");
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-out-"));
    try {
      fs.cpSync(f, outside, { recursive: true });
      fs.rmSync(f, { recursive: true });
      fs.symlinkSync(outside, f);
      initProject({ cwd: dir });
      expect(fs.readFileSync(path.join(outside, "SKILL.md"), "utf-8")).toMatch(/Bash\(openspec/);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("findAssetRoot resolves the repo that carries ports", () => {
    expect(fs.existsSync(path.join(findAssetRoot(), "skills/ports/explore.md"))).toBe(true);
  });
});
