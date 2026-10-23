import { config as loadEnv } from "dotenv";
import { lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { adminSessions } from "@/lib/db/schema";

loadEnv({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL wajib diisi di .env.local atau environment.",
    );
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const db = drizzle(pool);
    const now = new Date();
    const expired = await db
      .select({ id: adminSessions.id })
      .from(adminSessions)
      .where(lt(adminSessions.expiresAt, now));

    if (dryRun) {
      console.log(
        `${expired.length} sesi kedaluwarsa. Dry run: tidak ada yang dihapus.`,
      );
      return;
    }

    const deleted = await db
      .delete(adminSessions)
      .where(lt(adminSessions.expiresAt, now))
      .returning({ id: adminSessions.id });

    console.log(`${deleted.length} sesi kedaluwarsa dihapus.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Cleanup sesi gagal:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
