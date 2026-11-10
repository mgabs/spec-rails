import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  initProject,
  defaultRunner,
  planInit,
  planOverlay,
  bootstrapOpenspec,
  removeHookBlock,
  modernizePreCommitConfig,
  isStaleWorkflow,
  generatePreCommitConfig,
  findAssetRoot,
  readPinnedVersion,
  type Runner,
  type RunResult,
  type Snapshot,
  type Assets,
} from "../../src/commands/init.js";

const agenticFiles = fs.readdirSync(path.join(findAssetRoot(), "docs/agentic-how-tos"));

const ok = (stdout = ""): RunResult => ({ status: 0, stdout, stderr: "" });

function fakeRunner(version = "1.16.0", opts: { missing?: boolean; initFails?: boolean } = {}) {
  const calls: string[][] = [];
  const run: Runner = (cmd, args, { cwd }) => {
    calls.push([cmd, ...args]);
    if (opts.missing) return { status: null, stdout: "", stderr: "", error: new Error("ENOENT") };
    if (args[0] === "--version") return ok(`${version}\n`);
    if (opts.initFails) return { status: 2, stdout: "", stderr: "boom" };
    fs.mkdirSync(path.join(cwd, "openspec"), { recursive: true });
    fs.writeFileSync(path.join(cwd, "openspec/config.yaml"), "schema: spec-driven\ncontext: keep me\n");
    return ok();
  };
  return { run, calls };
}

function tree(dir: string, base = dir): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) Object.assign(out, tree(full, base));
    else out[path.relative(base, full)] = fs.readFileSync(full, "utf-8");
  }
  return out;
}

describe("init", () => {
  let dir: string;
  const p = (...s: string[]) => path.join(dir, ...s);
  const read = (rel: string) => fs.readFileSync(p(rel), "utf-8");

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-init-test-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe("bootstrap through local openspec (REQ-POS-6)", () => {
    it("runs openspec init with the tool list and sets the schema (REQ-POS-6, REQ-OSA-11, REQ-OSA-12)", () => {
      const { run, calls } = fakeRunner();
      const res = initProject({ cwd: dir, tools: "agents,github-copilot", run });
      expect(calls).toEqual([
        ["openspec", "--version"],
        ["openspec", "init", "--tools", "agents,github-copilot", "--no-copilot-cloud", "--no-animation"],
      ]);
      expect(read("openspec/config.yaml")).toBe("schema: spec-rails\ncontext: keep me\n");
      expect(res.actions[0]).toEqual({ kind: "created", path: "openspec" });
      for (const f of [
        "openspec/schemas/spec-rails/schema.yaml",
        "openspec/spec-rails/WORKFLOW.md",
        "openspec/spec-rails/AGENTS.md",
        ".agents/skills/spec-rails/SKILL.md",
        "docs/spec-rails/GUIDE.md",
        "docs/spec-rails/COMMANDS.md",
        "docs/spec-rails/RAILS.md",
        ...agenticFiles.map((f) => `docs/agentic-how-tos/${f}`),
        ".pre-commit-config.yaml",
        ".github/workflows/spec-rails-ci.yml",
        "openspec/spec-rails/TODO.md",
        "Makefile",
        ".gitignore",
      ]) {
        expect(fs.existsSync(p(f)), f).toBe(true);
      }
    });

    it("defaults the tool list to agents", () => {
      const { run, calls } = fakeRunner();
      initProject({ cwd: dir, run });
      expect(calls[1]).toContain("agents");
    });

    it("rejects an absent CLI and writes nothing (REQ-POS-6, REQ-OSA-11)", () => {
      const { run } = fakeRunner("1.16.0", { missing: true });
      expect(() => initProject({ cwd: dir, run })).toThrow(new RegExp(`${readPinnedVersion().replace(/\./g, "\\.")}.*not found`));
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it("rejects a major.minor mismatch and accepts a patch difference (REQ-POS-6)", () => {
      expect(() => initProject({ cwd: dir, run: fakeRunner("1.17.0").run })).toThrow(/requires 1\.16\.0/);
      expect(() => initProject({ cwd: dir, run: fakeRunner("2.16.0").run })).toThrow(/requires/);
      expect(fs.readdirSync(dir)).toEqual([]);
      expect(() => initProject({ cwd: dir, run: fakeRunner("1.16.9").run })).not.toThrow();
    });

    it("aborts when openspec init fails and with a garbled version (REQ-POS-6)", () => {
      expect(() => initProject({ cwd: dir, run: fakeRunner("1.16.0", { initFails: true }).run })).toThrow(/failed: boom/);
      expect(() => initProject({ cwd: dir, run: fakeRunner("garbage").run })).toThrow(/requires/);
      const noStderr: Runner = (_c, a) => (a[0] === "--version" ? ok("1.16.0") : { status: 1, stdout: "", stderr: "" });
      expect(() => initProject({ cwd: dir, run: noStderr })).toThrow(/failed\.$/);
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it("rejects tool lists that could inject flags (REQ-POS-6)", () => {
      const { run, calls } = fakeRunner();
      for (const bad of ["--force", "", "a b", "a;b"]) {
        expect(() => bootstrapOpenspec({ cwd: dir, tools: bad, run, pinned: "1.16.0" })).toThrow(/Invalid --tools/);
      }
      expect(calls).toEqual([]);
    });

    it("skips when openspec/ exists and never runs openspec (REQ-POS-6, NFR-OSA-1)", () => {
      fs.mkdirSync(p("openspec"));
      const { run, calls } = fakeRunner("1.16.0", { missing: true });
      initProject({ cwd: dir, run });
      expect(calls).toEqual([]);
      expect(bootstrapOpenspec({ cwd: dir, tools: "agents", run })).toEqual([{ kind: "skipped", path: "openspec" }]);
      expect(calls.flat()).not.toContain("update");
    });

    it("uses the shipped pin and the real process runner by default (REQ-POS-1, REQ-POS-6)", () => {
      const real = defaultRunner(process.execPath, ["-e", "process.stdout.write('hi'); process.exit(3)"], { cwd: dir });
      expect(real).toMatchObject({ status: 3, stdout: "hi", stderr: "" });
      expect(defaultRunner("spec-rails-no-such-binary", [], { cwd: dir }).error).toBeDefined();
      const { run } = fakeRunner("1.16.4");
      expect(bootstrapOpenspec({ cwd: dir, tools: "agents", run })).toEqual([{ kind: "created", path: "openspec" }]);
    });

    it("reads the pin from openspec-version", () => {
      expect(readPinnedVersion()).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("target validation (REQ-OSA-11)", () => {
    it("fails and writes nothing when the target does not exist", () => {
      expect(() => initProject({ cwd: p("missing"), run: fakeRunner().run })).toThrow(/does not exist/);
      expect(fs.existsSync(p("missing"))).toBe(false);
    });

    it("fails when the target is a file", () => {
      fs.writeFileSync(p("f"), "x");
      expect(() => initProject({ cwd: p("f"), run: fakeRunner().run })).toThrow(/does not exist/);
    });

    it.skipIf(process.getuid?.() === 0)("fails when the target is not writable", () => {
      fs.mkdirSync(p("openspec"));
      fs.chmodSync(dir, 0o500);
      try {
        expect(() => initProject({ cwd: dir, run: fakeRunner().run })).toThrow(/not writable/);
      } finally {
        fs.chmodSync(dir, 0o700);
      }
    });

    it("defaults to process.cwd() semantics when no cwd is given", () => {
      fs.mkdirSync(p("openspec"));
      const spy = vi.spyOn(process, "cwd").mockReturnValue(dir);
      try {
        initProject();
      } finally {
        spy.mockRestore();
      }
      expect(fs.existsSync(p("docs/spec-rails/GUIDE.md"))).toBe(true);
    });
  });

  describe("idempotence and ownership (REQ-OSA-13, REQ-OSA-14)", () => {
    it("second run is byte-identical and reports only skipped actions without --force (REQ-OSA-13)", () => {
      fs.writeFileSync(p("package.json"), '{"name":"x"}\n');
      initProject({ cwd: dir, run: fakeRunner().run });
      const first = tree(dir);
      const second = initProject({ cwd: dir, run: fakeRunner("9.9.9", { missing: true }).run });
      expect(tree(dir)).toEqual(first);
      for (const f of agenticFiles) expect(first[`docs/agentic-how-tos/${f}`], f).toBe(fs.readFileSync(path.join(findAssetRoot(), "docs/agentic-how-tos", f), "utf-8"));
      expect(second.actions.every((a) => a.kind === "skipped")).toBe(true);
      expect(read("package.json")).toBe('{"name":"x"}\n');
    });

    it("refreshes drifted managed files (REQ-OSA-13)", () => {
      fs.mkdirSync(p("openspec"));
      initProject({ cwd: dir });
      fs.writeFileSync(p("docs/spec-rails/GUIDE.md"), "drift");
      const res = initProject({ cwd: dir });
      expect(res.actions).toContainEqual({ kind: "updated", path: "docs/spec-rails/GUIDE.md" });
      expect(read("docs/spec-rails/GUIDE.md")).toContain("Spec-Rails Workflow Guide");
    });

    it("removes legacy artifacts without migrating them (REQ-OSA-13, REQ-OSA-32)", () => {
      fs.mkdirSync(p("openspec/spec-rails/mutation"), { recursive: true });
      fs.mkdirSync(p(".github/skills/opsx-apply"), { recursive: true });
      fs.mkdirSync(p(".github/skills/keep-me"), { recursive: true });
      fs.mkdirSync(p("docs/spec-rails"), { recursive: true });
      for (const f of [
        "spec-rails.config.json",
        "rails.conf",
        "mutmut.ini",
        "openspec/spec-rails/rails.conf",
        "openspec/spec-rails/spec-rails-check",
        "openspec/spec-rails/spec-rails-verify",
        "openspec/spec-rails/mutation/mutmut.ini",
        ".github/skills/opsx-apply/SKILL.md",
        "docs/spec-rails/WORKFLOW.md",
      ]) {
        fs.writeFileSync(p(f), "x");
      }
      const res = initProject({ cwd: dir });
      for (const f of ["spec-rails.config.json", "rails.conf", "mutmut.ini", "openspec/spec-rails/rails.conf", "openspec/spec-rails/spec-rails-check", "openspec/spec-rails/spec-rails-verify", "openspec/spec-rails/mutation", ".github/skills/opsx-apply", "docs/spec-rails/WORKFLOW.md"]) {
        expect(fs.existsSync(p(f)), f).toBe(false);
        expect(res.actions).toContainEqual({ kind: "removed", path: f });
      }
      expect(fs.existsSync(p(".github/skills/keep-me"))).toBe(true);
      expect(fs.existsSync(p("spec-rails.config.json"))).toBe(false);
    });

    it("preserves developer-edited pre-commit, CI, TODO and config keys (REQ-OSA-14)", () => {
      fs.mkdirSync(p("openspec/spec-rails"), { recursive: true });
      fs.mkdirSync(p(".github/workflows"), { recursive: true });
      const pre = "repos:\n  - repo: local\n    hooks:\n      - id: ruff\n        entry: uv run ruff check\n";
      const ci = "name: mine\njobs:\n  t:\n    steps:\n      - run: pytest\n";
      fs.writeFileSync(p(".pre-commit-config.yaml"), pre);
      fs.writeFileSync(p(".github/workflows/spec-rails-ci.yml"), ci);
      fs.writeFileSync(p("openspec/spec-rails/TODO.md"), "mine");
      fs.writeFileSync(p("Makefile"), "mymake");
      fs.writeFileSync(p("openspec/config.yaml"), "schema: spec-driven\ncontext: c\nrules:\n  a: b\n");
      initProject({ cwd: dir });
      expect(read(".pre-commit-config.yaml")).toBe(pre);
      expect(read(".github/workflows/spec-rails-ci.yml")).toBe(ci);
      expect(read("openspec/spec-rails/TODO.md")).toBe("mine");
      expect(read("Makefile")).toBe("mymake");
      expect(read("openspec/config.yaml")).toBe("schema: spec-rails\ncontext: c\nrules:\n  a: b\n");
    });

    it("replaces a CI workflow that calls spec-rails or openspec (REQ-OSA-49)", () => {
      fs.mkdirSync(p("openspec"));
      fs.mkdirSync(p(".github/workflows"), { recursive: true });
      fs.writeFileSync(p(".github/workflows/spec-rails-ci.yml"), "run: npx --no-install spec-rails check --audit\n");
      const res = initProject({ cwd: dir });
      expect(res.actions).toContainEqual({ kind: "updated", path: ".github/workflows/spec-rails-ci.yml" });
      expect(isStaleWorkflow(read(".github/workflows/spec-rails-ci.yml"))).toBe(false);
    });

    it("generates hooks and CI without spec-rails or openspec commands (NFR-POS-1, REQ-OSA-46)", () => {
      fs.mkdirSync(p("openspec"));
      initProject({ cwd: dir });
      for (const f of [".pre-commit-config.yaml", ".github/workflows/spec-rails-ci.yml"]) {
        expect(read(f)).not.toMatch(/\b(spec-rails|openspec)\s+(check|verify|audit|init|update)\b/);
        expect(read(f)).not.toContain("check-lgtm");
      }
      expect(read(".pre-commit-config.yaml")).toContain("id: branch-protection");
      expect(read(".pre-commit-config.yaml")).toContain("entry: make lint");
      expect(read(".pre-commit-config.yaml")).toContain("entry: make test");
    });

    it("surgically removes legacy hooks and keeps the rest (REQ-OSA-46)", () => {
      fs.mkdirSync(p("openspec"));
      fs.writeFileSync(
        p(".pre-commit-config.yaml"),
        "repos:\n  - repo: local\n    hooks:\n      - id: check-lgtm-directives\n        entry: x\n\n      - id: spec-rails-check\n        entry: e\n\n      - id: detekt\n        entry: ./gradlew detekt\n        language: system\n"
      );
      const res = initProject({ cwd: dir });
      expect(read(".pre-commit-config.yaml")).toBe("repos:\n  - repo: local\n    hooks:\n\n      - id: detekt\n        entry: ./gradlew detekt\n        language: system\n");
      expect(res.actions).toContainEqual({ kind: "updated", path: ".pre-commit-config.yaml" });
    });

    it("sets schema and appends .worktrees/ once without disturbing content", () => {
      fs.mkdirSync(p("openspec"));
      fs.writeFileSync(p("openspec/config.yaml"), "context: hello");
      fs.writeFileSync(p(".gitignore"), "node_modules\n");
      initProject({ cwd: dir });
      expect(read("openspec/config.yaml")).toBe("schema: spec-rails\ncontext: hello\n");
      expect(read(".gitignore")).toBe("node_modules\n\n.worktrees/\n");
      fs.writeFileSync(p("openspec/config.yaml"), "context: hello\n");
      initProject({ cwd: dir });
      expect(read("openspec/config.yaml")).toBe("schema: spec-rails\ncontext: hello\n");
      fs.rmSync(p("openspec/config.yaml"));
      fs.rmSync(p(".gitignore"));
      initProject({ cwd: dir });
      expect(read("openspec/config.yaml")).toBe("schema: spec-rails\n");
      expect(read(".gitignore")).toBe(".worktrees/\n");
    });

    it("removes .git/hooks/pre-commit.legacy (REQ-OSA-46)", () => {
      fs.mkdirSync(p("openspec"));
      fs.mkdirSync(p(".git/hooks"), { recursive: true });
      fs.writeFileSync(p(".git/hooks/pre-commit.legacy"), "# old");
      initProject({ cwd: dir });
      expect(fs.existsSync(p(".git/hooks/pre-commit.legacy"))).toBe(false);
    });
  });

  describe("symlink refusal (REQ-OSA-32)", () => {
    it("refuses to write through a symlinked ancestor or file and writes nothing", () => {
      fs.mkdirSync(p("openspec"));
      const outside = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-outside-"));
      try {
        fs.symlinkSync(outside, p("docs"));
        expect(() => initProject({ cwd: dir })).toThrow(/symlink: docs/);
        expect(fs.readdirSync(outside)).toEqual([]);
        expect(fs.existsSync(p(".pre-commit-config.yaml"))).toBe(false);
        fs.rmSync(p("docs"));
        fs.writeFileSync(path.join(outside, "ci"), "x");
        fs.mkdirSync(p("openspec/spec-rails"), { recursive: true });
        fs.symlinkSync(path.join(outside, "ci"), p("openspec/spec-rails/WORKFLOW.md"));
        expect(() => initProject({ cwd: dir })).toThrow(/symlink: openspec\/spec-rails\/WORKFLOW\.md/);
        expect(fs.readFileSync(path.join(outside, "ci"), "utf-8")).toBe("x");
      } finally {
        fs.rmSync(outside, { recursive: true, force: true });
      }
    });
  });

  describe("pure helpers", () => {
    it("planOverlay returns no actions for no files", () => {
      expect(planOverlay({}, {})).toEqual([]);
    });

    it("planInit is pure and reports skipped for converged input", () => {
      const assets: Assets = { managed: { "a.md": "A" }, todo: "T", ci: "C", makefile: "M" };
      const snap: Snapshot = { files: {}, legacy: ["mutmut.ini"] };
      const plan = planInit(snap, assets);
      expect(plan.removals).toEqual(["mutmut.ini"]);
      expect(plan.writes["a.md"]).toBe("A");
      expect(plan.writes["openspec/spec-rails/TODO.md"]).toBe("T");
      const again = planInit({ files: { ...plan.writes }, legacy: [] }, assets);
      expect(again.writes).toEqual({});
      expect(again.actions.every((a) => a.kind === "skipped")).toBe(true);
    });

    it("removeHookBlock preserves sibling keys and blank lines (REQ-OSA-46)", () => {
      const yaml = "repos:\n  - repo: local\n    hooks:\n      - id: a\n        entry: >-\n          folded a\n        language: system\n\n      - id: spec-rails-check\n        entry: >-\n          npx --no-install spec-rails check\n        language: system\n        pass_filenames: false\n\n      - id: b\n        entry: b\n        language: system\n        pass_filenames: false\n";
      expect(removeHookBlock(yaml, "spec-rails-check")).toBe("repos:\n  - repo: local\n    hooks:\n      - id: a\n        entry: >-\n          folded a\n        language: system\n\n      - id: b\n        entry: b\n        language: system\n        pass_filenames: false\n");
      expect(removeHookBlock(yaml, "missing")).toBe(yaml);
      expect(removeHookBlock("- id: x\n  entry: y", "x")).toBe("");
      expect(removeHookBlock("a\n- id: x\n  entry: y\n- id: z", "x")).toBe("a\n- id: z");
      expect(removeHookBlock("a\n\n- id: x\n  entry: y", "x")).toBe("a");
      expect(removeHookBlock("- id: x\n  entry: y\n\n- id: z", "x")).toBe("\n- id: z");
    });

    it("modernizePreCommitConfig removes only legacy hooks", () => {
      const yaml = "repos:\n  - repo: local\n    hooks:\n      - id: spec-rails-check\n        entry: e\n\n      - id: keep\n        entry: k\n";
      expect(modernizePreCommitConfig(yaml)).toBe("repos:\n  - repo: local\n    hooks:\n\n      - id: keep\n        entry: k\n");
      expect(modernizePreCommitConfig(generatePreCommitConfig())).toBe(generatePreCommitConfig());
    });

    it("generatePreCommitConfig only hooks make targets that exist", () => {
      expect(generatePreCommitConfig()).toMatch(/entry: make lint[\s\S]*entry: make test/);
      const onlyTest = generatePreCommitConfig("test:\n\techo\n");
      expect(onlyTest).toContain("entry: make test");
      expect(onlyTest).not.toContain("make lint");
      expect(generatePreCommitConfig("build:\n")).not.toContain("make ");
      expect(generatePreCommitConfig("lint:\n")).toContain("entry: make lint");
    });

    it("isStaleWorkflow detects spec-rails and openspec invocations only", () => {
      expect(isStaleWorkflow("run: sh openspec/spec-rails/spec-rails-verify")).toBe(true);
      expect(isStaleWorkflow("run: npx --no-install spec-rails check --audit")).toBe(true);
      expect(isStaleWorkflow("run: node dist/cli.js verify")).toBe(true);
      expect(isStaleWorkflow("run: openspec validate x")).toBe(true);
      expect(isStaleWorkflow("see openspec/spec-rails/TODO.md\nrun: npm test")).toBe(false);
    });

    it("findAssetRoot prefers the dev root, falls back to dist root", () => {
      const dev = p("a");
      const cur = path.join(dev, "x/y");
      fs.mkdirSync(path.join(dev, "schemas/spec-rails"), { recursive: true });
      fs.mkdirSync(cur, { recursive: true });
      expect(findAssetRoot(cur)).toBe(dev);
      const dist = p("b/dist");
      fs.mkdirSync(p("b/schemas/spec-rails"), { recursive: true });
      fs.mkdirSync(dist);
      expect(findAssetRoot(dist)).toBe(p("b"));
      expect(findAssetRoot(p("nowhere/x"))).toBe(path.resolve(p("nowhere/x"), "../.."));
    });
  });

  describe("quality-gate scaffolding and cleanup", () => {
    it("REQ-OSA-55: generated hooks and CI have inert stack-free content", () => {
      fs.mkdirSync(p("openspec"));
      initProject({ cwd: dir });
      const ci = read(".github/workflows/spec-rails-ci.yml");
      expect(isStaleWorkflow(ci)).toBe(false);
      expect(ci).toContain("# - name: Unit tests");
      expect(ci).toContain("# - name: Coverage");
      expect(ci).toContain("# - name: Mutation testing");
      expect(read(".pre-commit-config.yaml")).not.toMatch(/entry:.*(spec-rails|openspec)/);
    });

    it("REQ-OSA-56: TODO.md is created once, mentions coverage and mutation, and is preserved", () => {
      fs.mkdirSync(p("openspec"));
      initProject({ cwd: dir });
      expect(read("openspec/spec-rails/TODO.md")).toMatch(/coverage/i);
      expect(read("openspec/spec-rails/TODO.md")).toMatch(/mutation/i);
      expect(read("openspec/spec-rails/TODO.md")).toContain("Makefile");
      fs.writeFileSync(p("openspec/spec-rails/TODO.md"), "mine");
      initProject({ cwd: dir });
      expect(read("openspec/spec-rails/TODO.md")).toBe("mine");
    });

    it("REQ-OSA-57: removes every legacy artifact, replaces the stale workflow, then converges", () => {
      fs.mkdirSync(p("openspec/spec-rails/mutation"), { recursive: true });
      fs.mkdirSync(p(".github/workflows"), { recursive: true });
      fs.mkdirSync(p(".github/skills/opsx-apply"), { recursive: true });
      fs.mkdirSync(p("docs/spec-rails"), { recursive: true });
      for (const f of ["mutmut.ini", "rails.conf", "spec-rails.config.json", "openspec/spec-rails/rails.conf", "openspec/spec-rails/spec-rails-check", "openspec/spec-rails/spec-rails-verify", "openspec/spec-rails/mutation/mutmut.ini", "docs/spec-rails/WORKFLOW.md"]) {
        fs.writeFileSync(p(f), "x");
      }
      fs.writeFileSync(p(".github/workflows/spec-rails-ci.yml"), "run: sh openspec/spec-rails/spec-rails-verify\n");
      fs.writeFileSync(p(".pre-commit-config.yaml"), "repos:\n  - repo: local\n    hooks:\n      - id: spec-rails-verify\n        entry: v\n\n      - id: keep\n        entry: k\n");
      initProject({ cwd: dir });
      for (const f of ["mutmut.ini", "rails.conf", "spec-rails.config.json", "openspec/spec-rails/rails.conf", "openspec/spec-rails/spec-rails-check", "openspec/spec-rails/spec-rails-verify", "openspec/spec-rails/mutation", "docs/spec-rails/WORKFLOW.md", ".github/skills/opsx-apply"]) {
        expect(fs.existsSync(p(f)), f).toBe(false);
      }
      expect(read(".github/workflows/spec-rails-ci.yml")).not.toContain("spec-rails-verify");
      expect(read(".pre-commit-config.yaml")).not.toContain("spec-rails-verify");
      expect(read(".pre-commit-config.yaml")).toContain("id: keep");
      const before = tree(dir);
      initProject({ cwd: dir });
      expect(tree(dir)).toEqual(before);
      for (const f of ["rules/WORKFLOW.md", "openspec/spec-rails/WORKFLOW.md"]) {
        expect(fs.readFileSync(path.join(findAssetRoot(), f), "utf-8")).not.toMatch(/rails\.conf|\bchecks\b|mutmut/i);
      }
    });

    it("REQ-OSA-29: WORKFLOW.md is installed and AGENTS.md references it", () => {
      fs.mkdirSync(p("openspec"));
      initProject({ cwd: dir });
      expect(fs.existsSync(p("openspec/spec-rails/WORKFLOW.md"))).toBe(true);
      expect(read("openspec/spec-rails/AGENTS.md")).toContain("openspec/spec-rails/WORKFLOW.md");
    });

    it("REQ-OSA-15: rules and skill live outside openspec-update generated files", () => {
      fs.mkdirSync(p("openspec"));
      initProject({ cwd: dir });
      expect(fs.existsSync(p("openspec/spec-rails/WORKFLOW.md"))).toBe(true);
      expect(fs.existsSync(p(".agents/skills/spec-rails/SKILL.md"))).toBe(true);
      expect(read(".agents/skills/spec-rails/SKILL.md")).toMatch(/^name:\s*spec-rails\s*$/m);
    });

    it("NFR-OSA-2: init on an empty project completes within 5 s", () => {
      fs.mkdirSync(p("openspec"));
      const t = Date.now();
      initProject({ cwd: dir });
      expect(Date.now() - t).toBeLessThan(5000);
    });
  });
});
