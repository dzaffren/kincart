import { expect, test, type Page } from "@playwright/test";
import { reset } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const box = (page: Page) => page.getByRole("textbox", { name: "What do you need?" });

async function roseFinds(page: Page, words: string) {
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("What do you need?");
  await box(page).fill(words);
  await page.getByRole("button", { name: "Find" }).click();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  expect(
    rose && sam && savedPaypal && process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY,
    "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, ANTHROPIC_API_KEY and CHANNEL3_API_KEY",
  ).toBeTruthy();
});

test("Rose finds slippers, Sam checks the listing and pays", async ({ page, context }) => {
  await reset(savedPaypal);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Nothing to approve");
  await expect(samPage.getByRole("textbox", { name: "Price limit" })).toHaveValue("50");

  await roseFinds(page, "warm slippers that are easy to put on, size 8");
  await expect(heading(page)).toHaveText("Which one would you like?", { timeout: 20_000 });

  const options = page.getByRole("radio");
  const count = await options.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);
  for (const price of await page.locator(".listing .option-price").allTextContents()) {
    expect(Number(price.replace(/[$,]/g, ""))).toBeLessThanOrEqual(50);
  }
  await expect(page.getByText("Good to know:")).toHaveCount(count);

  await options.first().check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  await expect(heading(samPage)).toHaveText("Rose would like this", { timeout: 5000 });
  await expect(samPage.getByText(/^Why it fits:/)).toBeVisible();
  await expect(samPage.getByRole("link", { name: /^See it on / })).toHaveAttribute("href", /^https:\/\//);
  await samPage.getByRole("button", { name: /^OK, pay \$/ }).click();

  await expect(heading(samPage)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  const transaction = await samPage.getByText(/^PayPal transaction /).textContent();
  expect(transaction).toMatch(/^PayPal transaction [A-Z0-9]{17}$/);
  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(page.getByText(transaction!)).toBeVisible();
});

test("Sam sets the price limit, and Rose's page shows it", async ({ page }) => {
  await reset(savedPaypal);
  await page.goto(`/h/${sam}`);
  const limit = page.getByRole("textbox", { name: "Price limit" });

  await limit.fill("3");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Pick a whole-dollar amount from $5 to $500.")).toBeVisible();

  await limit.fill("30");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved. Rose's next search stays at $30 or less.")).toBeVisible();

  await page.goto(`/r/${rose}`);
  await expect(page.getByText("Sam's limit is $30 an item.")).toBeVisible();
});
