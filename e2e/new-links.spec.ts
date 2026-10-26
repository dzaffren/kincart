import { expect, test, type Page } from "@playwright/test";
import { listing, reset, searchFor } from "./db";

const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

test("Sam makes new links: the old pair stops, and Rose's new link keeps her PayPal, limit and past buys", async ({
  page,
  context,
}) => {
  // One real sandbox payment, for the AA batteries under Bought before.
  test.setTimeout(60_000);
  await reset(savedPaypal);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/");
  await page.getByRole("button", { name: "Try KinCart" }).click();
  await expect(page.getByText("Your Rose and Sam are ready.")).toBeVisible();
  const oldRose = (await page.getByRole("link", { name: "Be Rose" }).getAttribute("href"))!;
  const oldSam = (await page.getByRole("link", { name: "Be Sam" }).getAttribute("href"))!;

  const rose = await context.newPage();
  await rose.goto(oldRose);
  await rose.getByRole("button", { name: "Skip: use the demo PayPal" }).click();
  await expect(heading(rose)).toHaveText("What do you need?");
  await searchFor("AA batteries", listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com"));
  await rose.reload();
  await rose.getByRole("radio").first().check();
  await rose.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(rose)).toHaveText("Waiting for Sam");

  const sam = await context.newPage();
  await sam.goto(oldSam);
  await expect(sam.getByText("Your links")).toHaveCount(0);
  await sam.getByRole("button", { name: "OK, pay $9.99" }).click();
  await expect(heading(sam)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });
  const limit = sam.getByRole("textbox", { name: "Price limit" });
  await limit.fill("40");
  await sam.locator("form", { has: limit }).getByRole("button", { name: "Save" }).click();
  await expect(sam.getByText("Saved. Rose's next search stays at $40 or less.")).toBeVisible();

  await sam.getByRole("button", { name: "Make new links" }).click();
  await expect(heading(sam)).toHaveText("Make new links?");
  await sam.getByRole("button", { name: "Keep these" }).click();
  await expect(heading(sam)).toHaveText("Paid from Rose's PayPal");
  expect(new URL(sam.url()).pathname).toBe(oldSam);

  await sam.getByRole("button", { name: "Make new links" }).click();
  await sam.getByRole("button", { name: "Make new links" }).click();
  await expect(sam.getByText("New links made.", { exact: false })).toBeVisible();
  const newSam = new URL(sam.url()).pathname;
  expect(newSam).toMatch(/^\/h\//);
  expect(newSam).not.toBe(oldSam);
  const newRose = new URL((await sam.getByText(/\/r\//).textContent())!).pathname;
  expect(newRose).not.toBe(oldRose);
  await sam.getByRole("button", { name: "Copy" }).click();
  await expect(sam.getByText("Copied.")).toBeVisible();
  expect(new URL(await sam.evaluate(() => navigator.clipboard.readText())).pathname).toBe(newRose);
  await expect(sam.getByRole("textbox", { name: "Price limit" })).toHaveValue("40");

  for (const old of [oldRose, oldSam]) {
    await rose.goto(old);
    await expect(rose.getByText("This link doesn't work")).toBeVisible();
  }

  await rose.goto(newRose);
  await expect(heading(rose)).toHaveText("Sam said OK. It's paid.");
  await rose.getByRole("link", { name: "Ask for something else" }).click();
  await expect(heading(rose)).toHaveText("What do you need?");
  await expect(rose.getByText("Sam's limit is $40 an item.")).toBeVisible();
  await expect(rose.getByRole("region", { name: "Bought before" })).toContainText("Amazon Basics 24-Pack AA Alkaline Batteries");

  await page.goto("/");
  expect(await page.getByRole("link", { name: "Be Sam" }).getAttribute("href")).toBe(newSam);
  expect(await page.getByRole("link", { name: "Be Rose" }).getAttribute("href")).toBe(newRose);
});
