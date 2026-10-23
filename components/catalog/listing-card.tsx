import Link from "next/link";
import { formatIDR } from "@/lib/format";
import type { PublicListingCard } from "@/lib/listings/types";

type ListingCardProps = {
  listing: PublicListingCard;
};

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <article
      data-testid="listing-card"
      className="group overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-gold/60 focus-within:border-gold/60"
    >
      <Link
        href={`/akun/${listing.code}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-elevated">
          {/* Thumbnails are pre-optimized WebP files served by the media route. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.thumbnailPath}
            alt=""
            loading="lazy"
            className={`size-full object-cover transition duration-300 motion-safe:group-hover:scale-[1.03] ${
              listing.isSold ? "opacity-50 grayscale" : ""
            }`}
          />
          {listing.isSold ? (
            <span
              data-testid="sold-overlay"
              className="absolute right-3 top-3 rounded-md bg-sold px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white shadow-lg"
            >
              Terjual
            </span>
          ) : null}
        </div>

        <div className="p-4 sm:p-5">
          <p className="font-mono text-xs tracking-wide text-gold">
            {listing.code}
          </p>
          <h2
            data-testid="listing-title"
            className="mt-2 line-clamp-2 min-h-11 font-medium leading-snug text-foreground"
          >
            {listing.title}
          </h2>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="font-display text-2xl tracking-wide text-champagne tabular-nums">
              {formatIDR(listing.priceIdr)}
            </p>
            <span className="text-xs font-semibold text-muted transition group-hover:text-gold">
              Lihat detail
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
