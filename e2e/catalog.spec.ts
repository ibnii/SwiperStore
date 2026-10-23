import { expect, test, type Page } from "@playwright/test";

const PAGE_SIZE = 12;

function cardPrices(page: Page) {
  return page.getByTestId("listing-card").evaluateAll((cards) =>
    cards.map((card) => {
      const match = card.textContent?.match(/Rp([\d.]+)/);
      return match ? Number(match[1].replaceAll(".", "")) : Number.NaN;
    }),
  );
}

function expectSorted(prices: number[], direction: "asc" | "desc") {
  expect(prices.length).toBeGreaterThan(1);
  expect(prices.some(Number.isNaN)).toBe(false);

  for (let index = 1; index < prices.length; index += 1) {
    if (direction === "asc") {
      expect(prices[index]).toBeGreaterThanOrEqual(prices[index - 1]);
    } else {
      expect(prices[index]).toBeLessThanOrEqual(prices[index - 1]);
    }
  }
}

test("menampilkan 12 kartu per halaman dan mempertahankan urutan saat paginasi", async ({
  page,
}) => {
  await page.goto("/?sort=price_asc");

  const cards = page.getByTestId("listing-card");

  await expect(cards).toHaveCount(PAGE_SIZE);
  expectSorted(await cardPrices(page), "asc");

  const next = page.getByRole("link", { name: /Berikutnya/ });

  await expect(next).toHaveAttribute("href", /sort=price_asc/);
  await expect(next).toHaveAttribute("href", /page=2/);

  await next.click();

  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(page).toHaveURL(/page=2/);
  await expect(cards.first()).toBeVisible();
  expectSorted(await cardPrices(page), "asc");
});

test("mencari judul lewat form GET dan menampilkan empty state", async ({
  page,
}) => {
  await page.goto("/");

  const search = page.getByRole("searchbox", { name: /Cari akun/ });

  await search.fill("Glacier");
  await search.press("Enter");

  await expect(page).toHaveURL(/[?&]q=Glacier/);

  const titles = await page.getByTestId("listing-title").allTextContents();

  expect(titles.length).toBeGreaterThan(0);

  for (const title of titles) {
    expect(title.toLowerCase()).toContain("glacier");
  }

  await page.goto("/?q=akun-tidak-ada-xyz");

  await expect(page.getByTestId("listing-card")).toHaveCount(0);
  await expect(
    page.getByText("Tidak ada akun yang cocok dengan pencarianmu."),
  ).toBeVisible();
});

test("memfilter akun tersedia dan terjual", async ({ page }) => {
  await page.goto("/?status=sold");

  const soldCards = page.getByTestId("listing-card");
  const soldCount = await soldCards.count();

  expect(soldCount).toBeGreaterThan(0);
  await expect(page.getByTestId("sold-overlay")).toHaveCount(soldCount);

  await page.goto("/?status=available");

  const availableCards = page.getByTestId("listing-card");

  await expect(availableCards.first()).toBeVisible();
  await expect(page.getByTestId("sold-overlay")).toHaveCount(0);
});

test("mengurutkan harga menaik dan menurun, default sama dengan terbaru", async ({
  page,
}) => {
  await page.goto("/?sort=price_asc");
  expectSorted(await cardPrices(page), "asc");

  await page.goto("/?sort=price_desc");
  expectSorted(await cardPrices(page), "desc");

  const defaultFirst = await page
    .goto("/")
    .then(() => page.getByTestId("listing-card").first().textContent());
  const newestFirst = await page
    .goto("/?sort=newest")
    .then(() => page.getByTestId("listing-card").first().textContent());

  expect(newestFirst).toBe(defaultFirst);
});

test("meng-clamp nomor halaman yang di luar jangkauan", async ({ page }) => {
  await page.goto("/?page=999");

  await expect(page.getByTestId("listing-card").first()).toBeVisible();
  await expect(page.getByText(/Halaman \d+ dari \d+/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Berikutnya/ })).toHaveCount(0);
});

test("katalog tetap berfungsi tanpa JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByRole("searchbox", { name: /Cari akun/ }).fill("Glacier");
  await page.getByRole("button", { name: "Cari" }).click();

  await expect(page).toHaveURL(/[?&]q=Glacier/);
  await expect(page.getByTestId("listing-card").first()).toBeVisible();

  const titles = await page.getByTestId("listing-title").allTextContents();

  expect(titles.length).toBeGreaterThan(0);

  for (const title of titles) {
    expect(title.toLowerCase()).toContain("glacier");
  }

  await context.close();
});
