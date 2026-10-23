import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main
        id="konten"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-20 sm:px-8"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-gold">404</p>
        <h1 className="mt-4 font-display text-5xl tracking-wide text-champagne sm:text-6xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Alamat yang kamu buka tidak tersedia. Mungkin listing sudah dihapus
          atau tautannya salah.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-gold px-5 py-3 text-sm font-bold text-background transition hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Kembali ke katalog
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
