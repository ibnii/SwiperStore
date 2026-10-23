"use client";

import { useRef } from "react";
import { deleteListingAction } from "@/app/admin/(protected)/listings/actions";

export function DeleteListingButton({
  id,
  code,
}: {
  id: string;
  code: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `delete-title-${id}`;
  const descriptionId = `delete-desc-${id}`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-sold hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Hapus
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-6 text-foreground shadow-2xl backdrop:bg-black/70"
      >
        <h2 id={titleId} className="font-display text-2xl tracking-wide text-champagne">
          Hapus {code}?
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-muted">
          Listing ini akan dihapus permanen dari katalog. Thumbnail dipindahkan
          ke folder trash selama 7 hari.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            Batal
          </button>
          <form action={deleteListingAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-sold px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Ya, hapus
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
