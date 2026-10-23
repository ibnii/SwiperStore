import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __swiperstorePool: Pool | undefined;
};

function createPool(): Pool {
  const created = new Pool({
    connectionString: env.DATABASE_URL,
    max: 5,
    statement_timeout: 5_000,
    connectionTimeoutMillis: 5_000,
  });

  created.on("error", (error) => {
    // An idle client failed. Log it instead of letting the process crash.
    console.error("Unexpected error on idle PostgreSQL client:", error);
  });

  return created;
}

/**
 * One pool per process. In development, keep it on globalThis so hot reloads
 * reuse it instead of leaking a pool per module evaluation.
 */
export const pool: Pool = globalForDb.__swiperstorePool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__swiperstorePool = pool;
}

export const db = drizzle(pool, { schema });
