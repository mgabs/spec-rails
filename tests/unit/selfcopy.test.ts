import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// REQ-OSA-22: Self-Copy Sync
describe("Self-copy synchronization (REQ-OSA-22, NFR-OSA-6)", () => {
  const root = path.resolve(__dirname, "../..");

  function compareRecursive(srcDir: string, destDir: string): void {
    const srcEntries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of srcEntries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      expect(fs.existsSync(destPath), `Missing file in copy: ${destPath}`).toBe(true);

      if (entry.isDirectory()) {
        compareRecursive(srcPath, destPath);
      } else {
        const srcBuf = fs.readFileSync(srcPath);
        const destBuf = fs.readFileSync(destPath);
        expect(srcBuf.equals(destBuf), `File drift detected: ${srcPath} vs ${destPath}`).toBe(true);
      }
    }
  }

  const pairs: [string, string][] = [
    ["schemas/spec-rails", "openspec/schemas/spec-rails"],
    ["rules/AGENTS.md", "openspec/spec-rails/AGENTS.md"],
    ["rules/WORKFLOW.md", "openspec/spec-rails/WORKFLOW.md"],
    ["templates/bug-report.md", "openspec/spec-rails/bug-report.md"],
    ["skills/spec-rails/SKILL.md", ".agents/skills/spec-rails/SKILL.md"],
  ];

  for (const [src, dest] of pairs) {
    it(`keeps ${dest} byte-identical to ${src}`, () => {
      const srcPath = path.join(root, src);
      const destPath = path.join(root, dest);

      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.existsSync(destPath)).toBe(true);

      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        compareRecursive(srcPath, destPath);
      } else {
        const srcBuf = fs.readFileSync(srcPath);
        const destBuf = fs.readFileSync(destPath);
        expect(srcBuf.equals(destBuf), `File drift: ${src} vs ${dest}`).toBe(true);
      }
    });
  }
});
