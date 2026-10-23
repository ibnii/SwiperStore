import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/lib/db/client";
import { adminSessions, listings } from "@/lib/db/schema";
import {
  getPublicListingByCode,
  listPublicListings,
} from "@/lib/listings/queries";
import type { PublicListingCard } from "@/lib/listings/types";

type NewListing = typeof listings.$inferInsert;

const baseListing: NewListing = {
  title: "Akun PUBG M416 Sultan",
  description:
    "Akun PUBG Mobile dengan skin M416 Glacier, outfit langka, dan rank Conqueror.",
  priceIdr: 1_500_000,
  videoProvider: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  thumbnailPath: "/media/listings/seed/akun-01.webp",
  isSold: false,
};

async function insertListing(overrides: Partial<NewListing> = {}) {
  const [row] = await db
    .insert(listings)
    .values({ ...baseListing, ...overrides })
    .returning();

  return row;
}

function byIdAsc(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function byIdDesc(a: { id: string }, b: { id: string }): number {
  return byIdAsc(b, a);
}

beforeEach(async () => {
  await pool.query(
    "TRUNCATE TABLE listings, admin_sessions; ALTER SEQUENCE listing_code_seq RESTART WITH 1;",
  );
});

afterAll(async () => {
  await pool.end();
});

describe("listings schema", () => {
  it("generates 20 unique race-safe codes for parallel inserts", async () => {
    const rows = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        insertListing({ title: `Akun paralel ${index + 1}` }),
      ),
    );

    const codes = rows.map((row) => row.code);

    expect(codes).toHaveLength(20);
    expect(new Set(codes)).toHaveProperty("size", 20);

    for (const code of codes) {
      expect(code).toMatch(/^SWP-\d{4,}$/);
    }
  });

  it("enforces that sold_at matches is_sold", async () => {
    const insertRaw = (isSold: boolean, soldAt: Date | null) =>
      pool.query(
        `INSERT INTO listings
          (title, description, price_idr, is_sold, sold_at, video_provider, video_url, thumbnail_path)
         VALUES ($1, $2, $3, $4, $5, 'youtube', $6, $7)`,
        [
          "Akun uji constraint",
          "Deskripsi akun untuk menguji constraint sold_at.",
          1_000_000,
          isSold,
          soldAt,
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          "/media/listings/seed/akun-01.webp",
        ],
      );

    await expect(insertRaw(true, null)).rejects.toThrow(
      /sold_at_matches_status/,
    );

    await expect(insertRaw(false, new Date())).rejects.toThrow(
      /sold_at_matches_status/,
    );

    const sold = await insertListing({
      isSold: true,
      soldAt: new Date("2026-01-10T08:00:00Z"),
    });
    const available = await insertListing({ isSold: false });

    expect(sold.soldAt).toEqual(new Date("2026-01-10T08:00:00Z"));
    expect(available.soldAt).toBeNull();
  });

  it("creates the admin_sessions table from the migration", async () => {
    const columns = await pool.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_sessions' ORDER BY ordinal_position",
    );

    expect(columns.rows.map((row) => row.column_name)).toEqual([
      "id",
      "token_hash",
      "created_at",
      "expires_at",
      "ip",
      "user_agent",
    ]);
  });

  it("accepts a session row with a 64 character token hash", async () => {
    const [row] = await db
      .insert(adminSessions)
      .values({
        tokenHash: "a".repeat(64),
        expiresAt: new Date("2026-12-31T00:00:00Z"),
        ip: "127.0.0.1",
        userAgent: "integration-test",
      })
      .returning();

    expect(row.tokenHash).toHaveLength(64);
  });
});

describe("listPublicListings search", () => {
  it("searches titles case-insensitively and never descriptions", async () => {
    await insertListing({
      title: "Akun M416 Sultan",
      description: "Deskripsi biasa tanpa kata kunci khusus.",
    });
    await insertListing({
      title: "Akun Biasa",
      description: "Deskripsi dengan kata rahasia yang tidak boleh cocok.",
    });

    const byTitle = await listPublicListings({
      q: "m416",
      status: "all",
      sort: "newest",
      page: 1,
    });
    const byDescription = await listPublicListings({
      q: "rahasia",
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(byTitle.items.map((item) => item.title)).toEqual([
      "Akun M416 Sultan",
    ]);
    expect(byDescription.items).toEqual([]);
  });

  it("treats %, _, and backslash as literal characters, not SQL wildcards", async () => {
    await insertListing({ title: "Akun Sultan 100% Winrate" });
    await insertListing({ title: "Akun Sultan 100x Winrate" });
    await insertListing({ title: "Akun_Bidikan M416" });
    await insertListing({ title: "AkunXBidikan M416" });
    await insertListing({ title: "Akun \\ Spesial" });

    const percent = await listPublicListings({
      q: "100%",
      status: "all",
      sort: "newest",
      page: 1,
    });
    const underscore = await listPublicListings({
      q: "_",
      status: "all",
      sort: "newest",
      page: 1,
    });
    const backslash = await listPublicListings({
      q: "\\",
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(percent.items.map((item) => item.title)).toEqual([
      "Akun Sultan 100% Winrate",
    ]);
    expect(underscore.items.map((item) => item.title)).toEqual([
      "Akun_Bidikan M416",
    ]);
    expect(backslash.items.map((item) => item.title)).toEqual([
      "Akun \\ Spesial",
    ]);
  });

  it("bounds the search term length instead of failing", async () => {
    await insertListing({ title: "Akun M416 Sultan" });

    const result = await listPublicListings({
      q: "x".repeat(500),
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(result).toMatchObject({ total: 0, page: 1, pageCount: 1 });
    expect(result.items).toEqual([]);
  });
});

describe("listPublicListings filters and sorts", () => {
  it("filters by available, sold, and all statuses", async () => {
    await insertListing({ title: "Tersedia satu", isSold: false });
    await insertListing({ title: "Tersedia dua", isSold: false });
    await insertListing({
      title: "Terjual satu",
      isSold: true,
      soldAt: new Date("2026-02-01T00:00:00Z"),
    });

    const available = await listPublicListings({
      status: "available",
      sort: "newest",
      page: 1,
    });
    const sold = await listPublicListings({
      status: "sold",
      sort: "newest",
      page: 1,
    });
    const all = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(available.total).toBe(2);
    expect(available.items.every((item) => !item.isSold)).toBe(true);
    expect(sold.total).toBe(1);
    expect(sold.items.every((item) => item.isSold)).toBe(true);
    expect(all.total).toBe(3);
  });

  it("sorts newest first using created_at DESC and id DESC", async () => {
    const older = await insertListing({
      title: "Paling lama",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newerA = await insertListing({
      title: "Terbaru A",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    const newerB = await insertListing({
      title: "Terbaru B",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });

    const expected = [newerA, newerB].sort(byIdDesc).concat(older);

    const result = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(result.items.map((item) => item.id)).toEqual(
      expected.map((row) => row.id),
    );
  });

  it("sorts price ascending using price_idr ASC and id ASC", async () => {
    const higher = await insertListing({
      title: "Mahal",
      priceIdr: 5_000_000,
    });
    const lowerA = await insertListing({
      title: "Murah A",
      priceIdr: 1_000_000,
    });
    const lowerB = await insertListing({
      title: "Murah B",
      priceIdr: 1_000_000,
    });

    const expected = [lowerA, lowerB].sort(byIdAsc).concat(higher);

    const result = await listPublicListings({
      status: "all",
      sort: "price_asc",
      page: 1,
    });

    expect(result.items.map((item) => item.id)).toEqual(
      expected.map((row) => row.id),
    );
  });

  it("sorts price descending using price_idr DESC and id DESC", async () => {
    const lower = await insertListing({
      title: "Murah",
      priceIdr: 1_000_000,
    });
    const higherA = await insertListing({
      title: "Mahal A",
      priceIdr: 5_000_000,
    });
    const higherB = await insertListing({
      title: "Mahal B",
      priceIdr: 5_000_000,
    });

    const expected = [higherA, higherB].sort(byIdDesc).concat(lower);

    const result = await listPublicListings({
      status: "all",
      sort: "price_desc",
      page: 1,
    });

    expect(result.items.map((item) => item.id)).toEqual(
      expected.map((row) => row.id),
    );
  });
});

describe("listPublicListings pagination", () => {
  it("returns page 1 with pageCount 1 for an empty catalog", async () => {
    const result = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(result).toEqual({ items: [], total: 0, page: 1, pageCount: 1 });
  });

  it("uses 12 items per page and computes pageCount", async () => {
    const start = Date.parse("2026-01-01T00:00:00Z");
    const rows = [];

    for (let index = 0; index < 13; index += 1) {
      rows.push(
        await insertListing({
          title: `Akun halaman ${index}`,
          createdAt: new Date(start + index * 60_000),
        }),
      );
    }

    const first = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 1,
    });
    const second = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 2,
    });

    expect(first.total).toBe(13);
    expect(first.page).toBe(1);
    expect(first.pageCount).toBe(2);
    expect(first.items).toHaveLength(12);
    expect(second.total).toBe(13);
    expect(second.page).toBe(2);
    expect(second.pageCount).toBe(2);
    expect(second.items).toHaveLength(1);
    expect(second.items[0].id).toBe(rows[0].id);
  });

  it("clamps invalid and out-of-range pages", async () => {
    for (let index = 0; index < 13; index += 1) {
      await insertListing({ title: `Akun clamp ${index}` });
    }

    for (const page of [0, -4, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const result = await listPublicListings({
        status: "all",
        sort: "newest",
        page,
      });

      expect(result.page).toBe(1);
      expect(result.pageCount).toBe(2);
      expect(result.items).toHaveLength(12);
    }

    const beyond = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 999,
    });

    expect(beyond.page).toBe(2);
    expect(beyond.pageCount).toBe(2);
    expect(beyond.items).toHaveLength(1);
  });
});

describe("getPublicListingByCode", () => {
  it("returns a full listing for an existing uppercase code", async () => {
    const row = await insertListing({ title: "Akun detail" });

    expect(row.code).toBe("SWP-0001");

    const detail = await getPublicListingByCode(row.code);

    expect(detail).not.toBeNull();
    expect(detail).toMatchObject({
      id: row.id,
      code: row.code,
      title: "Akun detail",
      description: baseListing.description,
      priceIdr: 1_500_000,
      isSold: false,
      videoProvider: "youtube",
      videoUrl: baseListing.videoUrl,
      thumbnailPath: baseListing.thumbnailPath,
      soldAt: null,
    });
    expect(detail?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null for malformed, lowercase, and unknown codes", async () => {
    await insertListing();

    for (const code of [
      "",
      "SWP-001",
      "swp-0001",
      "SWP-0001 ",
      "SWP-9999",
      "SWP-0001' OR '1'='1",
      "'; DROP TABLE listings; --",
    ]) {
      await expect(getPublicListingByCode(code)).resolves.toBeNull();
    }

    const stillThere = await pool.query("SELECT count(*)::int AS count FROM listings");
    expect(stillThere.rows[0].count).toBe(1);
  });
});

describe("public column shape", () => {
  it("returns only public card columns from the catalog", async () => {
    await insertListing();

    const result = await listPublicListings({
      status: "all",
      sort: "newest",
      page: 1,
    });

    expect(result.items).toHaveLength(1);
    const card: PublicListingCard = result.items[0];

    expect(Object.keys(card).sort()).toEqual(
      [
        "id",
        "code",
        "title",
        "priceIdr",
        "isSold",
        "thumbnailPath",
        "createdAt",
      ].sort(),
    );
    expect(card.createdAt).toBeInstanceOf(Date);
  });

  it("returns the public detail fields including soldAt and video data", async () => {
    const row = await insertListing({
      isSold: true,
      soldAt: new Date("2026-03-01T12:00:00Z"),
    });

    const detail = await getPublicListingByCode(row.code);

    expect(detail).not.toBeNull();
    expect(Object.keys(detail!).sort()).toEqual(
      [
        "id",
        "code",
        "title",
        "priceIdr",
        "isSold",
        "thumbnailPath",
        "createdAt",
        "description",
        "videoProvider",
        "videoUrl",
        "soldAt",
      ].sort(),
    );
    expect(detail?.soldAt).toEqual(new Date("2026-03-01T12:00:00Z"));
  });
});

describe("pool configuration", () => {
  it("is bounded to 5 connections with a 5 second statement timeout", async () => {
    expect(pool.options.max).toBe(5);
    expect(pool.options.statement_timeout).toBe(5_000);
    expect(pool.options.connectionTimeoutMillis).toBe(5_000);

    const result = await pool.query<{ statement_timeout: string }>(
      "SHOW statement_timeout",
    );

    expect(result.rows[0].statement_timeout).toBe("5s");
  });
});
