import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logout } from "./actions";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-background"
      >
        Lewati ke konten
      </a>

      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 font-display text-2xl tracking-wide text-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <span>Swiper Store</span>
            <span className="text-gold">Admin</span>
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main id="konten" className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}
