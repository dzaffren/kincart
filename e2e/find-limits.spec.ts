import { expect, test, type Browser, type Page } from "@playwright/test";
import { reset, sql, usedFrom } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const box = (page: Page) => page.getByRole("textbox", { name: "What do you need?" });

// A page whose requests Vercel would say came from this address.
const from = (browser: Browser, address: string) =>
  browser.newPage({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { "x-forwarded-for": address } });

async function roseFinds(page: Page, words: string) {
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("What do you need?");
  await box(page).fill(words);
  await page.getByRole("button", { name: "Find" }).click();
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  expect(
    rose && savedPaypal && process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY && process.env.ADDRESS_KEY,
    "set ROSE_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, ANTHROPIC_API_KEY, CHANNEL3_API_KEY and ADDRESS_KEY",
  ).toBeTruthy();
});

test("judges on one network get results, and an address with 20 Finds today waits for its oldest", async ({ browser }) => {
  await reset(savedPaypal);
  const office = await from(browser, "203.0.113.7");
  await usedFrom("203.0.113.7", "find", 12, 2);

  await roseFinds(office, "batteries for the clock and a night light");
  await expect(heading(office)).toHaveText("Which ones would you like?", { timeout: 30_000 });
  await expect(office.locator(".groups > section")).toHaveCount(2);

  await usedFrom("203.0.113.7", "find", 20, 21);
  await office.getByRole("button", { name: "Try other words" }).click();
  await roseFinds(office, "a night light");
  await expect(office.getByText("That's a lot of Finds from here today. Try again in 3 hours.")).toBeVisible();
  await expect(heading(office)).toHaveText("What do you need?");
  await expect(box(office)).toHaveValue("a night light");
  expect(await sql("SELECT cardinality(used_at) AS n FROM address_uses WHERE kind = 'find'")).toEqual([{ n: 20 }]);

  // Rose's words wait in the box, so this Find from another address starts from the same screen.
  const home = await from(browser, "198.51.100.24");
  await roseFinds(home, "a night light");
  await expect(heading(home)).toHaveText("Which one would you like?", { timeout: 30_000 });

  // Once the oldest Find is a day old, the notice goes. requests.test.ts checks that its place is free again.
  await home.getByRole("button", { name: "Try other words" }).click();
  await expect(heading(home)).toHaveText("What do you need?");
  await office.goto(`/r/${rose}?find=limit&until=${Date.now() - 1000}`);
  await expect(heading(office)).toHaveText("What do you need?");
  await expect(office.getByText("That's a lot of Finds from here today.")).toHaveCount(0);
});

test("an address that started 5 households today starts no more, and keeps its own", async ({ browser }) => {
  await reset(savedPaypal);
  const home = await from(browser, "203.0.113.7");
  await home.goto("/");
  await home.getByRole("button", { name: "Try KinCart" }).click();
  await expect(home.getByText("Your Rose and Sam are ready.")).toBeVisible();
  const own = await home.getByRole("link", { name: "Be Rose" }).getAttribute("href");
  const [{ count }] = await sql("SELECT count(*) FROM households");

  await usedFrom("203.0.113.7", "household", 5, 19);
  await home.getByRole("button", { name: "Start a new one" }).click();

  await expect(
    home.getByText(
      "That's a lot of new Roses and Sams from here today. Try again in 5 hours. Your Rose and Sam still work.",
    ),
  ).toBeVisible();
  expect(await sql("SELECT count(*) FROM households")).toEqual([{ count }]);
  await expect(home.getByRole("link", { name: "Be Rose" })).toHaveAttribute("href", own!);
});
