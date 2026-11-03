import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { resolveCanonicalPath, validatePathSandbox } from "../../src/utils/paths.js";

describe("Path Sandboxing & Canonical Resolution", () => {
  let tempDir: string;
  let repoRoot: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec-rails-paths-test-"));
    repoRoot = path.join(tempDir, "my-repo");
    fs.mkdirSync(repoRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("resolves and approves regular files inside repository root", () => {
    const file = path.join(repoRoot, "src", "index.ts");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "export const x = 1;");

    const validated = validatePathSandbox(file, repoRoot);
    expect(validated).toBe(fs.realpathSync(file));
  });

  it("approves internal symlinks that resolve inside repo root", () => {
    const targetFile = path.join(repoRoot, "actual.txt");
    const linkFile = path.join(repoRoot, "link.txt");
    fs.writeFileSync(targetFile, "data");
    fs.symlinkSync(targetFile, linkFile);

    const validated = validatePathSandbox(linkFile, repoRoot);
    expect(validated).toBe(fs.realpathSync(targetFile));
  });

  it("resolves canonical path for files that do not exist yet but parent exists", () => {
    const parent = path.join(repoRoot, "new-dir");
    fs.mkdirSync(parent, { recursive: true });
    const futureFile = path.join(parent, "future.txt");

    const resolved = resolveCanonicalPath(futureFile);
    expect(resolved).toBe(path.join(fs.realpathSync(parent), "future.txt"));
  });

  it("throws when resolving canonical path for a completely non-existent directory tree", () => {
    const bogus = path.join(tempDir, "nonexistent", "deep", "file.txt");
    expect(() => resolveCanonicalPath(bogus)).toThrow();
  });

  it("permits whitelisted external store paths (such as pnpm store or worktrees)", () => {
    const externalStore = path.join(tempDir, "pnpm-store");
    fs.mkdirSync(externalStore, { recursive: true });
    const storedFile = path.join(externalStore, "package.json");
    fs.writeFileSync(storedFile, "{}");

    const linkFile = path.join(repoRoot, "node_modules", "pkg");
    fs.mkdirSync(path.dirname(linkFile), { recursive: true });
    fs.symlinkSync(externalStore, linkFile);

    const validated = validatePathSandbox(linkFile, repoRoot, [externalStore]);
    expect(validated).toBe(fs.realpathSync(externalStore));
  });

  it("approves when target path is exactly repoRoot", () => {
    const validated = validatePathSandbox(repoRoot, repoRoot);
    expect(validated).toBe(fs.realpathSync(repoRoot));
  });

  it("permits when target path is exactly externalStore prefix", () => {
    const externalStore = path.join(tempDir, "pnpm-store");
    fs.mkdirSync(externalStore, { recursive: true });

    const validated = validatePathSandbox(externalStore, repoRoot, [externalStore]);
    expect(validated).toBe(fs.realpathSync(externalStore));
  });

  it("blocks directory traversal when default allowlist is omitted", () => {
    const secretFile = path.join(tempDir, "secret.txt");
    fs.writeFileSync(secretFile, "confidential");
    const evilLink = path.join(repoRoot, "escape-no-allowlist");
    fs.symlinkSync(secretFile, evilLink);

    expect(() => validatePathSandbox(evilLink, repoRoot)).toThrow(/Path traversal escape detected/);
  });

  it("blocks traversal even when allowlist prefixes are provided if target does not match", () => {
    const secretFile = path.join(tempDir, "secret.txt");
    fs.writeFileSync(secretFile, "confidential");
    const otherStore = path.join(tempDir, "other-store");
    fs.mkdirSync(otherStore, { recursive: true });

    const evilLink = path.join(repoRoot, "escape");
    fs.symlinkSync(secretFile, evilLink);

    expect(() => validatePathSandbox(evilLink, repoRoot, [otherStore])).toThrow(/Path traversal escape detected/);
  });
});
