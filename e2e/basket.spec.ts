import { expect, test, type Page } from "@playwright/test";
import { reset } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const box = (page: Page) => page.getByRole("textbox", { name: "What do you need?" });
const cents = (price: string) => Math.round(Number(price.replace(/[$,]/g, "")) * 100);
const dollars = (amount: number) => `$${(amount / 100).toFixed(2)}`;

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

test("Rose asks for three things, Sam pays for one, and the other goes back to Rose", async ({ page, context }) => {
  await reset(savedPaypal);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Nothing to approve");

  await roseFinds(page, "AA batteries, a night light and a phone charger");
  await expect(heading(page)).toHaveText("Which ones would you like?", { timeout: 20_000 });

  const groups = page.locator(".groups > section");
  await expect(groups).toHaveCount(3);
  for (const price of await page.locator(".listing .option-price").allTextContents()) {
    expect(cents(price)).toBeLessThanOrEqual(5000);
  }

  // Results vary (D24), so the test picks from the first two groups that have listings; the third is left out.
  const picked: { thing: string; cents: number }[] = [];
  for (let index = 0; index < 3 && picked.length < 2; index++) {
    const group = groups.nth(index);
    if ((await group.getByRole("radio").count()) < 2) continue;
    await group.getByRole("radio").first().check();
    picked.push({
      thing: (await group.getByRole("heading", { level: 2 }).textContent()) ?? "",
      cents: cents((await group.locator(".option-price").first().textContent()) ?? ""),
    });
  }
  expect(picked).toHaveLength(2);
  const [kept, leftOut] = picked;

  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  await expect(heading(samPage)).toHaveText("Rose would like 2 things", { timeout: 5000 });
  const ticks = samPage.getByRole("checkbox");
  await expect(ticks).toHaveCount(2);
  await expect(ticks.nth(0)).toBeChecked();
  await expect(ticks.nth(1)).toBeChecked();
  await expect(samPage.getByRole("button", { name: `OK, pay ${dollars(kept.cents + leftOut.cents)}` })).toBeVisible();

  await ticks.nth(1).uncheck();
  await samPage.getByRole("button", { name: `OK, pay ${dollars(kept.cents)}` }).click();

  await expect(heading(samPage)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  await expect(samPage.getByText(`You left out ${leftOut.thing}. Rose can ask for it again.`)).toBeVisible();
  const transaction = await samPage.getByText(/^PayPal transaction /).textContent();
  expect(transaction).toMatch(/^PayPal transaction [A-Z0-9]{17}$/);

  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(page.getByText(transaction!)).toBeVisible();
  await expect(page.locator(".receipt .amount")).toHaveText(dollars(kept.cents));
  await expect(page.getByText(`Sam left out ${leftOut.thing}.`)).toBeVisible();

  await page.getByRole("link", { name: "Ask for something else" }).click();
  await expect(box(page)).toHaveValue(leftOut.thing);
});

test("more than five things asks Rose to pick five", async ({ page }) => {
  await reset(savedPaypal);
  const words = "batteries, a night light, a phone charger, a doormat, a kettle and a flashlight";
  await roseFinds(page, words);

  await expect(page.getByText("Up to 5 things at a time. Which 5 do you need most?")).toBeVisible({ timeout: 20_000 });
  await expect(box(page)).toHaveValue(words);
});
