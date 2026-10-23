import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import type { Option } from "../lib/shop/find";
import { ITEMS } from "../lib/shop/items";
import { reset } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

// Rose's search is seeded with the three fixed items, so the test calls no AI.
const fixedThree: Option[] = ITEMS.map((item) => ({
  ...item,
  shop: "target.com",
  url: "https://www.target.com/",
  what: `${item.name}.`,
  why: "It is what Rose asked for.",
  watch: "Check the pack before you buy.",
}));

const heading = (page: Page | FrameLocator) => page.getByRole("heading", { level: 1 });

// Another site, played by a server on another port. It must be a real server: Chrome's local network
// checks stop a page that Playwright fulfils from framing localhost.
const other = createServer((request, response) => {
  response.setHeader("content-type", "text/html");
  response.end(request.url === "/frame" ? `<iframe title="Sam's page" src="${otherFrames}" width="390" height="844"></iframe>` : "");
});
let otherFrames = "";
let elsewhere = "";

test.beforeAll(async () => {
  await new Promise<void>((done) => other.listen(0, "localhost", done));
  elsewhere = `http://localhost:${(other.address() as AddressInfo).port}`;
});

test.afterAll(() => other.close());

test.beforeAll(() => {
  expect(rose && sam && savedPaypal, "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN and PAYPAL_E2E_VAULT_ID").toBeTruthy();
});

test.use({ viewport: { width: 1280, height: 800 } });

test("only KinCart frames its pages, and other sites get no page address", async ({ page, context, baseURL }) => {
  await reset(savedPaypal, { words: "something I need", options: fixedThree });
  await page.goto(`/r/${rose}`);
  await page.getByRole("radio", { name: /Reading glasses, \+2\.00/ }).check();
  await page.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(page)).toHaveText("Waiting for Sam");

  const samPage = await context.newPage();
  await samPage.goto(`/h/${sam}`);
  await expect(samPage.getByRole("button", { name: "OK, pay $18.99" })).toBeVisible();

  otherFrames = `${baseURL}/h/${sam}`;
  const attacker = await context.newPage();
  const framed = attacker.waitForResponse((response) => response.url() === `${baseURL}/h/${sam}`);
  await attacker.goto(`${elsewhere}/frame`);
  expect((await framed).status()).toBe(200);
  await attacker.waitForLoadState("load");
  await expect(attacker.locator('iframe[title="Sam\'s page"]').contentFrame().getByRole("button")).toHaveCount(0);

  const photoReferers = (target: string) =>
    Promise.all([
      samPage.waitForRequest((request) => request.url() === target).then((request) => request.allHeaders()),
      samPage.evaluate((src) => {
        const photo = document.createElement("img");
        photo.src = src;
        document.body.append(photo);
      }, target),
    ]).then(([headers]) => headers.referer);
  expect(await photoReferers(`${elsewhere}/photo.jpg`)).toBeUndefined();
  expect(await photoReferers(`${baseURL}/icon.svg?own`)).toBe(`${baseURL}/h/${sam}`);

  await page.goto("/");
  await page.getByRole("button", { name: "Try KinCart" }).click();
  await expect(page.getByText("Your Rose and Sam are ready.")).toBeVisible();
  await expect(heading(page.locator('iframe[title="Rose\'s phone"]').contentFrame())).toHaveText(
    "Link your PayPal to start",
  );
  await expect(heading(page.locator('iframe[title="Sam\'s phone"]').contentFrame())).toHaveText("Nothing to approve");

  await reset(null);
  await page.goto(`/r/${rose}`);
  await expect(heading(page)).toHaveText("Link your PayPal to start");
  await Promise.all([
    page.waitForURL(/^https:\/\/www\.sandbox\.paypal\.com\//, { waitUntil: "commit" }),
    page.getByRole("button", { name: "Link PayPal" }).click(),
  ]);
});
