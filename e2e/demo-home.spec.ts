import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { listing, reset, searchFor } from "./db";

const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (phone: Page | FrameLocator) => phone.getByRole("heading", { level: 1 });

test.beforeAll(() => {
  expect(savedPaypal, "set PAYPAL_E2E_VAULT_ID").toBeTruthy();
});

test.describe("on a laptop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a judge plays Rose and Sam side by side", async ({ page }) => {
    await reset(savedPaypal);
    await page.goto("/");
    await expect(page.getByText("Mom asks.")).toBeVisible();
    for (const caption of await page.getByText("Sample, not live").all()) await expect(caption).toBeVisible();
    await expect(page.getByText("Sample, not live")).toHaveCount(2);
    await page.getByRole("button", { name: "Try KinCart" }).click();
    await expect(page.getByText("Your Rose and Sam are ready.")).toBeVisible();

    const rose = page.frameLocator('iframe[title="Rose\'s phone"]');
    const sam = page.frameLocator('iframe[title="Sam\'s phone"]');
    await expect(heading(rose)).toHaveText("What do you need?");
    await expect(heading(sam)).toHaveText("Nothing to approve");
    const words = (await heading(page).boundingBox())!;
    const roseBox = (await page.locator('iframe[title="Rose\'s phone"]').boundingBox())!;
    const samBox = (await page.locator('iframe[title="Sam\'s phone"]').boundingBox())!;
    expect(words.x + words.width).toBeLessThanOrEqual(roseBox.x);
    expect(roseBox.x + roseBox.width).toBeLessThanOrEqual(samBox.x);
    expect(samBox.y).toBe(roseBox.y);

    await searchFor("AA batteries", listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com"));
    await expect(heading(rose)).toHaveText("Which one would you like?", { timeout: 5000 });
    await rose.getByRole("radio").first().check();
    await rose.getByRole("button", { name: "Ask Sam" }).click();
    await expect(heading(rose)).toHaveText("Waiting for Sam");

    await expect(heading(sam)).toHaveText("Rose would like this", { timeout: 5000 });
    await sam.getByRole("button", { name: "OK, pay $9.99" }).click();
    await expect(heading(sam)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
    const transaction = await sam.getByText(/^PayPal transaction /).textContent();
    expect(transaction).toMatch(/^PayPal transaction [A-Z0-9]{17}$/);
    await expect(heading(rose)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
    await expect(rose.getByText(transaction!)).toBeVisible();
    // Both pages have been open for seconds by now, so a Notifications control would have shown.
    for (const phone of [rose, sam]) await expect(phone.getByText("Notifications", { exact: true })).toHaveCount(0);
  });
});
