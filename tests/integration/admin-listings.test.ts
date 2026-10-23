import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { listings, type NewListing } from "@/lib/db/schema";
import {
  ADMIN_PAGE_SIZE,
  listAdminListings,
} from "@/lib/listings/admin-queries";

const baseListing: NewListing = {
  title: "Akun PUBG admin",
  description: "Deskripsi akun untuk pengujian panel admin.",
  priceIdr: 1_000_000,
  videoProvider: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  thumbnailPath: "/media/listings/seed/akun-01.webp",
  isSold: false,
};

async function seedListings(count: number, soldCount: number) {
  const start = new Date("2026-01-01T00:00:00Z").getTime();

  await db.insert(listings).values(
    Array.from({ length: count }, (_, index) => ({
      ...baseListing,
      title: `Akun admin ${String(index + 1).padStart(2, "0")}`,
      isSold: index < soldCount,
      soldAt: index < soldCount ? new Date(start + index * 1_000) : null,
      createdAt: new Date(start + index * 1_000),
      updatedAt: new Date(start + index * 1_000),
    })),
  );
}

beforeEach(async () => {
  await pool.query(
    "TRUNCATE TABLE listings, admin_sessions; ALTER SEQUENCE listing_code_seq RESTART WITH 1;",
  );
});

afterAll(async () => {
  await pool.end();
});

describe("listAdminListings", () => {
  it("paginates newest first and reports status counts", async () => {
    await seedListings(25, 7);

    const first = await listAdminListings({ status: "all", page: 1 });

    expect(first.items).toHaveLength(ADMIN_PAGE_SIZE);
    expect(first.total).toBe(25);
    expect(first.pageCount).toBe(2);
    expect(first.availableCount).toBe(18);
    expect(first.soldCount).toBe(7);
    expect(first.items[0].title).toBe("Akun admin 25");

    const second = await listAdminListings({ status: "all", page: 2 });

    expect(second.items).toHaveLength(5);
    expect(second.items.at(-1)?.title).toBe("Akun admin 01");
  });

  it("filters by available and sold status", async () => {
    await seedListings(25, 7);

    const sold = await listAdminListings({ status: "sold", page: 1 });
    const available = await listAdminListings({
      status: "available",
      page: 1,
    });

    expect(sold.total).toBe(7);
    expect(sold.items.every((item) => item.isSold)).toBe(true);
    expect(available.total).toBe(18);
    expect(available.items.every((item) => !item.isSold)).toBe(true);
  });

  it("clamps out-of-range pages", async () => {
    await seedListings(5, 0);

    const tooHigh = await listAdminListings({ status: "all", page: 99 });
    const tooLow = await listAdminListings({ status: "all", page: 0 });

    expect(tooHigh.page).toBe(1);
    expect(tooHigh.items).toHaveLength(5);
    expect(tooLow.page).toBe(1);
  });

  it("returns an empty first page when there are no listings", async () => {
    const result = await listAdminListings({ status: "all", page: 1 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageCount).toBe(1);
    expect(result.availableCount).toBe(0);
    expect(result.soldCount).toBe(0);
  });
});
