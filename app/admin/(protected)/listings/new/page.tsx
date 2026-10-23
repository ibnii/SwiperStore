import { ListingForm } from "@/components/admin/listing-form";

export const metadata = {
  title: "Tambah Listing — Swiper Store",
};

export default function NewListingPage() {
  return (
    <section>
      <h1 className="font-display text-5xl tracking-wide text-champagne">
        Tambah Akun
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Kode listing dibuat otomatis oleh sistem setelah listing disimpan.
      </p>

      <ListingForm mode="create" />
    </section>
  );
}
