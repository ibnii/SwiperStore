import Link from "next/link";
import { ListingRowActions } from "@/components/admin/listing-row-actions";
import { formatIDR } from "@/lib/format";
import {
  listAdminListings,
  type AdminListingStatus,
} from "@/lib/listings/admin-queries";

export const metadata = {
  title: "Kelola Katalog — Swiper Store",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): AdminListingStatus {
  return value === "available" || value === "sold" ? value : "all";
}

function parsePage(value: string | undefined): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function statusBadge(isSold: boolean) {
  return isSold
    ? "border-sold/50 bg-sold/10 text-red-300"
    : "border-gold/40 bg-gold/10 text-champagne";
}

function buildHref(status: AdminListingStatus, page = 1): string {
  const params = new URLSearchParams();

  if (status !== "all") {
    params.set("status", status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/admin?${query}` : "/admin";
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = parseStatus(firstValue(params.status));
  const page = parsePage(firstValue(params.page));
  const result = await listAdminListings({ status, page });

  const createdCode = firstValue(params.created);
  const updatedCode = firstValue(params.updated);
  const notice =
    createdCode && /^SWP-\d{4,}$/.test(createdCode)
      ? `Listing ${createdCode} berhasil dibuat.`
      : updatedCode && /^SWP-\d{4,}$/.test(updatedCode)
        ? `Listing ${updatedCode} berhasil diperbarui.`
        : firstValue(params.deleted) === "1"
          ? "Listing berhasil dihapus."
          : null;

  const tabs: { value: AdminListingStatus; label: string; count: number }[] = [
    {
      value: "all",
      label: "Semua",
      count: result.availableCount + result.soldCount,
    },
    { value: "available", label: "Tersedia", count: result.availableCount },
    { value: "sold", label: "Terjual", count: result.soldCount },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-champagne">
            Kelola Katalog
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Tambah akun baru, perbarui detail, atau tandai akun yang sudah
            terjual.
          </p>
        </div>

        <Link
          href="/admin/listings/new"
          className="inline-flex min-h-11 items-center rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background transition hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          + Tambah listing
        </Link>
      </div>

      {notice ? (
        <p
          role="status"
          className="mt-6 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-champagne"
        >
          {notice}
        </p>
      ) : null}

      <dl className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <dt className="text-xs uppercase tracking-wider text-muted">
            Tersedia
          </dt>
          <dd className="mt-1 font-display text-3xl tabular-nums text-champagne sm:text-4xl">
            {result.availableCount}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <dt className="text-xs uppercase tracking-wider text-muted">
            Terjual
          </dt>
          <dd className="mt-1 font-display text-3xl tabular-nums text-champagne sm:text-4xl">
            {result.soldCount}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <dt className="text-xs uppercase tracking-wider text-muted">Total</dt>
          <dd className="mt-1 font-display text-3xl tabular-nums text-champagne sm:text-4xl">
            {result.availableCount + result.soldCount}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter status">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            aria-current={status === tab.value ? "page" : undefined}
            className={
              status === tab.value
                ? "inline-flex min-h-11 items-center rounded-full border border-gold bg-gold/15 px-4 py-2 text-xs font-semibold text-champagne"
                : "inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:border-gold/60 hover:text-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            }
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <p className="font-display text-2xl tracking-wide text-champagne">
            {status === "all"
              ? "Belum ada listing."
              : "Tidak ada listing di filter ini."}
          </p>
          <p className="mt-2 text-sm text-muted">
            {status === "all"
              ? "Tambahkan akun pertama untuk mulai mengisi katalog."
              : "Coba pilih filter lain."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border md:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Daftar listing, halaman {result.page} dari {result.pageCount}
              </caption>
              <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Akun
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Harga
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        {/* Admin thumbnails are already optimized WebP files. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.thumbnailPath}
                          alt={`Thumbnail ${item.code}`}
                          loading="lazy"
                          className="h-14 w-20 rounded-md border border-border object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-gold">
                            {item.code}
                          </p>
                          <p className="mt-1 line-clamp-2 max-w-xs font-medium text-foreground">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 tabular-nums text-champagne">
                      {formatIDR(item.priceIdr)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(item.isSold)}`}
                      >
                        <span
                          aria-hidden
                          className={`size-1.5 rounded-full ${item.isSold ? "bg-sold" : "bg-gold"}`}
                        />
                        {item.isSold ? "Terjual" : "Tersedia"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <ListingRowActions
                        id={item.id}
                        code={item.code}
                        isSold={item.isSold}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {result.items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailPath}
                    alt={`Thumbnail ${item.code}`}
                    loading="lazy"
                    className="h-16 w-24 shrink-0 rounded-md border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-gold">{item.code}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-champagne">
                      {formatIDR(item.priceIdr)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(item.isSold)}`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${item.isSold ? "bg-sold" : "bg-gold"}`}
                    />
                    {item.isSold ? "Terjual" : "Tersedia"}
                  </span>
                </div>

                <div className="mt-3">
                  <ListingRowActions
                    id={item.id}
                    code={item.code}
                    isSold={item.isSold}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {result.pageCount > 1 ? (
        <nav
          aria-label="Pagination listing admin"
          className="mt-8 flex items-center justify-between gap-4"
        >
          {result.page > 1 ? (
            <Link
              href={buildHref(status, result.page - 1)}
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Sebelumnya
            </Link>
          ) : (
            <span aria-hidden className="w-24" />
          )}

          <p className="text-xs tabular-nums text-muted">
            Halaman {result.page} dari {result.pageCount}
          </p>

          {result.page < result.pageCount ? (
            <Link
              href={buildHref(status, result.page + 1)}
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Berikutnya
            </Link>
          ) : (
            <span aria-hidden className="w-24" />
          )}
        </nav>
      ) : null}
    </section>
  );
}
