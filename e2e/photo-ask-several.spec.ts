import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { reset, sql } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const tiles = (page: Page) => page.locator(".photo-tile");
const notPhoto = "That file isn't a photo. Pick a photo, or type what you need.";

type Picked = { name: string; mimeType: string; buffer: Buffer };

async function pick(page: Page, button: string, files: string | Picked[]) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: button }).click();
  await (await chooser).setFiles(files);
}

// The files that Find will send. Five photos and Rose's words fit in Next's 1 MB at 180 KB each (D70).
function inForm(page: Page) {
  return page
    .locator('input[name="photo"]')
    .evaluate((input: HTMLInputElement) => Array.from(input.files ?? [], ({ size, type }) => ({ size, type })));
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  expect(
    rose && sam && savedPaypal && process.env.ANTHROPIC_API_KEY && process.env.CHANNEL3_API_KEY,
    "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, ANTHROPIC_API_KEY and CHANNEL3_API_KEY",
  ).toBeTruthy();
});

test("Rose finds four things from a photo of the old battery and a photo of a written list, and asks Sam once", async ({
  page,
  context,
}) => {
  await reset(savedPaypal);
  await sql("INSERT INTO price_limit (id, cents) VALUES (1, 2500)");
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("What do you need?");

  // Both are full size, 1.8 and 2.2 MB, so Find can send them only once the browser has shrunk them.
  await pick(page, "Take or pick a photo", "e2e/photos/cr2032.jpg");
  await expect(page.getByText("Your photo", { exact: true })).toBeVisible();
  await pick(page, "Add another photo", "e2e/photos/list.jpg");
  await expect(page.getByText("Your 2 photos")).toBeVisible();
  const photos = await inForm(page);
  expect(photos).toHaveLength(2);
  for (const photo of photos) {
    expect(photo.type).toBe("image/jpeg");
    expect(photo.size).toBeLessThanOrEqual(180_000);
  }

  // The page redraws every 3 s (D19), and the photos have to outlast it.
  await page.waitForTimeout(4000);
  await expect(tiles(page)).toHaveCount(2);
  expect(await inForm(page)).toEqual(photos);

  await page.getByRole("button", { name: "Find" }).click();
  await expect(heading(page)).toHaveText("Which ones would you like?", { timeout: 30_000 });
  await expect(page.getByText(/^For “.+”, from your photos\. Pick one/)).toBeVisible();
  const groups = page.locator(".groups > section");
  await expect(groups).toHaveCount(4);
  await expect(groups.first().getByRole("heading", { level: 2 })).toHaveText(/2032/);

  // Only the AI's words and the two counts are kept, and no photo (D64). A JPEG in base64 starts /9j/.
  expect(await sql("SELECT photos, blank_photos FROM rose_search")).toEqual([{ photos: 2, blank_photos: 0 }]);
  expect(await sql("SELECT 1 FROM rose_search WHERE row_to_json(rose_search)::text LIKE '%/9j/%'")).toEqual([]);

  // Results vary (D24), so Rose takes the first listing in each group that has one. A group's last radio is None of these.
  let picked = 0;
  for (let index = 0; index < 4; index++) {
    const radios = groups.nth(index).getByRole("radio");
    if ((await radios.count()) < 2) continue;
    await radios.first().check();
    picked++;
  }
  expect(picked).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(heading(samPage)).toHaveText(`Rose would like ${picked} things`);
});

test("Rose ticks six photos and keeps the first five, removes one, then picks a PDF with a photo", async ({ page }) => {
  await reset(savedPaypal);
  await page.goto(`/r/${rose}`);
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  const wall = readFileSync("e2e/photos/blank.jpg");
  const six = Array.from({ length: 6 }, (_, index) => ({ name: `wall-${index + 1}.jpg`, mimeType: "image/jpeg", buffer: wall }));

  await pick(page, "Take or pick a photo", six);
  await expect(tiles(page)).toHaveCount(5);
  await expect(page.getByText("Up to 5 photos. The first 5 are kept.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add another photo" })).toHaveCount(0);
  expect(await inForm(page)).toHaveLength(5);

  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(tiles(page)).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Add another photo" })).toBeFocused();
  expect(await inForm(page)).toHaveLength(4);

  await pick(page, "Add another photo", [
    { name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n") },
    six[0],
  ]);
  await expect(tiles(page)).toHaveCount(5);
  await expect(page.getByText(notPhoto)).toBeVisible();
  expect(await inForm(page)).toHaveLength(5);
  expect(posts).toEqual([]);
});

test("Rose picks two more photos before the first four are ready, and keeps the first five", async ({ page }) => {
  await reset(savedPaypal);
  await page.goto(`/r/${rose}`);
  const wall = readFileSync("e2e/photos/blank.jpg");
  const six = Array.from({ length: 6 }, (_, index) => ({ name: `wall-${index + 1}.jpg`, mimeType: "image/jpeg", buffer: wall }));

  // The first four still shrink, so no tile shows yet and the button still says Take or pick a photo.
  await pick(page, "Take or pick a photo", six.slice(0, 4));
  await pick(page, "Take or pick a photo", six.slice(4));
  await expect(tiles(page)).toHaveCount(5);
  await expect(page.getByText("Up to 5 photos. The first 5 are kept.")).toBeVisible();
  expect(await inForm(page)).toHaveLength(5);
});

test("Rose sends two photos of a blank wall, hears that nothing could be told from them, and no photo is left", async ({
  page,
}) => {
  await reset(savedPaypal);
  await page.goto(`/r/${rose}`);
  await pick(page, "Take or pick a photo", "e2e/photos/blank.jpg");
  await pick(page, "Add another photo", "e2e/photos/blank.jpg");
  await expect(tiles(page)).toHaveCount(2);

  await page.getByRole("button", { name: "Find" }).click();
  await expect(
    page.getByText("Couldn't tell what to buy from those photos. Try other photos, or type what you need."),
  ).toBeVisible({ timeout: 20_000 });
  await expect(heading(page)).toHaveText("What do you need?");
  // After a Find, no photo is picked (O8).
  await expect(tiles(page)).toHaveCount(0);
  expect(await inForm(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Take or pick a photo" })).toBeVisible();
});
