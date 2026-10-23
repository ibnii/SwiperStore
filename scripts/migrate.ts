import path from "node:path";
import { config as loadEnv } from "dotenv";
import { runMigrations } from "@/lib/db/migrate";

loadEnv({ path: [".env.local", ".env"], quiet: true });

function describeTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Set it in .env.local or the environment before running db:migrate.",
    );
  }

  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres:// scheme.");
  }

  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await runMigrations(connectionString, migrationsFolder);

  console.log(`Migrations applied to ${describeTarget(connectionString)}.`);
}

main().catch((error: unknown) => {
  console.error(
    "Migration failed:",
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
});
