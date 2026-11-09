import { cac, type CAC } from "cac";
import { initProject } from "./commands/init.js";
import { runVerify } from "./commands/verify.js";
import { runCheck } from "./commands/check.js";
import { runAudit } from "./commands/audit.js";
import pkg from "../package.json" with { type: "json" };

export function createCli(): CAC {
  const cli = cac("spec-rails");

  cli
    .command("init [dir]", "Initialize Spec-Rails in the target repository")
    .option("--stack <stack>", "Target stack: auto | ts | python | go | rust", { default: "auto" })
    .option("--force", "Overwrite existing configuration", { default: false })
    .action((dir, options) => {
      const res = initProject({
        cwd: dir || process.cwd(),
        stack: options.stack,
        force: options.force,
      });
      console.log(`[spec-rails] Initialized repository for stack: ${res.detectedStack}`);
      for (const action of res.actions) {
        console.log(`  - ${action}`);
      }
    });

  cli
    .command("verify [dir]", "Verify tests, coverage, mutation scores, and evidence")
    .option("--strict", "Enforce strict zero-bypass verification", { default: true })
    .action((dir, options) => {
      const res = runVerify({
        cwd: dir || process.cwd(),
        strict: options.strict,
        runCommands: true,
      });
      if (!res.success) {
        console.error("[spec-rails] Verification failed:");
        for (const err of res.errors) {
          console.error(`  - ${err}`);
        }
        process.exit(1);
      }
      console.log(`[spec-rails] Verification passed! (${res.discoveredTests.length} tests discovered)`);
    });

  cli
    .command("check [dir]", "Check gate status, lane rules, and DAG dependencies")
    .option("--store <id>", "OpenSpec store identifier")
    .option("--audit", "Run spec-to-code audit alongside gate checks", { default: false })
    .option("--base <ref>", "Base branch for audit comparison (default: main)")
    .option("--baseline", "Grandfather current gate violators into the baseline file", { default: false })
    .action((dir, options) => {
      const res = runCheck({
        writeBaseline: options.baseline,
        cwd: dir || process.cwd(),
        store: options.store,
        audit: options.audit,
        baseRef: options.base,
      });
      if (!res.success) {
        console.error("spec-rails-check: gate violations:");
        for (const v of res.violations) {
          console.error(`  - ${v}`);
        }
        process.exit(1);
      }
      console.log("[spec-rails] All gates and lane checks passed.");
    });

  cli
    .command("audit [dir]", "Audit spec-to-code mapping against base branch")
    .option("--base <ref>", "Base branch to compare against (default: main)", { default: "main" })
    .option("--head <ref>", "Head branch to compare (default: current branch)")
    .action((dir, options) => {
      const res = runAudit({
        cwd: dir || process.cwd(),
        baseRef: options.base,
        headRef: options.head,
      });
      if (res.isChoreExempt) {
        console.log("[spec-rails] Chore lane: spec-to-code audit skipped.");
        return;
      }
      if (!res.success) {
        console.error("[spec-rails] Spec-to-code audit failed:");
        for (const err of res.errors) {
          console.error(err);
        }
        process.exit(1);
      }
      console.log("[spec-rails] Spec-to-code audit passed.");
    });

  cli.help();
  cli.version(pkg.version);

  return cli;
}

export function runCli(argv: string[] = process.argv): void {
  const cli = createCli();
  try {
    cli.parse(argv);
  } catch (err: any) {
    console.error(`[spec-rails error] ${err.message}`);
    process.exit(1);
  }
}

// Only auto-run if directly executed
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("cli.ts")) {
  runCli();
}
