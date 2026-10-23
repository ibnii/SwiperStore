import Link from "next/link";
import type { CatalogParams } from "@/lib/listings/queries";

type CatalogPaginationProps = {
  params: CatalogParams;
  page: number;
  pageCount: number;
};

function buildHref(params: CatalogParams, page: number): string {
  const search = new URLSearchParams();

  const searchQuery = params.q?.trim() ?? "";

  if (searchQuery.length > 0) {
    search.set("q", searchQuery);
  }

  if (params.status !== "all") {
    search.set("status", params.status);
  }

  if (params.sort !== "newest") {
    search.set("sort", params.sort);
  }

  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();

  return query ? `/?${query}` : "/";
}

const linkClass =
  "inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

export function CatalogPagination({
  params,
  page,
  pageCount,
}: CatalogPaginationProps) {
  return (
    <nav
      aria-label="Pagination katalog"
      className="mt-10 flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Link href={buildHref(params, page - 1)} className={linkClass}>
          Sebelumnya
        </Link>
      ) : (
        <span aria-hidden className="w-24" />
      )}

      <p className="text-xs text-muted">
        Halaman {page} dari {pageCount}
      </p>

      {page < pageCount ? (
        <Link href={buildHref(params, page + 1)} className={linkClass}>
          Berikutnya
        </Link>
      ) : (
        <span aria-hidden className="w-28" />
      )}
    </nav>
  );
}
