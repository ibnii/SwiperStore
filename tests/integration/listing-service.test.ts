import { access, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { listings } from "@/lib/db/schema";
import {
  createListing,
  deleteListing,
  setListingSold,
  updateListing,
} from "@/lib/listings/service";
import type { ListingInput } from "@/lib/listings/types";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR!);
const trashRoot = path.resolve(uploadRoot, "..", "trash");

const baseInput: ListingInput = {
  title: "Akun PUBG M416 Glacier",
  description:
    "Akun PUBG Mobile dengan skin M416 Glacier dan rank Conqueror.",
  priceIdr: 1_500_000,
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  isSold: false,
};

async function makeImageFile(width = 120, height = 80): Promise<File> {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 212, g: 175, b: 55 },
    },
  })
    .jpeg()
    .toBuffer();

  return new File([new Uint8Array(buffer)], "akun.jpg", {
    type: "image/jpeg",
  });
}

function mediaAbsolutePath(publicPath: string): string {
  return path.join(uploadRoot, publicPath.slice("/media/".length));
}

async function listWebpFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.name.endsWith(".webp")).map(
      (entry) => path.join(directory, entry.name),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

beforeEach(async () => {
  await pool.query(
    "TRUNCATE TABLE listings, admin_sessions; ALTER SEQUENCE listing_code_seq RESTART WITH 1;",
  );
  await rm(uploadRoot, { recursive: true, force: true });
  await rm(trashRoot, { recursive: true, force: true });
});

afterAll(async () => {
  await rm(uploadRoot, { recursive: true, force: true });
  await rm(trashRoot, { recursive: true, force: true });
  await pool.end();
});

describe("createListing", () => {
  it("stores a listing with a generated code, canonical video, and WebP thumbnail", async () => {
    const { code } = await createListing(baseInput, await makeImageFile());

    expect(code).toMatch(/^SWP-\d{4,}$/);

    const [row] = await db.select().from(listings);

    expect(row.code).toBe(code);
    expect(row.title).toBe(baseInput.title);
    expect(row.priceIdr).toBe(baseInput.priceIdr);
    expect(row.videoProvider).toBe("youtube");
    expect(row.videoUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(row.isSold).toBe(false);
    expect(row.soldAt).toBeNull();
    expect(row.thumbnailPath).toMatch(
      /^\/media\/listings\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/,
    );

    const metadata = await sharp(
      await readFile(mediaAbsolutePath(row.thumbnailPath)),
    ).metadata();

    expect(metadata.format).toBe("webp");
  });

  it("fills sold_at when the listing is created as sold", async () => {
    await createListing({ ...baseInput, isSold: true }, await makeImageFile());

    const [row] = await db.select().from(listings);

    expect(row.isSold).toBe(true);
    expect(row.soldAt).toBeInstanceOf(Date);
  });

  it("removes the saved image when the insert fails", async () => {
    await expect(
      createListing(
        { ...baseInput, title: "x" },
        await makeImageFile(),
      ),
    ).rejects.toThrow();

    expect(await db.select().from(listings)).toHaveLength(0);
    expect(await listWebpFiles(uploadRoot)).toEqual([]);
  });
});

describe("updateListing", () => {
  async function createRow(input: Partial<ListingInput> = {}) {
    const { code } = await createListing(
      { ...baseInput, ...input },
      await makeImageFile(),
    );
    const [row] = await db.select().from(listings);

    return { ...row, code };
  }

  it("keeps the existing thumbnail when no new image is sent", async () => {
    const existing = await createRow();
    const soldAtBefore = existing.soldAt;

    const { code } = await updateListing(existing.id, {
      ...baseInput,
      title: "Judul akun diperbarui",
      isSold: true,
    });

    const [row] = await db.select().from(listings);

    expect(code).toBe(existing.code);
    expect(row.title).toBe("Judul akun diperbarui");
    expect(row.thumbnailPath).toBe(existing.thumbnailPath);
    expect(row.isSold).toBe(true);
    expect(row.soldAt).toBeInstanceOf(Date);
    expect(row.soldAt).not.toBe(soldAtBefore);
    await expect(
      access(mediaAbsolutePath(row.thumbnailPath)),
    ).resolves.toBeUndefined();
  });

  it("moves the previous thumbnail to trash when the image is replaced", async () => {
    const existing = await createRow();

    await updateListing(
      existing.id,
      { ...baseInput, title: "Akun dengan gambar baru" },
      await makeImageFile(300, 200),
    );

    const [row] = await db.select().from(listings);
    const trashed = path.join(
      trashRoot,
      existing.thumbnailPath.slice("/media/".length),
    );

    expect(row.thumbnailPath).not.toBe(existing.thumbnailPath);
    await expect(access(mediaAbsolutePath(existing.thumbnailPath))).rejects.toThrow();
    await expect(access(trashed)).resolves.toBeUndefined();
    await expect(
      access(mediaAbsolutePath(row.thumbnailPath)),
    ).resolves.toBeUndefined();
  });

  it("preserves sold_at while the listing stays sold", async () => {
    const existing = await createRow({ isSold: true });

    await updateListing(existing.id, {
      ...baseInput,
      isSold: true,
      title: "Edit akun tetap terjual",
    });

    const [row] = await db.select().from(listings);

    expect(row.soldAt?.toISOString()).toBe(existing.soldAt?.toISOString());
  });

  it("clears sold_at when the listing becomes available again", async () => {
    const existing = await createRow({ isSold: true });

    await updateListing(existing.id, { ...baseInput, isSold: false });

    const [row] = await db.select().from(listings);

    expect(row.isSold).toBe(false);
    expect(row.soldAt).toBeNull();
  });
});

describe("setListingSold", () => {
  it("fills sold_at when marked sold and clears it when marked available", async () => {
    await createListing(baseInput, await makeImageFile());
    const [created] = await db.select().from(listings);

    await setListingSold(created.id, true);

    const [sold] = await db.select().from(listings);
    expect(sold.isSold).toBe(true);
    expect(sold.soldAt).toBeInstanceOf(Date);

    await setListingSold(created.id, false);

    const [available] = await db.select().from(listings);
    expect(available.isSold).toBe(false);
    expect(available.soldAt).toBeNull();
  });

  it("keeps the original sold_at when toggled sold twice", async () => {
    await createListing(baseInput, await makeImageFile());
    const [created] = await db.select().from(listings);

    await setListingSold(created.id, true);
    const [first] = await db.select().from(listings);
    await setListingSold(created.id, true);
    const [second] = await db.select().from(listings);

    expect(second.soldAt?.toISOString()).toBe(first.soldAt?.toISOString());
  });
});

describe("deleteListing", () => {
  it("deletes the row and moves its thumbnail to trash", async () => {
    const { code } = await createListing(baseInput, await makeImageFile());
    const [created] = await db.select().from(listings);

    await deleteListing(created.id);

    expect(await db.select().from(listings)).toHaveLength(0);
    await expect(access(mediaAbsolutePath(created.thumbnailPath))).rejects.toThrow();
    await expect(
      access(
        path.join(trashRoot, created.thumbnailPath.slice("/media/".length)),
      ),
    ).resolves.toBeUndefined();
    expect(code).toBe(created.code);
  });
});
