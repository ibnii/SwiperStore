import type { Metadata } from "next";
import Link from "next/link";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { ListingCard } from "@/components/catalog/listing-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  listPublicListings,
  type CatalogParams,
} from "@/lib/listings/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog Akun — Swiper Store",
  description:
    "Jelajahi akun PUBG premium pilihan Swiper Store. Cari berdasarkan judul, filter status, dan urutkan sesuai kebutuhanmu.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): CatalogParams["status"] {
  return value === "available" || value === "sold" ? value : "all";
}

function parseSort(value: string | undefined): CatalogParams["sort"] {
  return value === "price_asc" || value === "price_desc" ? value : "newest";
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const catalogParams: CatalogParams = {
    q: (firstValue(params.q) ?? "").trim().slice(0, 80),
    status: parseStatus(firstValue(params.status)),
    sort: parseSort(firstValue(params.sort)),
    page: parsePage(firstValue(params.page)),
  };
  const result = await listPublicListings(catalogParams);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main
        id="konten"
        className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8"
      >
        <section className="relative overflow-hidden py-10 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_85%_at_30%_0%,rgba(212,175,55,0.16),transparent)]"
          />
          <div className="relative">
            <h1 className="max-w-3xl font-display text-5xl leading-[0.95] tracking-wide text-champagne text-balance sm:text-7xl">
              Akun premium, proses cepat.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Setiap akun sudah diperiksa dan siap dipakai. Pilih yang cocok,
              lalu hubungi kami lewat WhatsApp.
            </p>
          </div>
        </section>

        <CatalogFilters params={catalogParams} />

        {result.items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
            <p className="font-display text-3xl tracking-wide text-champagne">
              Tidak ada akun yang cocok dengan pencarianmu.
            </p>
            <p className="mt-3 text-sm text-muted">
              Coba kata kunci lain atau reset filter yang aktif.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg border border-gold/50 px-5 py-2.5 text-sm font-semibold text-champagne transition hover:border-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Lihat semua akun
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted">
              {result.items.length} dari {result.total} akun
            </p>

            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} />
                </li>
              ))}
            </ul>

            {result.pageCount > 1 ? (
              <CatalogPagination
                params={catalogParams}
                page={result.page}
                pageCount={result.pageCount}
              />
            ) : null}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
