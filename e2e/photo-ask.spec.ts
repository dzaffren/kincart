import { expect, test, type Page } from "@playwright/test";
import { reset, sql } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const box = (page: Page) => page.getByRole("textbox", { name: "What do you need?" });
const notPhoto = "That file isn't a photo. Pick a photo, or type what you need.";

type Picked = { name: string; mimeType: string; buffer: Buffer };

async function pick(page: Page, file: string | Picked) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Take or pick a photo" }).click();
  await (await chooser).setFiles(file);
}

// The file that Find will send. Next refuses a body over 1 MB (D65).
function inForm(page: Page) {
  return page.locator('input[name="photo"]').evaluate((input: HTMLInputElement) => {
    const file = input.files?.[0];
    return file ? { size: file.size, type: file.type } : null;
  });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  expect(
    rose && sam && savedPaypal && process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY,
    "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, ANTHROPIC_API_KEY and CHANNEL3_API_KEY",
  ).toBeTruthy();
});

test("Rose finds a battery from a full-size photo of the old one, and asks Sam", async ({ page, context }) => {
  await reset(savedPaypal);
  await sql("INSERT INTO price_limit (id, cents) VALUES (1, 2500)");
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("What do you need?");

  // 4032×3024 and 1.8 MB, so Find can only send it once the browser has shrunk it.
  await pick(page, "e2e/photos/cr2032.jpg");
  await expect(page.getByText("Your photo")).toBeVisible();
  const photo = await inForm(page);
  expect(photo).toMatchObject({ type: "image/jpeg" });
  expect(photo!.size).toBeLessThan(1_000_000);

  // The page redraws every 3 s (D19), and the photo has to outlast it.
  await page.waitForTimeout(4000);
  await expect(page.getByText("Your photo")).toBeVisible();
  expect(await inForm(page)).toEqual(photo);

  await page.getByRole("button", { name: "Find" }).click();
  await expect(heading(page)).toHaveText("Which one would you like?", { timeout: 25_000 });
  await expect(page.getByText(/^For “.+”, from your photo/)).toBeVisible();
  for (const price of await page.locator(".listing .option-price").allTextContents()) {
    expect(Number(price.replace(/[$,]/g, ""))).toBeLessThanOrEqual(25);
  }
  await expect(page.getByText("Good to know:")).toHaveCount(await page.getByRole("radio").count());

  // Results vary (D24), so Rose takes the first listing that names the battery.
  const coin = page.locator(".listing-name").filter({ hasText: /2032/ }).first();
  const name = await coin.textContent();
  await coin.click();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText("Rose would like this");
  // Haiku's "Why it fits" can repeat the name, so only the line that is the name counts.
  await expect(samPage.getByText(name!, { exact: true })).toBeVisible();
});

test("Rose picks a file that isn't a photo, and keeps the words in the box", async ({ page }) => {
  await reset(savedPaypal);
  await page.goto(`/r/${rose}`);
  await box(page).fill("batteries for the clock");
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });

  await pick(page, { name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n") });

  await expect(page.getByText(notPhoto)).toBeVisible();
  await expect(page.getByRole("button", { name: "Take or pick a photo" })).toHaveAccessibleDescription(notPhoto);
  await expect(page.getByText("Your photo")).toHaveCount(0);
  expect(await inForm(page)).toBeNull();
  await expect(box(page)).toHaveValue("batteries for the clock");
  expect(posts).toEqual([]);
});
