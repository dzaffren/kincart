import { expect, test, type Page } from "@playwright/test";
import type { Group } from "../lib/shop/find";
import { listing, reset, sql } from "./db";
import { paypalOrder } from "./paypal";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const payee = "Paid to KinCart's sandbox shop. In this demo, no order reaches the shops.";

async function paidOrder() {
  const [{ paypal_order_id }] = await sql("SELECT paypal_order_id FROM purchase_requests WHERE status = 'paid'");
  const [unit] = (await paypalOrder(paypal_order_id)).purchase_units;
  return {
    items: unit.items.map(({ name, quantity, unit_amount }) => [name, unit_amount.value, quantity]),
    amount: unit.amount.value,
    itemTotal: unit.amount.breakdown.item_total.value,
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  expect(
    rose && sam && savedPaypal && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET,
    "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET",
  ).toBeTruthy();
});

test("Sam pays two of three things, and PayPal's order lists the two", async ({ page, context }) => {
  // Rose's search is seeded, so the names and prices PayPal gets are known.
  const groups: Group[] = [
    { thing: "AA batteries", options: [listing("prod_8Ee4aA", "Energizer MAX AA Batteries, 8 Pack", 947, "walmart.com")] },
    {
      thing: "a night light",
      options: [listing("prod_2Ln9nL", "LED Plug-in Night Light, Dusk to Dawn Sensor, 2 Pack", 1299, "amazon.com")],
    },
    { thing: "a phone charger", options: [listing("prod_5Ch3wC", "Anker 20W USB-C Wall Charger", 1499, "target.com")] },
  ];
  await reset(savedPaypal, { words: "AA batteries, a night light and a phone charger", groups });

  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("Which ones would you like?");
  for (const index of [0, 1, 2]) await page.locator(".groups > section").nth(index).getByRole("radio").first().check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Rose would like 3 things");
  await samPage.getByRole("checkbox", { name: /Anker 20W USB-C Wall Charger/ }).uncheck();
  await samPage.getByRole("button", { name: "OK, pay $22.46" }).click();

  await expect(heading(samPage)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  await expect(samPage.getByText(payee)).toBeVisible();
  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(page.getByText(payee)).toBeVisible();

  expect(await paidOrder()).toEqual({
    items: [
      ["Energizer MAX AA Batteries, 8 Pack", "9.47", "1"],
      ["LED Plug-in Night Light, Dusk to Dawn Sensor, 2 Pack", "12.99", "1"],
    ],
    amount: "22.46",
    itemTotal: "22.46",
  });
});

test("a one-thing ask sends its one thing, and PayPal cuts a long name", async ({ page, context }) => {
  const name =
    "Weekly Pill Organizer 2 Times a Day, Large AM PM Pill Box with 14 Compartments, Easy Open Push Button Design for Arthritis Hands, BPA Free, Rainbow Colors, 1 Pk";
  expect(name).toHaveLength(160);
  await reset(savedPaypal, { words: "a pill box", options: [listing("prod_9Pb1oX", name, 899, "amazon.com")] });

  await page.goto(`/r/${rose}`);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Rose would like this");
  await samPage.getByRole("button", { name: "OK, pay $8.99" }).click();
  await expect(heading(samPage)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });

  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(page.locator(".receipt").getByText(name, { exact: true })).toBeVisible();
  await expect(page.getByText(payee)).toBeVisible();

  expect(await paidOrder()).toEqual({
    items: [[`${name.slice(0, 124)}...`, "8.99", "1"]],
    amount: "8.99",
    itemTotal: "8.99",
  });
});
