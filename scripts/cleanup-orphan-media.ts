import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { findExpiredTrash, findOrphanedMedia } from "@/lib/media/cleanup";
import { listings } from "@/lib/db/schema";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

async function walk(root: string, base = root): Promise<{
  absolutePath: string;
  relativePath: string;
  mtimeMs: number;
}[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath, base)));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".webp")) {
      continue;
    }

    const info = await stat(absolutePath);
    files.push({
      absolutePath,
      relativePath: path.relative(base, absolutePath).split(path.sep).join("/"),
      mtimeMs: info.mtimeMs,
    });
  }

  return files;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const connectionString = process.env.DATABASE_URL;
  const uploadDir = process.env.UPLOAD_DIR;

  if (!connectionString || !uploadDir) {
    throw new Error(
      "DATABASE_URL dan UPLOAD_DIR wajib diisi di .env.local atau environment.",
    );
  }

  const uploadRoot = path.resolve(uploadDir);
  const listingsRoot = path.join(uploadRoot, "listings");
  const trashRoot = path.resolve(uploadRoot, "..", "trash");
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const db = drizzle(pool);
    const rows = await db
      .select({ thumbnailPath: listings.thumbnailPath })
      .from(listings);
    const referenced = rows.map((row) => row.thumbnailPath);

    const served = await walk(listingsRoot, uploadRoot);
    const orphans = findOrphanedMedia(served, referenced);
    const trash = await walk(trashRoot, trashRoot);
    const expired = findExpiredTrash(trash, Date.now(), TRASH_RETENTION_MS);

    console.log(
      `${served.length} file media dilayani, ${orphans.length} yatim; ` +
        `${trash.length} file di trash, ${expired.length} kedaluwarsa.`,
    );

    for (const file of orphans) {
      console.log(`  yatim: ${file.absolutePath}`);
    }

    for (const file of expired) {
      console.log(`  trash kedaluwarsa: ${file.absolutePath}`);
    }

    if (!apply) {
      console.log("Dry run. Jalankan dengan --apply untuk menghapus.");
      return;
    }

    for (const file of [...orphans, ...expired]) {
      await unlink(file.absolutePath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }

    console.log(
      `Dihapus: ${orphans.length} media yatim dan ${expired.length} file trash.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Cleanup media gagal:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
