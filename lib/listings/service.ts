import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { listings, type Listing } from "@/lib/db/schema";
import { saveListingImage, trashListingImage } from "@/lib/media/storage";
import { normalizeVideoUrl } from "@/lib/video/normalize";
import type { ListingInput } from "./types";

export class ListingNotFoundError extends Error {
  constructor() {
    super("Listing tidak ditemukan.");
    this.name = "ListingNotFoundError";
  }
}

function toVideoColumns(videoUrl: string) {
  const video = normalizeVideoUrl(videoUrl);

  if (!video) {
    throw new Error("URL video tidak valid.");
  }

  return {
    videoProvider: video.provider,
    videoUrl: video.canonicalUrl,
  };
}

export async function createListing(
  input: ListingInput,
  image: File,
): Promise<{ code: string }> {
  const saved = await saveListingImage(image);

  try {
    const [row] = await db
      .insert(listings)
      .values({
        title: input.title,
        description: input.description,
        priceIdr: input.priceIdr,
        ...toVideoColumns(input.videoUrl),
        thumbnailPath: saved.path,
        isSold: input.isSold,
        soldAt: input.isSold ? new Date() : null,
      })
      .returning({ code: listings.code });

    return { code: row.code };
  } catch (error) {
    await trashListingImage(saved.path).catch(() => undefined);
    throw error;
  }
}

export async function updateListing(
  id: string,
  input: ListingInput,
  image?: File,
): Promise<{ code: string }> {
  const existing = await getListingById(id);

  if (!existing) {
    throw new ListingNotFoundError();
  }

  const saved = image ? await saveListingImage(image) : null;

  try {
    const [row] = await db
      .update(listings)
      .set({
        title: input.title,
        description: input.description,
        priceIdr: input.priceIdr,
        ...toVideoColumns(input.videoUrl),
        isSold: input.isSold,
        soldAt: input.isSold
          ? (existing.soldAt ?? new Date())
          : null,
        thumbnailPath: saved?.path ?? existing.thumbnailPath,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))
      .returning({ code: listings.code });

    if (!row) {
      throw new ListingNotFoundError();
    }

    if (saved) {
      await trashListingImage(existing.thumbnailPath).catch(() => undefined);
    }

    return { code: row.code };
  } catch (error) {
    if (saved) {
      await trashListingImage(saved.path).catch(() => undefined);
    }

    throw error;
  }
}

export async function setListingSold(id: string, sold: boolean): Promise<void> {
  await db
    .update(listings)
    .set({
      isSold: sold,
      soldAt: sold ? sql`coalesce(${listings.soldAt}, now())` : null,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, id));
}

export async function deleteListing(id: string): Promise<void> {
  const [deleted] = await db
    .delete(listings)
    .where(eq(listings.id, id))
    .returning({ thumbnailPath: listings.thumbnailPath });

  if (!deleted) {
    return;
  }

  await trashListingImage(deleted.thumbnailPath).catch(() => undefined);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const [row] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  return row ?? null;
}
