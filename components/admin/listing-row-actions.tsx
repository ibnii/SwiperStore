import Link from "next/link";
import { setListingSoldAction } from "@/app/admin/(protected)/listings/actions";
import { DeleteListingButton } from "./delete-listing-button";

export function ListingRowActions({
  id,
  code,
  isSold,
}: {
  id: string;
  code: string;
  isSold: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/listings/${id}/edit`}
        className="inline-flex min-h-11 items-center rounded-lg border border-gold/50 px-3 py-2 text-xs font-semibold text-gold transition hover:border-gold hover:bg-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Ubah
      </Link>

      <form action={setListingSoldAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="sold" value={String(!isSold)} />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-champagne hover:text-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {isSold ? "Tandai tersedia" : "Tandai terjual"}
        </button>
      </form>

      <DeleteListingButton id={id} code={code} />
    </div>
  );
}
