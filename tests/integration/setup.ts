import path from "node:path";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { beforeAll } from "vitest";
import { runMigrations } from "@/lib/db/migrate";

loadEnv({
  path: [path.resolve(process.cwd(), ".env.local"), path.resolve(process.cwd(), ".env")],
  quiet: true,
});

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error(
    "DATABASE_URL_TEST is required for integration tests. Copy .env.example to .env.local and set it to the dedicated test database (for example postgres://swiperstore:swiperstore_dev@127.0.0.1:5433/swiperstore_test).",
  );
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Integration tests must never run with NODE_ENV=production.");
}

if (process.env.DATABASE_URL === testDatabaseUrl) {
  throw new Error(
    "DATABASE_URL_TEST must point to a dedicated test database, not the configured application database.",
  );
}

function parseDatabaseUrl(connectionString: string): URL {
  try {
    return new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL_TEST is not a valid PostgreSQL URL.");
  }
}

const testUrl = parseDatabaseUrl(testDatabaseUrl);
const testDatabaseName = decodeURIComponent(testUrl.pathname.replace(/^\//, ""));

if (!/^[a-z0-9_]+_test$/.test(testDatabaseName)) {
  throw new Error(
    `Refusing to run integration tests against database "${testDatabaseName}". The database name must end with "_test".`,
  );
}

/**
 * Points the application data layer at the test database. Vitest runs setup
 * files before loading test modules, so `lib/db/client.ts` sees this value.
 */
process.env.DATABASE_URL = testDatabaseUrl;

// The data layer imports the validated env module. Keep integration tests
// self-contained when only DATABASE_URL_TEST is provided by CI.
process.env.ADMIN_EMAIL ??= "admin@swiperstore.local";
// Argon2id hash of "test-admin-password"; tests must not depend on the local
// developer password or its hash.
process.env.ADMIN_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$F9cXXPxjOb6fcX7cNWjJKw$PL9a0aOiLet6adp2iVSu2tzlC3YjP4HT052m1bHpj6I";
process.env.WA_NUMBER ??= "6281234567890";
// Keep uploads away from the developer's real media directory.
process.env.UPLOAD_DIR = "./storage/test-uploads";
process.env.SITE_URL ??= "http://localhost:3000";

beforeAll(async () => {
  const maintenanceUrl = new URL(testUrl);
  maintenanceUrl.pathname = "/postgres";

  const admin = new Client({
    connectionString: maintenanceUrl.toString(),
    connectionTimeoutMillis: 5_000,
  });

  await admin.connect();

  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [testDatabaseName],
    );

    if (existing.rowCount === 0) {
      // The name is validated against ^[a-z0-9_]+_test$ above, so quoting is safe.
      await admin.query(`CREATE DATABASE "${testDatabaseName}"`);
    }
  } finally {
    await admin.end();
  }

  await runMigrations(testDatabaseUrl);
});
