import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Applies the forward-only SQL migrations in `drizzle/` to the given database.
 * A short-lived single-connection pool keeps CLI and test runs clean.
 */
export async function runMigrations(
  connectionString: string,
  migrationsFolder = path.join(process.cwd(), "drizzle"),
): Promise<void> {
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const migrationDb = drizzle(pool);
    await migrate(migrationDb, { migrationsFolder });
  } finally {
    await pool.end();
  }
}
