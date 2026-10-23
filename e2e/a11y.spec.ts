import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    // Third-party player markup inside the iframe is not ours to fix.
    .exclude("iframe")
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22aa",
    ])
    .analyze();

  return results.violations
    .filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    )
    .map((violation) => ({
      id: violation.id,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

for (const path of ["/", "/akun/SWP-0001", "/akun/SWP-0002"]) {
  test(`tidak ada pelanggaran aksesibilitas serius di ${path}`, async ({
    page,
  }) => {
    await page.goto(path);

    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("login admin tidak punya pelanggaran aksesibilitas serius", async ({
  page,
}) => {
  await page.goto("/admin/login");

  expect(await seriousViolations(page)).toEqual([]);
});

test("dashboard dan form admin tidak punya pelanggaran serius", async ({
  page,
}) => {
  test.skip(
    !adminEmail || !adminPassword,
    "Set ADMIN_EMAIL and E2E_ADMIN_PASSWORD in .env.local to run admin a11y tests.",
  );

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(adminEmail!);
  await page.getByLabel("Password").fill(adminPassword!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  expect(await seriousViolations(page)).toEqual([]);

  await page.goto("/admin/listings/new");
  expect(await seriousViolations(page)).toEqual([]);
});
