import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoEmbed } from "@/components/listing/video-embed";
import { WhatsAppCta } from "@/components/listing/whatsapp-cta";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { env } from "@/lib/env";
import { formatIDR } from "@/lib/format";
import { getPublicListingByCode } from "@/lib/listings/queries";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const listing = await getPublicListingByCode(code);

  if (!listing) {
    return { title: "Akun tidak ditemukan — Swiper Store" };
  }

  const description = listing.description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const image = new URL(listing.thumbnailPath, env.SITE_URL).toString();

  return {
    title: `${listing.code} · ${listing.title} — Swiper Store`,
    description,
    openGraph: {
      title: listing.title,
      description,
      type: "website",
      images: [{ url: image, alt: listing.title }],
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { code } = await params;
  const listing = await getPublicListingByCode(code);

  if (!listing) {
    notFound();
  }

  const whatsappHref = buildWhatsAppUrl(env.WA_NUMBER, listing.code);
  const statusBadge = listing.isSold
    ? "border-sold/50 bg-sold/10 text-red-300"
    : "border-gold/40 bg-gold/10 text-champagne";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main
        id="konten"
        className="mx-auto w-full max-w-6xl flex-1 px-5 pb-32 pt-6 sm:px-8 lg:pb-16"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md text-xs font-semibold uppercase tracking-[0.2em] text-muted transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Kembali ke katalog
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <div className="lg:col-start-1 lg:row-start-1">
            <VideoEmbed code={listing.code} videoUrl={listing.videoUrl} />
          </div>

          <aside className="order-2 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs tracking-wide text-gold">
                {listing.code}
              </p>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusBadge}`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${listing.isSold ? "bg-sold" : "bg-gold"}`}
                />
                {listing.isSold ? "Terjual" : "Tersedia"}
              </span>
            </div>

            <h1 className="mt-4 font-display text-4xl leading-none tracking-wide text-champagne text-balance sm:text-5xl">
              {listing.title}
            </h1>

            <p className="mt-5 font-display text-4xl tracking-wide text-gold tabular-nums">
              {formatIDR(listing.priceIdr)}
            </p>

            <div className="mt-6">
              <WhatsAppCta
                href={whatsappHref}
                isSold={listing.isSold}
                testId="whatsapp-cta"
              />
            </div>

            <p className="mt-3 text-center text-xs leading-relaxed text-muted">
              {listing.isSold
                ? "Akun ini sudah terjual. Hubungi kami untuk akun serupa."
                : "Klik tombol di atas untuk chat admin dan menyelesaikan pembelian."}
            </p>

            <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Kode akun</dt>
                <dd className="font-mono text-foreground">{listing.code}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd className="text-foreground">
                  {listing.isSold ? "Terjual" : "Tersedia"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Pembayaran</dt>
                <dd className="text-foreground">Transfer / e-wallet</dd>
              </div>
            </dl>
          </aside>

          <section className="order-3 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-start-1 lg:row-start-2">
            <h2 className="font-display text-2xl tracking-wide text-champagne">
              Deskripsi
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
              {listing.description}
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />

      <div aria-hidden className="h-24 lg:hidden" />

      <div
        data-testid="sticky-cta"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[0.65rem] text-muted">{listing.code}</p>
            <p className="font-display text-xl tracking-wide text-champagne tabular-nums">
              {formatIDR(listing.priceIdr)}
            </p>
          </div>
          <div className="shrink-0">
            <WhatsAppCta
              href={whatsappHref}
              isSold={listing.isSold}
              testId="sticky-whatsapp-cta"
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}
