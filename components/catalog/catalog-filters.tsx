import Link from "next/link";
import type { CatalogParams } from "@/lib/listings/queries";

type CatalogFiltersProps = {
  params: CatalogParams;
};

const controlClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-foreground transition focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/40";

export function CatalogFilters({ params }: CatalogFiltersProps) {
  const hasFilters =
    (params.q?.trim().length ?? 0) > 0 ||
    params.status !== "all" ||
    params.sort !== "newest";

  return (
    <form
      action="/"
      method="get"
      role="search"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label
            htmlFor="catalog-q"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Cari akun
          </label>
          <input
            id="catalog-q"
            name="q"
            type="search"
            defaultValue={params.q}
            maxLength={80}
            placeholder="Contoh: Glacier, Conqueror…"
            className={controlClass}
          />
        </div>

        <div>
          <label
            htmlFor="catalog-status"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Status
          </label>
          <select
            id="catalog-status"
            name="status"
            defaultValue={params.status}
            className={controlClass}
          >
            <option value="all">Semua akun</option>
            <option value="available">Tersedia</option>
            <option value="sold">Terjual</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="catalog-sort"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Urutkan
          </label>
          <select
            id="catalog-sort"
            name="sort"
            defaultValue={params.sort}
            className={controlClass}
          >
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga terendah</option>
            <option value="price_desc">Harga tertinggi</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="min-h-11 w-full rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-background transition hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:w-auto"
          >
            Cari
          </button>
          {hasFilters ? (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition hover:border-gold/60 hover:text-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:shrink-0"
            >
              Reset
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
