"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  createListingAction,
  updateListingAction,
  type ListingFormState,
} from "@/app/admin/(protected)/listings/actions";

type EditableListing = {
  id: string;
  code: string;
  title: string;
  description: string;
  priceIdr: number;
  videoUrl: string;
  isSold: boolean;
  thumbnailPath: string;
};

type ListingFormProps =
  | { mode: "create"; listing?: undefined }
  | { mode: "edit"; listing: EditableListing };

const inputClasses =
  "mt-2 w-full rounded-lg border border-border bg-elevated px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30 aria-[invalid=true]:border-sold";

const labelClasses = "text-sm font-medium text-foreground";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-2 text-sm text-red-300">
      {message}
    </p>
  );
}

export function ListingForm({ mode, listing }: ListingFormProps) {
  const action =
    mode === "create" ? createListingAction : updateListingAction;
  const [state, formAction, pending] = useActionState<ListingFormState, FormData>(
    action,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (state?.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      summaryRef.current?.focus();
    }
  }, [state]);

  const values = state?.values;
  const title = values?.title ?? listing?.title ?? "";
  const description = values?.description ?? listing?.description ?? "";
  const priceIdr = values?.priceIdr ?? (listing ? String(listing.priceIdr) : "");
  const videoUrl = values?.videoUrl ?? listing?.videoUrl ?? "";
  const isSold = values?.isSold ?? listing?.isSold ?? false;
  const errors = state?.fieldErrors ?? {};
  const imagePreview = preview ?? listing?.thumbnailPath ?? null;
  const errorSummary = [
    { id: "title", label: "Judul akun", message: errors.title },
    { id: "priceIdr", label: "Harga", message: errors.priceIdr },
    { id: "videoUrl", label: "URL video", message: errors.videoUrl },
    { id: "description", label: "Deskripsi", message: errors.description },
    { id: "image", label: "Thumbnail", message: errors.image },
  ].filter((entry) => entry.message);

  return (
    <form
      action={formAction}
      className="mt-8 max-w-3xl space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      {mode === "edit" ? (
        <input type="hidden" name="id" value={listing.id} />
      ) : null}

      {errorSummary.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          aria-labelledby="form-error-title"
          className="rounded-lg border border-sold/40 bg-sold/10 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <p id="form-error-title" className="text-sm font-semibold text-red-200">
            {errorSummary.length} isian perlu diperbaiki.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-200">
            {errorSummary.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="underline underline-offset-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {entry.label}: {entry.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state?.message ? (
        <p
          role="alert"
          className="rounded-lg border border-sold/40 bg-sold/10 px-4 py-3 text-sm text-red-200"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className={labelClasses}>
            Judul akun
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={3}
            maxLength={100}
            defaultValue={title}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={inputClasses}
            placeholder="Contoh: Akun M416 Glacier Rank Conqueror"
          />
          <FieldError id="title-error" message={errors.title} />
        </div>

        <div>
          <label htmlFor="priceIdr" className={labelClasses}>
            Harga (Rp)
          </label>
          <input
            id="priceIdr"
            name="priceIdr"
            type="number"
            required
            min={1}
            max={1_000_000_000}
            step={1}
            inputMode="numeric"
            defaultValue={priceIdr}
            aria-invalid={errors.priceIdr ? true : undefined}
            aria-describedby={
              errors.priceIdr ? "price-error" : "price-hint"
            }
            className={inputClasses}
            placeholder="1500000"
          />
          <p id="price-hint" className="mt-2 text-xs text-muted">
            Tulis angka tanpa titik atau koma. Contoh: 1500000
          </p>
          <FieldError id="price-error" message={errors.priceIdr} />
        </div>

        <div>
          <label htmlFor="videoUrl" className={labelClasses}>
            URL video
          </label>
          <input
            id="videoUrl"
            name="videoUrl"
            type="url"
            required
            maxLength={2048}
            defaultValue={videoUrl}
            aria-invalid={errors.videoUrl ? true : undefined}
            aria-describedby={
              errors.videoUrl ? "video-error" : "video-hint"
            }
            className={inputClasses}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p id="video-hint" className="mt-2 text-xs text-muted">
            YouTube, TikTok, atau Google Drive. Tempel URL lengkap.
          </p>
          <FieldError id="video-error" message={errors.videoUrl} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className={labelClasses}>
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            defaultValue={description}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={
              errors.description ? "description-error" : "description-hint"
            }
            className={inputClasses}
            placeholder="Skin, rank, dan detail penting akun."
          />
          <p id="description-hint" className="mt-2 text-xs text-muted">
            Minimal 10 karakter, maksimal 5.000 karakter.
          </p>
          <FieldError id="description-error" message={errors.description} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="image" className={labelClasses}>
            Thumbnail
          </label>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            {imagePreview ? (
              // Local previews and processed /media files bypass the Next image optimizer.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt={listing ? `Thumbnail ${listing.code}` : "Pratinjau thumbnail"}
                className="h-24 w-36 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-24 w-36 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
                Belum ada gambar
              </div>
            )}

            <div className="flex-1">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required={mode === "create"}
                aria-invalid={errors.image ? true : undefined}
                aria-describedby={
                  errors.image ? "image-error" : "image-hint"
                }
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setPreview(file ? URL.createObjectURL(file) : null);
                }}
                className="block w-full cursor-pointer rounded-lg border border-border bg-elevated px-4 py-3 text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:text-sm file:font-semibold file:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              />
              <p id="image-hint" className="mt-2 text-xs text-muted">
                JPG, PNG, atau WebP. Maksimal 8 MB. Foto iPhone: ekspor sebagai
                JPG.
              </p>
              <FieldError id="image-error" message={errors.image} />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              name="isSold"
              defaultChecked={isSold}
              className="mt-1 size-4 rounded border-border bg-elevated accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            />
            <span>
              Tandai sebagai terjual
              <span className="mt-1 block text-xs text-muted">
                Listing terjual tetap tampil di katalog, tetapi tombol WhatsApp
                dinonaktifkan.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background transition hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Menyimpan..."
            : mode === "create"
              ? "Simpan listing"
              : "Simpan perubahan"}
        </button>
        <Link
          href="/admin"
          className="rounded-lg border border-border px-5 py-3 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
