import { expect, test, type Page } from "@playwright/test";
import { listing, reset, searchFor } from "./db";

const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

async function startOwn(home: Page) {
  await home.goto("/");
  await home.getByRole("button", { name: "Try KinCart" }).click();
  await expect(home.getByText("Your Rose and Sam are ready.")).toBeVisible();
  return {
    rose: (await home.getByRole("link", { name: "Be Rose" }).getAttribute("href"))!,
    sam: (await home.getByRole("link", { name: "Be Sam" }).getAttribute("href"))!,
  };
}

async function asksSam(rose: Page) {
  await rose.reload();
  await expect(heading(rose)).toHaveText("Which one would you like?");
  await rose.getByRole("radio").first().check();
  await rose.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(rose)).toHaveText("Waiting for Sam");
}

test.beforeAll(() => {
  expect(savedPaypal, "set PAYPAL_E2E_VAULT_ID").toBeTruthy();
});

test("two judges each get their own KinCart", async ({ page, context, browser, baseURL }) => {
  await reset(savedPaypal);

  const ana = await startOwn(page);
  const anaRose = await context.newPage();
  await anaRose.goto(ana.rose);
  await expect(heading(anaRose)).toHaveText("What do you need?");
  await expect(anaRose.getByText(/Sam's limit is \$50 an item/)).toBeVisible();
  await searchFor("AA batteries", listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com"));
  await asksSam(anaRose);

  const ben = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  const benHome = await ben.newPage();
  await benHome.goto("/");
  await expect(benHome.getByRole("button", { name: "Try KinCart" })).toBeVisible();
  const benLinks = await startOwn(benHome);
  expect(benLinks.rose).not.toBe(ana.rose);
  const benSam = await ben.newPage();
  await benSam.goto(benLinks.sam);
  await expect(heading(benSam)).toHaveText("Nothing to approve");
  const benRose = await ben.newPage();
  await benRose.goto(benLinks.rose);
  await searchFor(
    "a night light",
    listing("prod_6Nl2tL", "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack", 1249, "target.com"),
  );
  await asksSam(benRose);

  await expect(heading(benSam)).toHaveText("Rose would like this", { timeout: 5000 });
  await benSam.getByRole("button", { name: "OK, pay $12.49" }).click();
  await expect(heading(benSam)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  const transaction = await benSam.getByText(/^PayPal transaction /).textContent();
  expect(transaction).toMatch(/^PayPal transaction [A-Z0-9]{17}$/);
  await expect(heading(benRose)).toHaveText("Sam said OK. It's paid.", { timeout: 5000 });
  await expect(benRose.getByText(transaction!)).toBeVisible();

  const anaSam = await context.newPage();
  await anaSam.goto(ana.sam);
  await expect(heading(anaSam)).toHaveText("Rose would like this");
  await expect(anaSam.getByText("Amazon Basics 24-Pack AA Alkaline Batteries")).toBeVisible();
  await expect(anaSam.getByRole("button", { name: "OK, pay $9.99" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Be Rose" })).toHaveAttribute("href", ana.rose);
  await page.getByRole("button", { name: "Start a new one" }).click();
  await expect(
    page.getByText("Your new Rose and Sam are ready. Tabs you already have open still show the old ones."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Be Rose" })).not.toHaveAttribute("href", ana.rose);
  await anaRose.goto(ana.rose);
  await expect(heading(anaRose)).toHaveText("Waiting for Sam");

  await ben.close();
});
