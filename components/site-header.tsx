import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-background"
      >
        Lewati ke konten
      </a>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-md font-display text-2xl tracking-[0.18em] text-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Swiper Store
        </Link>
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted">
          Akun premium
        </span>
      </div>
    </header>
  );
}
