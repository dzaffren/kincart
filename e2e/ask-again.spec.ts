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

test("Rose asks again for the AA batteries Sam paid for, and sees the same pack first", async ({ page, context }) => {
  // A Find and an Ask again each wait on Haiku and Channel3 for real (D24), up to 30 s each.
  test.setTimeout(90_000);
  await reset(savedPaypal);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Nothing to approve");

  await page.goto(`/r/${rose}`);
  await page.getByRole("textbox", { name: "What do you need?" }).fill("AA batteries");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(heading(page)).toHaveText("Which one would you like?", { timeout: 20_000 });
  const name = (await page.locator(".listing-name").first().textContent())!;
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  await expect(heading(samPage)).toHaveText("Rose would like this", { timeout: 5000 });
  await samPage.getByRole("button", { name: /^OK, pay / }).click();
  await expect(heading(samPage)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });

  await page.getByRole("link", { name: "Ask for something else" }).click();
  const bought = page.getByRole("region", { name: "Bought before" });
  // Haiku's sentences can name the listing too, so only its own exact name counts.
  await expect(bought.getByText(name, { exact: true })).toBeVisible();
  await bought.getByRole("button", { name: "Ask again" }).click();

  await expect(heading(page)).toHaveText("Which one would you like?", { timeout: 30_000 });
  await expect(page.getByText(/\. Today's prices for what you bought before\./)).toBeVisible();
  const first = page.locator(".option").first();
  await expect(first.locator(".listing-name")).toHaveText(name);
  await expect(first.getByRole("radio")).toBeChecked();
  await expect(first.getByText("You bought this last time.")).toBeVisible();

  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");
  await expect(heading(samPage)).toHaveText("Rose would like this", { timeout: 5000 });
});
