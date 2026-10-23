import { notFound } from "next/navigation";
import { ListingForm } from "@/components/admin/listing-form";
import { getAdminListing } from "@/lib/listings/admin-queries";

export const metadata = {
  title: "Ubah Listing — Swiper Store",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const listing = await getAdminListing(id);

  if (!listing) {
    notFound();
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-5xl tracking-wide text-champagne">
          Ubah Akun
        </h1>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-xs text-champagne">
          {listing.code}
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Perbarui detail akun. Biarkan thumbnail kosong jika tidak ingin
        menggantinya.
      </p>

      <ListingForm mode="edit" listing={listing} />
    </section>
  );
}
