import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { listings, type Listing } from "@/lib/db/schema";

export const ADMIN_PAGE_SIZE = 20;

export type AdminListingStatus = "all" | "available" | "sold";

export type AdminListingFilters = {
  status: AdminListingStatus;
  page: number;
};

export type AdminListingPage = {
  items: Listing[];
  total: number;
  page: number;
  pageCount: number;
  availableCount: number;
  soldCount: number;
};

function statusFilter(status: AdminListingStatus) {
  if (status === "available") {
    return eq(listings.isSold, false);
  }

  if (status === "sold") {
    return eq(listings.isSold, true);
  }

  return undefined;
}

export async function listAdminListings(
  filters: AdminListingFilters,
): Promise<AdminListingPage> {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      sold: sql<number>`count(*) filter (where ${listings.isSold})::int`,
    })
    .from(listings);

  const total = counts?.total ?? 0;
  const soldCount = counts?.sold ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(filters.page) || 1), pageCount);
  const where = statusFilter(filters.status);

  const filteredTotal =
    filters.status === "all"
      ? total
      : filters.status === "sold"
        ? soldCount
        : total - soldCount;
  const filteredPageCount = Math.max(
    1,
    Math.ceil(filteredTotal / ADMIN_PAGE_SIZE),
  );
  const filteredPage = Math.min(page, filteredPageCount);

  const items = await db
    .select()
    .from(listings)
    .where(where)
    .orderBy(desc(listings.createdAt), desc(listings.id))
    .limit(ADMIN_PAGE_SIZE)
    .offset((filteredPage - 1) * ADMIN_PAGE_SIZE);

  return {
    items,
    total: filteredTotal,
    page: filteredPage,
    pageCount: filteredPageCount,
    availableCount: total - soldCount,
    soldCount,
  };
}

export async function getAdminListing(id: string): Promise<Listing | null> {
  const [row] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  return row ?? null;
}
