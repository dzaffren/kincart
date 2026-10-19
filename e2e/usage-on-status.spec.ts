import { expect, test, type Browser, type Page } from "@playwright/test";
import { reset, usageToday, usedFrom } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const box = (page: Page) => page.getByRole("textbox", { name: "What do you need?" });
// A count line's two lines on /status: today, then this month.
const count = (page: Page, label: string) => page.locator(`dt:text-is("${label}") + dd span`);

// A page whose requests Vercel would say came from this address.
const from = (browser: Browser, address: string) =>
  browser.newPage({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "x-forwarded-for": address } });

async function roseFinds(page: Page, words: string) {
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("What do you need?");
  await box(page).fill(words);
  await page.getByRole("button", { name: "Find" }).click();
}

test.beforeAll(() => {
  expect(
    rose && savedPaypal && process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY && process.env.ADDRESS_KEY,
    "set ROSE_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, ANTHROPIC_API_KEY, CHANNEL3_API_KEY and ADDRESS_KEY",
  ).toBeTruthy();
});

test("/status counts each Find, its searches and each stop, and turns the month's searches red at 800", async ({
  browser,
  page,
}) => {
  await reset(savedPaypal);
  await usageToday(38, 798, 4, 1);

  await page.goto("/status");
  await expect(count(page, "Finds")).toHaveText(["38 today", "38 this month"]);
  const searches = count(page, "Channel3 searches");
  await expect(searches).toHaveText(["798 today", "798 of 1,000 this month"]);
  await expect(searches.nth(1)).not.toHaveClass("fail");

  // "a night light" is one thing, so this Find sends 2 searches.
  const home = await from(browser, "198.51.100.24");
  await roseFinds(home, "a night light");
  await expect(heading(home)).toHaveText("Which one would you like?", { timeout: 30_000 });

  await page.reload();
  await expect(count(page, "Finds")).toHaveText(["39 today", "39 this month"]);
  await expect(searches).toHaveText(["800 today", "800 of 1,000 this month"]);
  await expect(searches.nth(1)).toHaveClass("fail");

  await usedFrom("203.0.113.7", "find", 20, 21);
  const office = await from(browser, "203.0.113.7");
  await home.getByRole("button", { name: "Try other words" }).click();
  await expect(heading(home)).toHaveText("What do you need?");
  await roseFinds(office, "a night light");
  await expect(office.getByText("That's a lot of Finds from here today. Try again in 3 hours.")).toBeVisible();

  await page.reload();
  await expect(count(page, "Stopped Finds")).toHaveText(["5 today", "5 this month"]);
  await expect(count(page, "Finds")).toHaveText(["39 today", "39 this month"]);
  await expect(searches).toHaveText(["800 today", "800 of 1,000 this month"]);

  await usedFrom("203.0.113.7", "household", 5, 19);
  await office.goto("/");
  await office.getByRole("button", { name: "Try KinCart" }).click();
  await expect(office.getByText("That's a lot of new Roses and Sams from here today. Try again in 5 hours.")).toBeVisible();

  await page.reload();
  await expect(count(page, "Stopped Try KinCarts")).toHaveText(["2 today", "2 this month"]);
});
