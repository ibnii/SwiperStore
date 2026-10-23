"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="konten"
      className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-20 sm:px-8"
    >
      <Link
        href="/"
        className="inline-flex min-h-11 items-center font-display text-xl tracking-[0.18em] text-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        Swiper Store
      </Link>

      <p className="mt-12 font-mono text-xs tracking-[0.3em] text-gold">
        KESALAHAN
      </p>
      <h1 className="mt-4 font-display text-5xl tracking-wide text-champagne sm:text-6xl">
        Terjadi kesalahan
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        Halaman ini gagal dimuat. Coba lagi sebentar lagi. Jika masih berulang,
        hubungi admin lewat WhatsApp.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background transition hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 py-3 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Kembali ke katalog
        </Link>
      </div>
    </main>
  );
}
