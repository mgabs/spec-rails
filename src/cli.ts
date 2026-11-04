import { cac, type CAC } from "cac";
import { initProject } from "./commands/init.js";
import { runVerify } from "./commands/verify.js";

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
      for (const file of res.createdFiles) {
        console.log(`  + Created: ${file}`);
      }
    });

  cli
    .command("verify [dir]", "Verify tests, coverage, mutation scores, and evidence")
    .option("--slice <id>", "Verify a specific vertical slice ID")
    .option("--strict", "Enforce strict zero-bypass verification", { default: true })
    .action((dir, options) => {
      const res = runVerify({
        cwd: dir || process.cwd(),
        strict: options.strict,
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
    .command("lint", "Lint OpenSpec markdown artifacts against YAGNI boundaries and Gherkin formatting")
    .option("--gate <gate>", "Gate number to validate (1 or 2)")
    .action((options) => {
      console.log(`[spec-rails] lint called for gate=${options.gate}`);
    });

  cli.help();
  cli.version("0.2.0");

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
