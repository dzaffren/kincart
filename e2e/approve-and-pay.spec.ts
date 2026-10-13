import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

async function sql(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows;
  } finally {
    await client.end();
  }
}

async function reset(paypal: string | null) {
  await sql("TRUNCATE purchase_requests");
  await sql("DELETE FROM paypal_vault");
  if (paypal) await sql("INSERT INTO paypal_vault (payment_token) VALUES ($1)", [paypal]);
}

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

async function roseAsksFor(page: Page, item: RegExp) {
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("What would you like?");
  await page.getByRole("radio", { name: item }).check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  expect(rose && sam && savedPaypal, "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN and PAYPAL_E2E_VAULT_ID").toBeTruthy();
});

test("Rose asks, Sam says OK, both see one receipt", async ({ page, context }) => {
  await reset(savedPaypal);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Nothing to approve");

  await page.goto(`/r/${rose}`);
  await expect(page.getByText("PayPal linked.")).toBeVisible();
  const glasses = page.getByRole("radio", { name: /Reading glasses, \+2\.00/ });
  await glasses.check();
  await page.waitForTimeout(4000);
  await expect(glasses).toBeChecked();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  await expect(heading(samPage)).toHaveText("Rose would like Reading glasses, +2.00", { timeout: 5000 });
  const secondTab = await context.newPage();
  await secondTab.goto(`/h/${sam}`);
  const ok = (tab: Page) => tab.getByRole("button", { name: "OK, pay $18.99" });
  await Promise.all([ok(samPage).click(), ok(secondTab).click()]);

  for (const tab of [samPage, secondTab]) {
    await expect(heading(tab)).toHaveText("Paid from Rose's PayPal", { timeout: 15000 });
  }
  const transaction = await samPage.getByText(/^PayPal transaction /).textContent();
  expect(transaction).toMatch(/^PayPal transaction [A-Z0-9]{17}$/);
  await expect(secondTab.getByText(transaction!)).toBeVisible();

  await expect(heading(page)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(page.getByText("$18.99")).toBeVisible();
  await expect(page.getByText(transaction!)).toBeVisible();

  const rows = await sql("SELECT status, paypal_capture_id FROM purchase_requests");
  expect(rows).toEqual([{ status: "paid", paypal_capture_id: transaction!.replace("PayPal transaction ", "") }]);
});

test("Sam says no and nothing is charged", async ({ page, context }) => {
  await reset(savedPaypal);
  await page.goto(`/r/${rose}`);
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(page.getByText("Pick one of the three first.")).toBeVisible();

  await roseAsksFor(page, /AA batteries, pack of 8/);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await samPage.getByRole("button", { name: "No" }).click();

  await expect(heading(samPage)).toHaveText("Nothing to approve");
  await expect(samPage.getByText("You said no to AA batteries, pack of 8. Rose can see that.")).toBeVisible();
  await expect(page.getByText("Sam said no to AA batteries, pack of 8.")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("radio")).toHaveCount(3);
  expect(await sql("SELECT status, paypal_order_id FROM purchase_requests")).toEqual([
    { status: "declined", paypal_order_id: null },
  ]);
});

test("a refused charge takes nothing and lets Rose ask again", async ({ page, context }) => {
  await reset("e2e-not-a-real-token");
  await roseAsksFor(page, /Weekly pill organiser/);
  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await samPage.getByRole("button", { name: "OK, pay $12.50" }).click();

  await expect(heading(samPage)).toHaveText("Payment didn't go through", { timeout: 15000 });
  await expect(samPage.getByText("Nothing was taken from Rose's PayPal for Weekly pill organiser.")).toBeVisible();
  await expect(page.getByText("Payment didn't go through. Nothing was taken.")).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("radio")).toHaveCount(3);
});

test("Rose links PayPal from the first screen", async ({ page }) => {
  await reset(null);
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("Link your PayPal to start");

  await Promise.all([
    page.waitForURL(/^https:\/\/www\.sandbox\.paypal\.com\//, { waitUntil: "commit" }),
    page.getByRole("button", { name: "Link PayPal" }).click(),
  ]);

  await page.goto(`/r/${rose}?cancelled=1`);
  await expect(heading(page)).toHaveText("PayPal isn't linked yet");
});

test("a wrong link says it doesn't work", async ({ page }) => {
  for (const path of ["/r/not-a-real-link", `/h/${rose}`, `/r/${sam}`]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(heading(page)).toHaveText("This link doesn't work");
  }
});
