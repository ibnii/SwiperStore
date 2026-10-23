import "server-only";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { listings } from "@/lib/db/schema";
import type { PublicListing, PublicListingCard } from "./types";

export type CatalogParams = {
  q?: string;
  status: "all" | "available" | "sold";
  sort: "newest" | "price_asc" | "price_desc";
  page: number;
};

const PAGE_SIZE = 12;
const MAX_SEARCH_LENGTH = 80;
const LISTING_CODE_PATTERN = /^SWP-\d{4,}$/;

const publicCardColumns = {
  id: listings.id,
  code: listings.code,
  title: listings.title,
  priceIdr: listings.priceIdr,
  isSold: listings.isSold,
  thumbnailPath: listings.thumbnailPath,
  createdAt: listings.createdAt,
};

const publicListingColumns = {
  ...publicCardColumns,
  description: listings.description,
  videoProvider: listings.videoProvider,
  videoUrl: listings.videoUrl,
  soldAt: listings.soldAt,
};

/** Escapes LIKE/ILIKE metacharacters so user input is always literal. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function buildWhereClause(params: CatalogParams): SQL | undefined {
  const conditions: SQL[] = [];
  const query = params.q?.trim().slice(0, MAX_SEARCH_LENGTH) ?? "";

  if (query.length > 0) {
    const pattern = `%${escapeLikePattern(query)}%`;
    conditions.push(
      sql`${listings.title} ILIKE ${pattern} ESCAPE '\\'`,
    );
  }

  if (params.status === "available") {
    conditions.push(eq(listings.isSold, false));
  } else if (params.status === "sold") {
    conditions.push(eq(listings.isSold, true));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function buildOrderBy(sort: CatalogParams["sort"]) {
  switch (sort) {
    case "price_asc":
      return [asc(listings.priceIdr), asc(listings.id)];
    case "price_desc":
      return [desc(listings.priceIdr), desc(listings.id)];
    case "newest":
    default:
      return [desc(listings.createdAt), desc(listings.id)];
  }
}

/**
 * Returns one public catalog page. Search matches titles only, status and sort
 * are allow-listed, and the query always has a bounded LIMIT.
 */
export async function listPublicListings(params: CatalogParams): Promise<{
  items: PublicListingCard[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const whereClause = buildWhereClause(params);

  const [totalRow] = await db
    .select({ value: count() })
    .from(listings)
    .where(whereClause);

  const total = totalRow?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage =
    Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
  const page = Math.min(requestedPage, pageCount);

  const items = await db
    .select(publicCardColumns)
    .from(listings)
    .where(whereClause)
    .orderBy(...buildOrderBy(params.sort))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items, total, page, pageCount };
}

/**
 * Looks up a public listing by its uppercase SWP-\d{4,} code. Malformed or
 * unknown codes return null.
 */
export async function getPublicListingByCode(
  code: string,
): Promise<PublicListing | null> {
  const match = LISTING_CODE_PATTERN.exec(code);

  if (!match || match[0] !== code) {
    return null;
  }

  const [row] = await db
    .select(publicListingColumns)
    .from(listings)
    .where(eq(listings.code, code))
    .limit(1);

  return row ?? null;
}
