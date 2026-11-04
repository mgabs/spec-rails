import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  clean: true,
  bundle: true,
  noExternal: ["zod", "cac", "fast-glob"],
  banner: {
    js: `#!/usr/bin/env node
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);`,
  },
});
