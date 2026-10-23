import { expect, test, type Page } from "@playwright/test";
import { listing, reset, sql } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

// Rose's search is seeded with the canes a real Find showed over a $20 limit, so what Channel3 and Haiku
// answer today can't change the walk.
const words = "a walking stick that stands up by itself";
const canes = [
  listing("prod_9Fp4cN", "Four Point Cane", 2024, "lowes.com"),
  listing("prod_2Sq8aQ", "Small Base Aluminum Quad Cane", 2389, "staples.com"),
  listing("prod_6Wq3sB", "Walgreens Quad Cane Small Base", 2499, "walgreens.com"),
];

test.beforeAll(() => {
  expect(rose && sam && savedPaypal, "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN and PAYPAL_E2E_VAULT_ID").toBeTruthy();
});

test("Rose asks for a cane over Sam's $20 limit, and Sam's OK pays it", async ({ page, context }) => {
  await reset(savedPaypal, { words, outcome: "over limit", options: canes });
  await sql("INSERT INTO price_limit (id, cents) VALUES (1, 2000)");

  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("Which one would you like?");
  await expect(
    page.getByText("Nothing under $20 for that. These cost a little more, and Sam sees the price before saying OK."),
  ).toBeVisible();
  await expect(page.getByText(/ over Sam's \$20 limit\.$/)).toHaveCount(3);
  const cane = page.locator(".option", { hasText: "Small Base Aluminum Quad Cane" });
  await expect(cane.getByText("$3.89 over Sam's $20 limit.")).toBeVisible();
  await cane.getByRole("radio").check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Rose would like this");
  await expect(samPage.getByText("This is $3.89 over your $20 limit.")).toBeVisible();
  await samPage.getByRole("button", { name: "OK, pay $23.89" }).click();

  await expect(heading(samPage)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  await expect(samPage.locator(".amount")).toHaveText("$23.89");
  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(page.locator(".amount")).toHaveText("$23.89");
  expect(await sql("SELECT item_name, amount_cents, status FROM purchase_requests")).toEqual([
    { item_name: "Small Base Aluminum Quad Cane", amount_cents: 2389, status: "paid" },
  ]);
});
