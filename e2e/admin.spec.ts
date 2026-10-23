import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const thumbnailPath = path.resolve("test-results/e2e-thumbnail.png");

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.skip(
  !adminEmail || !adminPassword,
  "Set ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.local to run admin E2E tests.",
);

test.beforeAll(async () => {
  await mkdir(path.dirname(thumbnailPath), { recursive: true });
  await writeFile(thumbnailPath, ONE_PIXEL_PNG);
});

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function fillListingForm(
  page: Page,
  values: { title: string; price: string; videoUrl: string },
) {
  await page.getByLabel("Judul akun").fill(values.title);
  await page.getByLabel("Harga (Rp)").fill(values.price);
  await page.getByLabel("URL video").fill(values.videoUrl);
  await page
    .getByLabel("Deskripsi")
    .fill("Akun uji E2E untuk memverifikasi alur admin secara menyeluruh.");
}

test("admin can create, update, toggle, and delete a listing", async ({
  page,
}) => {
  await login(page);

  const title = `E2E Akun ${Date.now()}`;

  await page.goto("/admin/listings/new");
  await fillListingForm(page, {
    title,
    price: "1234567",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
  });
  await page.locator('input[name="image"]').setInputFiles(thumbnailPath);
  await page.getByRole("button", { name: "Simpan listing" }).click();

  await expect(page).toHaveURL(/\/admin\?created=SWP-\d{4,}$/);
  const code = new URL(page.url()).searchParams.get("created")!;

  await expect(
    page.getByRole("status").filter({ hasText: code }),
  ).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: code });

  await expect(row).toContainText(title);
  await expect(row).toContainText("Rp1.234.567");
  await expect(row).toContainText("Tersedia");

  await row.getByRole("link", { name: "Ubah" }).click();
  await expect(page).toHaveURL(/\/admin\/listings\/[0-9a-f-]+\/edit$/);

  const updatedTitle = `${title} Diperbarui`;

  await page.getByLabel("Judul akun").fill(updatedTitle);
  await page.getByRole("checkbox", { name: /Tandai sebagai terjual/ }).check();
  await page.getByRole("button", { name: "Simpan perubahan" }).click();

  await expect(page).toHaveURL(/\/admin\?updated=SWP-\d{4,}$/);

  const updatedRow = page.getByRole("row").filter({ hasText: code });

  await expect(updatedRow).toContainText(updatedTitle);
  await expect(updatedRow).toContainText("Terjual");

  await updatedRow.getByRole("button", { name: "Tandai tersedia" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("row").filter({ hasText: code })).toContainText(
    "Tersedia",
  );

  const deletableRow = page.getByRole("row").filter({ hasText: code });
  const deleteButton = deletableRow.getByRole("button", { name: "Hapus" });
  const deleteDialog = page.getByRole("dialog");

  // The dialog opens from client-side state, so retry until hydration attaches it.
  await expect(async () => {
    await deleteButton.click();
    await expect(deleteDialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });

  await expect(
    deleteDialog.getByRole("heading", {
      name: `Hapus ${code}?`,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ya, hapus" }).click();

  await expect(page).toHaveURL(/\/admin\?deleted=1$/);
  await expect(
    page.getByRole("status").filter({ hasText: "berhasil dihapus" }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: code })).toHaveCount(0);
});

test("shows an Indonesian error for a video URL that is not allowed", async ({
  page,
}) => {
  await login(page);

  await page.goto("/admin/listings/new");
  await fillListingForm(page, {
    title: `E2E Validasi ${Date.now()}`,
    price: "500000",
    videoUrl: "https://example.com/video",
  });
  await page.locator('input[name="image"]').setInputFiles(thumbnailPath);
  await page.getByRole("button", { name: "Simpan listing" }).click();

  await expect(
    page.getByRole("alert").filter({
      hasText:
        "Gunakan URL lengkap YouTube, TikTok, atau Google Drive yang valid.",
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/listings\/new$/);

  const summary = page
    .getByRole("alert")
    .filter({ hasText: "isian perlu diperbaiki" });
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();

  await summary.getByRole("link", { name: /URL video/ }).click();
  await expect(page.locator("#videoUrl")).toBeFocused();
});
