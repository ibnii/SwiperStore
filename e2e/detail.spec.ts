import { expect, test } from "@playwright/test";

const AVAILABLE_CODE = "SWP-0001";
const SOLD_CODE = "SWP-0002";
const EXACT_MESSAGE =
  "Halo min, saya ingin membeli akun dengan Id SWP-0001";

test("menampilkan detail akun dengan embed YouTube dan CTA WhatsApp", async ({
  page,
}) => {
  await page.goto(`/akun/${AVAILABLE_CODE}`);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Akun PUBG M416 Glacier Sultan",
    }),
  ).toBeVisible();
  await expect(page.getByText("Rp850.000").first()).toBeVisible();

  const iframe = page.locator("iframe");

  await expect(iframe).toHaveAttribute(
    "src",
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/,
  );
  await expect(iframe).toHaveAttribute("loading", "lazy");

  const externalLink = page.getByRole("link", { name: "Buka di YouTube" });

  await expect(externalLink).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  );

  const cta = page.getByTestId("whatsapp-cta");
  const href = await cta.getAttribute("href");

  expect(href).not.toBeNull();

  const url = new URL(href!);

  expect(`${url.origin}${url.pathname}`).toMatch(/^https:\/\/wa\.me\/\d+$/);
  expect(url.searchParams.get("text")).toBe(EXACT_MESSAGE);
  await expect(cta).toHaveText(/Beli via WhatsApp/);
});

test("mengembalikan 404 untuk kode yang tidak dikenal atau tidak valid", async ({
  page,
}) => {
  const unknown = await page.goto("/akun/SWP-9999");

  expect(unknown?.status()).toBe(404);

  const malformed = await page.goto("/akun/bukan-kode");

  expect(malformed?.status()).toBe(404);
});

test("listing terjual menampilkan status dan menonaktifkan CTA tanpa wa.me", async ({
  page,
}) => {
  await page.goto(`/akun/${SOLD_CODE}`);

  await expect(page.getByText(/terjual/i).first()).toBeVisible();
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);

  const disabledCta = page.getByTestId("whatsapp-cta");

  await expect(disabledCta).toBeDisabled();
  await expect(disabledCta).toHaveText(/Sudah terjual/);
});

test.describe("tampilan ponsel", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CTA lengket tetap terlihat saat halaman digulir", async ({ page }) => {
    await page.goto(`/akun/${AVAILABLE_CODE}`);

    const sticky = page.getByTestId("sticky-cta");

    await expect(sticky).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(sticky).toBeVisible();

    expect(
      await sticky.evaluate((element) => getComputedStyle(element).position),
    ).toBe("fixed");
  });
});
