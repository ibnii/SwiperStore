import { expect, test } from "@playwright/test";

test.describe("keamanan dan operasional", () => {
  test("halaman publik mengirim header keamanan", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  test("halaman admin ditandai noindex lewat header", async ({ request }) => {
    const response = await request.get("/admin/login");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("health check melaporkan database siap", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers()["cache-control"]).toBe("no-store");
  });

  test("robots.txt melarang admin dan api", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain("Disallow: /admin");
    expect(body).toContain("Disallow: /api");
  });

  test("halaman 404 memakai Bahasa Indonesia", async ({ page }) => {
    const response = await page.goto("/halaman-yang-tidak-ada");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Halaman tidak ditemukan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kembali ke katalog" }),
    ).toBeVisible();
  });
});
