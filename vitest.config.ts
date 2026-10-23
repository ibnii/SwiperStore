import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "server-only",
        replacement: path.join(rootDir, "tests/stubs/server-only.ts"),
      },
      { find: "@", replacement: rootDir },
    ],
  },
  test: {
    environment: "node",
    // Integration tests need Postgres; keep them out of the default unit run.
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});
