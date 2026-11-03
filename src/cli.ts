import { cac, type CAC } from "cac";

export function createCli(): CAC {
  const cli = cac("spec-rails");

  cli
    .command("init", "Initialize Spec-Rails in the target repository")
    .option("--stack <stack>", "Target stack: auto | ts | python | go | rust", { default: "auto" })
    .option("--force", "Overwrite existing configuration", { default: false })
    .action((options) => {
      console.log(`[spec-rails] init called with stack=${options.stack}`);
    });

  cli
    .command("verify", "Verify tests, coverage, mutation scores, and evidence")
    .option("--slice <id>", "Verify a specific vertical slice ID")
    .option("--strict", "Enforce strict zero-bypass verification", { default: true })
    .action((options) => {
      console.log(`[spec-rails] verify called (strict=${options.strict})`);
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
