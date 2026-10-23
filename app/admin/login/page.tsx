import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Masuk Admin | Swiper Store",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await getAdminSession()) {
    redirect("/admin");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.14),transparent_55%)]"
      />

      <section className="relative w-full max-w-sm rounded-2xl border border-border bg-surface/95 p-8 shadow-2xl shadow-black/40">
        <p className="font-display text-2xl tracking-[0.2em] text-champagne">
          SWIPER <span className="text-gold">STORE</span>
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-wide text-champagne">
          Admin Panel
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Masuk untuk mengelola katalog akun.
        </p>

        <LoginForm />

        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center text-sm text-muted transition hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Kembali ke katalog
        </Link>
      </section>
    </main>
  );
}
