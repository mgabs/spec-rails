import { describe, it, expect, vi } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { createCli, runCli } from "../../src/cli.js";
import pkg from "../../package.json" with { type: "json" };

describe("CLI Binary Integration & Unit (REQ-OSA-32)", () => {
  const cliPath = path.resolve("dist/cli.js");

  function withDir<T>(fn: (dir: string) => T): T {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-"));
    fs.mkdirSync(path.join(dir, "openspec"));
    try {
      return fn(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  it("registers only init (REQ-OSA-32)", () => {
    const cli = createCli();
    expect(cli.commands.map((c) => c.name)).toEqual(["init"]);
    expect(cli.commands[0].options.map((o) => o.name).sort()).toEqual(["tools"]);
  });

  it("init logs one line per change and a TODO reminder, then reports up to date (REQ-OSA-13, REQ-OSA-58)", () =>
    withDir((dir) => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        createCli().parse(["node", "spec-rails", "init", dir]);
        expect(logSpy).toHaveBeenCalledWith("[spec-rails] created openspec/spec-rails/WORKFLOW.md");
        expect(logSpy).toHaveBeenCalledWith("[spec-rails] created openspec/spec-rails/TODO.md");
        expect(logSpy).toHaveBeenCalledWith("[spec-rails] next: complete openspec/spec-rails/TODO.md to set up your quality gates");
        logSpy.mockClear();
        createCli().parse(["node", "spec-rails", "init", dir]);
        expect(logSpy.mock.calls).toEqual([["[spec-rails] already up to date"]]);
      } finally {
        logSpy.mockRestore();
      }
    }));

  it("rejects unknown commands and removed flags", () => {
    expect(() => createCli().parse(["node", "spec-rails", "check"])).toThrow(/Unknown command: check/);
    for (const cmd of ["verify", "audit", "config"]) {
      expect(() => createCli().parse(["node", "spec-rails", cmd])).toThrow(/Unknown command/);
    }
    withDir((dir) => {
      expect(() => createCli().parse(["node", "spec-rails", "init", dir, "--stack=ts"])).toThrow(/Unknown option/);
      expect(() => createCli().parse(["node", "spec-rails", "init", dir, "--force"])).toThrow(/Unknown option/);
    });
  });

  it("init defaults to the current directory", () =>
    withDir((dir) => {
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(dir);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        createCli().parse(["node", "spec-rails", "init"]);
        expect(fs.existsSync(path.join(dir, "openspec/spec-rails/WORKFLOW.md"))).toBe(true);
      } finally {
        cwdSpy.mockRestore();
        logSpy.mockRestore();
      }
    }));

  it("runCli reports errors with exit(1)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null): never => {
      throw new Error(`exit:${code}`);
    });
    try {
      expect(() => runCli(["node", "spec-rails", "init", "/definitely/missing/dir"])).toThrow("exit:1");
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("[spec-rails error]"));
    } finally {
      errSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("runCli runs init with provided argv", () =>
    withDir((dir) => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        runCli(["node", "spec-rails", "init", dir]);
        expect(logSpy).toHaveBeenCalled();
      } finally {
        logSpy.mockRestore();
      }
    }));

  it("prints version on --version in subprocess bundle", () => {
    const out = execFileSync(process.execPath, [cliPath, "--version"], { encoding: "utf-8" });
    expect(out).toContain(pkg.version);
  });

  it("--help lists only init in the bundle (REQ-OSA-32)", () => {
    const out = execFileSync(process.execPath, [cliPath, "--help"], { encoding: "utf-8" });
    expect(out).toContain("Usage:");
    expect(out).toContain("init [dir]");
    const initHelp = execFileSync(process.execPath, [cliPath, "init", "--help"], { encoding: "utf-8" });
    expect(initHelp).toContain("--tools");
    expect(initHelp).not.toMatch(/--stack|--force/);
    expect(out).not.toMatch(/\b(check|verify|audit)\b|--stack|--force/);
  });

  it("bundle exits non-zero for removed commands", () => {
    const r = spawnSync(process.execPath, [cliPath, "verify"], { encoding: "utf-8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("Unknown command");
  });

  it("bundle runs init on an existing openspec repo without openspec on PATH (NFR-OSA-1)", () =>
    withDir((dir) => {
      const r = spawnSync(process.execPath, [cliPath, "init", dir], { encoding: "utf-8", env: { PATH: path.dirname(process.execPath) } });
      expect(r.status).toBe(0);
      expect(fs.existsSync(path.join(dir, "openspec/schemas/spec-rails/schema.yaml"))).toBe(true);
    }));
});
