import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import fg from "fast-glob";

// REQ-OSA-23, REQ-OSA-24, REQ-OSA-30, REQ-OSA-40, NFR-OSA-5, NFR-OSA-7
describe("Repository hygiene and documentation linting (REQ-OSA-23, REQ-OSA-24, REQ-OSA-30, NFR-OSA-5, NFR-OSA-7)", () => {
  const root = path.resolve(__dirname, "../..");

  it("ensures relative doc links resolve to existing files and no manual template copies are instructed (REQ-OSA-23)", () => {
    const docFiles = [
      path.join(root, "README.md"),
      ...fg.sync(["docs/**/*.md", "skills/**/*.md"], { cwd: root, absolute: true }),
    ];

    for (const doc of docFiles) {
      if (!fs.existsSync(doc)) continue;
      const content = fs.readFileSync(doc, "utf-8");

      expect(
        /cp openspec\/schemas\/spec-rails\/templates|Copy \[schemas\/spec-rails\/templates/i.test(content),
        `${doc} instructs manual template copy`
      ).toBe(false);

      const dir = path.dirname(doc);
      // Match markdown links: [text](path)
      const linkMatches = content.matchAll(/\]\(([^)#\s]+)/g);
      for (const m of linkMatches) {
        const link = m[1];
        if (/^[a-z]+:/i.test(link)) continue; // skip http/https/mailto
        if (link.startsWith("/")) continue; // skip root-absolute

        const resolved = path.resolve(dir, link);
        expect(fs.existsSync(resolved), `Broken link in ${path.relative(root, doc)}: ${link}`).toBe(true);
      }
    }
  });

  it("forbids legacy specs/ paths (REQ-OSA-30)", () => {
    const targetFiles = [
      path.join(root, "README.md"),
      ...fg.sync(["docs/**/*", "skills/**/*", "rules/**/*", "templates/**/*"], {
        cwd: root,
        absolute: true,
        onlyFiles: true,
      }),
    ];

    for (const file of targetFiles) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf-8");
      expect(
        /specs\/(ROADMAP|WORKFLOW|bug-reports)/.test(content),
        `${path.relative(root, file)} references legacy specs/ path`
      ).toBe(false);
    }
  });

  it("forbids instructions telling users to commit a gate tick (REQ-OSA-40)", () => {
    const targetFiles = [
      path.join(root, "README.md"),
      ...fg.sync(["docs/**/*", "skills/**/*", "rules/**/*", "templates/**/*", "schemas/**/*"], {
        cwd: root,
        absolute: true,
        onlyFiles: true,
      }),
    ];

    for (const file of targetFiles) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf-8");
      expect(
        /tick[a-z]* [^.]*and (commits? (it|before)|committed)/i.test(content),
        `${path.relative(root, file)} instructs committing a gate tick`
      ).toBe(false);
    }
  });

  it("enforces mutation threshold is strictly 95% (NFR-OSA-5)", () => {
    const targetFiles = [
      path.join(root, "README.md"),
      ...fg.sync(["docs/**/*", "skills/**/*", "rules/**/*", "templates/**/*", "schemas/**/*"], {
        cwd: root,
        absolute: true,
        onlyFiles: true,
        ignore: ["docs/designs/**"],
      }),
    ];

    for (const file of targetFiles) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, "utf-8");
      if (/mutation|kill/i.test(content)) {
        const hasBadThreshold =
          /(>|≥|>=|\\ge|\\gt) ?(8[0-9]|9[0-4]|100) ?(\\)?%|\b(8[0-9]|9[0-4]|100) ?(\\)?% (kill|mutation)|"break": *([0-9]|[1-8][0-9]|9[0-4]|100)\b/.test(
            content
          );
        expect(hasBadThreshold, `${path.relative(root, file)} states a mutation threshold other than 95%`).toBe(false);
      }
    }
  });
});
