import { expect, test, type Page } from "@playwright/test";
import { reset } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test.beforeAll(() => {
  expect(
    rose && sam && savedPaypal && process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY,
    "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, ANTHROPIC_API_KEY and CHANNEL3_API_KEY",
  ).toBeTruthy();
});

test("Sam says no to Rose's slippers, and Sam's Find another gets Rose others", async ({ page, context }) => {
  // A Find and a Find another each wait on Haiku and Channel3 for real (D24), up to 30 s each.
  test.setTimeout(90_000);
  await reset(savedPaypal);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Nothing to approve");

  await page.goto(`/r/${rose}`);
  await page.getByRole("textbox", { name: "What do you need?" }).fill("warm slippers that are easy to put on, size 8");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(heading(page)).toHaveText("Which one would you like?", { timeout: 20_000 });
  const name = (await page.locator(".listing-name").first().textContent())!;
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  await expect(heading(samPage)).toHaveText("Rose would like this", { timeout: 5000 });
  await samPage.getByRole("button", { name: "No" }).click();
  await expect(samPage.getByText("KinCart looks again for Rose, without the one you said no to.", { exact: false })).toBeVisible();
  await samPage.getByRole("button", { name: "Find another" }).click();

  await expect(samPage.getByText("KinCart found new options for Rose. Rose picks one and asks you.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(samPage.getByRole("button", { name: "Find another" })).toHaveCount(0);

  await expect(heading(page)).toHaveText("Which one would you like?", { timeout: 5000 });
  await expect(page.getByText(/\. Sam asked KinCart to look again with other words\./)).toBeVisible();
  const count = await page.getByRole("radio").count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);
  // Haiku's sentences can name the refused listing too, so only a listing's own exact name counts.
  await expect(page.locator(".listing-name").getByText(name, { exact: true })).toHaveCount(0);

  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");
  await expect(heading(samPage)).toHaveText("Rose would like this", { timeout: 5000 });
});
