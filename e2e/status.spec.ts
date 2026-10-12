import { expect, test } from "@playwright/test";

const line = (label: string) => `dt:text-is("${label}") + dd`;

test("status page reports every rail and writes a fresh check on reload", async ({ page }) => {
  const response = await page.goto("/status");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");

  const database = page.locator(line("Database"));
  await expect(database).toHaveText(/^OK, check #\d+ at \d{2}:\d{2} UTC$/);
  await expect(page.locator(line("PayPal sandbox"))).toHaveText("connected");
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  await expect(page.locator(line("Build"))).toHaveText(sha ? sha.slice(0, 7) : "local");

  const sideScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(sideScroll).toBe(false);

  const first = Number((await database.textContent())?.match(/#(\d+)/)?.[1]);
  await page.reload();
  await expect(database).toHaveText(new RegExp(`^OK, check #${first + 1} at `));
});
