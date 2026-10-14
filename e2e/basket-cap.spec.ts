import { expect, test, type Page } from "@playwright/test";
import type { Group, Option } from "../lib/shop/find";
import { reset, sql } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

const listing = (id: string, name: string, cents: number, shop: string): Option => ({
  id,
  name,
  cents,
  shop,
  url: `https://www.${shop}/`,
  what: `${name}.`,
  why: "It is what Rose asked for.",
  watch: "Check the pack before you buy.",
});

// Rose's search is seeded with fixed prices, so the picks land over $40 and back under it every time.
const words = "AA batteries, a night light and a phone charger";
const groups: Group[] = [
  {
    thing: "AA batteries",
    options: [listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com")],
  },
  {
    thing: "a night light",
    options: [listing("prod_6Nl2tL", "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack", 1249, "target.com")],
  },
  {
    thing: "a phone charger",
    options: [listing("prod_7Bk2wC", "Belkin 25W USB-C Wall Charger with 6 ft Cable", 2499, "bestbuy.com")],
  },
];

test.beforeAll(() => {
  expect(rose && sam && savedPaypal, "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN and PAYPAL_E2E_VAULT_ID").toBeTruthy();
});

test("Rose's picks over Sam's total limit are stopped, and leaving one out reaches Sam", async ({ page, context }) => {
  await reset(savedPaypal, { words, groups });
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  const total = samPage.getByRole("textbox", { name: "Total limit" });
  await total.fill("40");
  await samPage.locator("form", { has: total }).getByRole("button", { name: "Save" }).click();
  await expect(samPage.getByText("Saved. Rose can ask for up to $40 at once.")).toBeVisible();

  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("Which ones would you like?");
  await expect(page.getByText("Sam's limit is $40 in all.")).toBeVisible();

  // The page comes back scrolled to the top after Ask Sam, so what Rose must read has to be there.
  const askSam = page.getByRole("button", { name: "Ask Sam" });
  await askSam.click();
  await expect(page.getByText("Pick at least one first.")).toBeInViewport();

  const picks = [0, 1, 2].map((index) => page.locator(".groups > section").nth(index).getByRole("radio").first());
  for (const pick of picks) await pick.check();
  await askSam.click();
  await expect(page.getByText("That comes to $47.47. Sam's limit is $40 in all. Leave something out.")).toBeInViewport();
  for (const pick of picks) await expect(pick).toBeChecked();
  expect(await sql("SELECT id FROM purchase_requests")).toEqual([]);

  await page.locator(".groups > section").nth(1).getByRole("radio", { name: "None of these" }).check();
  await askSam.click();
  await expect(heading(page)).toHaveText("Waiting for Sam");
  await expect(heading(samPage)).toHaveText("Rose would like 2 things", { timeout: 5000 });
  await expect(samPage.getByRole("button", { name: "OK, pay $34.98" })).toBeVisible();
});
