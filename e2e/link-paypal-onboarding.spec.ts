import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { reset, sql } from "./db";

const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";
const demoEmail = process.env.PAYPAL_DEMO_EMAIL ?? "";

const heading = (phone: Page | FrameLocator) => phone.getByRole("heading", { level: 1 });

test.beforeAll(() => {
  expect(savedPaypal, "set PAYPAL_E2E_VAULT_ID").toBeTruthy();
  expect(demoEmail, "set PAYPAL_DEMO_EMAIL").toBeTruthy();
});

test.use({ viewport: { width: 1280, height: 800 } });

test("a judge's new Rose opens PayPal in a new tab, or skips to the demo PayPal", async ({ page, context }) => {
  await reset(savedPaypal);
  await page.goto("/");
  await page.getByRole("button", { name: "Try KinCart" }).click();
  await expect(page.getByText("Your Rose and Sam are ready.")).toBeVisible();

  const rose = page.locator('iframe[title="Rose\'s phone"]').contentFrame();
  await expect(heading(rose)).toHaveText("Link your PayPal to start");
  await expect(rose.getByRole("region", { name: "Sign in on PayPal with this demo login" })).toContainText(demoEmail);
  await expect(rose.getByText("PayPal opens in a new tab.")).toBeVisible();

  const [paypal] = await Promise.all([context.waitForEvent("page"), rose.getByRole("button", { name: "Link PayPal" }).click()]);
  await paypal.waitForURL(/^https:\/\/www\.sandbox\.paypal\.com\//, { waitUntil: "commit" });
  await paypal.close();
  await expect(heading(rose)).toHaveText("Link your PayPal to start");

  const roseLink = await page.getByRole("link", { name: "Open Rose's page" }).getAttribute("href");
  const cancelled = await context.newPage();
  await cancelled.goto(`${roseLink}?cancelled=1`);
  await expect(heading(cancelled)).toHaveText("PayPal isn't linked yet");
  await expect(cancelled.getByRole("region", { name: "Sign in on PayPal with this demo login" })).toContainText(demoEmail);
  await expect(cancelled.getByRole("button", { name: "Skip: use the demo PayPal" })).toBeVisible();
  await expect(cancelled.getByText("PayPal opens in a new tab.")).toHaveCount(0);
  await cancelled.close();

  await rose.getByRole("button", { name: "Skip: use the demo PayPal" }).click();
  await expect(heading(rose)).toHaveText("What do you need?");
  const [{ id }] = await sql("SELECT max(id) AS id FROM households");
  expect(await sql("SELECT payment_token FROM paypal_vault WHERE id = $1", [id])).toEqual([{ payment_token: savedPaypal }]);
});
