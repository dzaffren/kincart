import { expect, test, type Page } from "@playwright/test";
import { listing, reset, searchFor } from "./db";

const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

// Chrome's DevTools give a page a fake passkey device that matches a face or fingerprint at once. A device
// with no passkey saved stands in for a laptop that only has Sam's link.
async function passkeyDevice(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test("Sam turns on the passkey: a leaked link can't pay, make new links or turn it off, and Sam's face pays", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  // One real sandbox payment.
  test.setTimeout(90_000);
  expect(savedPaypal, "set PAYPAL_E2E_VAULT_ID").toBeTruthy();
  await reset(savedPaypal);

  await page.goto("/");
  await page.getByRole("button", { name: "Try KinCart" }).click();
  await expect(page.getByText("Your Rose and Sam are ready.")).toBeVisible();
  const roseLink = (await page.getByRole("link", { name: "Be Rose" }).getAttribute("href"))!;
  const samLink = (await page.getByRole("link", { name: "Be Sam" }).getAttribute("href"))!;

  const sam = await context.newPage();
  await passkeyDevice(sam);
  await sam.goto(samLink);
  await expect(sam.getByText("Confirm each OK")).toBeVisible();
  await sam.getByRole("button", { name: "Turn on" }).click();
  await expect(sam.getByText("Turned on. Your next OK asks for your face or fingerprint.")).toBeVisible();
  await expect(sam.getByRole("button", { name: "Turn off" })).toBeVisible();

  const rose = await context.newPage();
  await rose.goto(roseLink);
  await rose.getByRole("button", { name: "Skip: use the demo PayPal" }).click();
  await expect(heading(rose)).toHaveText("What do you need?");
  await searchFor("AA batteries", listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 1299, "amazon.com"));
  await rose.reload();
  await rose.getByRole("radio").first().check();
  await rose.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(rose)).toHaveText("Waiting for Sam");

  const laptop = await (await browser.newContext({ baseURL })).newPage();
  await passkeyDevice(laptop);
  await laptop.goto(samLink);
  await laptop.getByRole("button", { name: "OK, pay $12.99" }).click();
  await expect(laptop.getByText("Not paid. This OK needs your face or fingerprint, on the phone that turned it on.")).toBeVisible();
  await expect(laptop.getByRole("button", { name: "OK, pay $12.99" })).toBeVisible();
  await expect(heading(rose)).toHaveText("Waiting for Sam");

  await sam.reload();
  await sam.getByRole("button", { name: "OK, pay $12.99" }).click();
  await expect(heading(sam)).toHaveText("Paid from Rose's PayPal", { timeout: 20_000 });
  await expect(heading(rose)).toHaveText("Sam said OK. It's paid.", { timeout: 10_000 });

  await laptop.goto(samLink);
  await laptop.getByRole("button", { name: "Make new links" }).click();
  await laptop.getByRole("button", { name: "Make new links" }).click();
  await expect(laptop.getByText("No new links made. This needs your face or fingerprint, on the phone that turned it on.")).toBeVisible();
  expect(new URL(laptop.url()).pathname).toBe(samLink);

  await laptop.goto(samLink);
  await laptop.getByRole("button", { name: "Turn off" }).click();
  await expect(laptop.getByText("Still on. Turning it off needs your face or fingerprint", { exact: false })).toBeVisible();

  await sam.reload();
  await sam.getByRole("button", { name: "Turn off" }).click();
  await expect(sam.getByText("Turned off. Each OK pays with one tap again.")).toBeVisible();
  await laptop.reload();
  await expect(laptop.getByRole("button", { name: "Turn on" })).toBeVisible();
});
