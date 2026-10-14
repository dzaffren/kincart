import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, firefox, test, type Page } from "@playwright/test";
import type { Option } from "../lib/shop/find";
import { ITEMS } from "../lib/shop/items";
import { reset } from "./db";

const rose = process.env.ROSE_LINK_TOKEN ?? "";
const sam = process.env.SAM_LINK_TOKEN ?? "";
const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

// Rose's search is seeded with the fixed reading glasses, so this test calls no AI.
const [glasses] = ITEMS;
const listing: Option = {
  ...glasses,
  shop: "target.com",
  url: "https://www.target.com/",
  what: `${glasses.name}.`,
  why: "It is what Rose asked for.",
  watch: "Check the strength before you buy.",
};

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

// What the phone shows for one link: the notifications that link's service worker has put up.
function shown(page: Page, link: string) {
  return page.evaluate(async (scope) => {
    const registration = await navigator.serviceWorker.getRegistration(scope);
    const notifications = (await registration?.getNotifications()) ?? [];
    return notifications.map(({ title, body }) => ({ title, body }));
  }, link);
}

test.beforeAll(() => {
  expect(
    rose && sam && savedPaypal && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
    "set ROSE_LINK_TOKEN, SAM_LINK_TOKEN, PAYPAL_E2E_VAULT_ID, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT",
  ).toBeTruthy();
});

test("Sam's phone buzzes on an ask, Rose's on the payment", async ({ baseURL }) => {
  await reset(savedPaypal, { words: "reading glasses", options: [listing] });
  // Only a persistent Firefox profile can subscribe headless (D26). One profile holds both links, like one phone (O7).
  const profile = await mkdtemp(path.join(tmpdir(), "ping-helper-"));
  const phone = await firefox.launchPersistentContext(profile, {
    baseURL,
    viewport: { width: 390, height: 844 },
    permissions: ["notifications"],
    // Playwright's Firefox turns its push service off; the first two turn it back on. The third shows
    // notifications without a desktop's notification service, which CI's runner doesn't have.
    firefoxUserPrefs: {
      "dom.push.serverURL": "wss://push.services.mozilla.com/",
      "dom.push.connection.enabled": true,
      "alerts.useSystemBackend": false,
    },
  });

  try {
    const samPage = await phone.newPage();
    await samPage.goto(`/h/${sam}`);
    await expect(heading(samPage)).toHaveText("Nothing to approve");
    await samPage.getByRole("button", { name: "Turn on notifications" }).click();
    await expect(samPage.getByText("On. Your phone will buzz when Rose asks for something.")).toBeVisible({
      timeout: 15_000,
    });
    await samPage.close();

    const rosePage = await phone.newPage();
    await rosePage.goto(`/r/${rose}`);
    await rosePage.getByRole("radio", { name: /Reading glasses, \+2\.00/ }).check();
    await rosePage.getByRole("button", { name: "Ask Sam" }).click();
    await expect(heading(rosePage)).toHaveText("Waiting for Sam");
    await rosePage.getByRole("button", { name: "Turn on notifications" }).click();
    await expect(rosePage.getByText("On. Your phone will buzz when Sam answers.")).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(() => shown(rosePage, `/h/${sam}`), { timeout: 10_000 })
      .toEqual([
        {
          title: "Rose would like something",
          body: "Reading glasses, +2.00, $18.99. Tap to see it and say OK or No.",
        },
      ]);

    // A headless browser can't tap a notification, so the test opens what a tap opens: the link it came from.
    const fromPing = await phone.newPage();
    await fromPing.goto(`/h/${sam}`);
    await expect(heading(fromPing)).toHaveText("Rose would like this");
    await rosePage.close();
    await fromPing.getByRole("button", { name: "OK, pay $18.99" }).click();
    await expect(heading(fromPing)).toHaveText("Paid from Rose's PayPal", { timeout: 15_000 });

    await expect
      .poll(() => shown(fromPing, `/r/${rose}`), { timeout: 10_000 })
      .toEqual([{ title: "Sam said OK", body: "Reading glasses, +2.00 is paid: $18.99. Tap to see the receipt." }]);

    const roseAgain = await phone.newPage();
    await roseAgain.goto(`/r/${rose}`);
    await expect(heading(roseAgain)).toHaveText("Sam said OK. It's paid.");
    await expect(roseAgain.getByText("$18.99")).toBeVisible();
  } finally {
    await phone.close();
    await rm(profile, { recursive: true, force: true });
  }
});
