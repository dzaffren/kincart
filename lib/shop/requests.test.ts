import pg from "pg";
import { beforeAll, beforeEach, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "./items";
import {
  ask,
  claim,
  clearSearch,
  decline,
  forgetSubscription,
  getLimit,
  getSearch,
  getVault,
  keep,
  latest,
  record,
  saveSearch,
  saveSubscription,
  saveVault,
  setLimit,
  stuck,
  subscriptionsFor,
} from "./requests";

const [glasses, pills, batteries] = ITEMS;

async function sql(text: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(text);
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  await sql("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM push_subscriptions");
});

it("keeps one saved PayPal, replaced when Rose links again", async () => {
  expect(await getVault()).toBeNull();
  await saveVault("1j970427g9944212v");
  await saveVault("8kf02113h7720954x");
  expect(await getVault()).toBe("8kf02113h7720954x");
});

it("records an ask as waiting, with the item's name and price copied in", async () => {
  await ask(glasses);

  expect(await latest()).toMatchObject({
    item: { id: "glasses", name: "Reading glasses, +2.00", cents: 1899 },
    status: "waiting",
    answeredAt: null,
  });
});

it("ignores a second ask while one is still open, and says which ask made a request", async () => {
  expect(await ask(glasses)).toBe(true);
  expect(await ask(batteries)).toBe(false);

  expect((await latest())?.item.id).toBe("glasses");
});

it("lets only the first OK claim a request", async () => {
  await ask(glasses);
  const { id } = (await latest())!;

  expect((await claim(id))?.status).toBe("paying");
  expect(await claim(id)).toBeNull();
  expect(await decline(id)).toBeNull();
});

it("declines a waiting request, after which Rose can ask again", async () => {
  await ask(batteries);
  const { id } = (await latest())!;

  expect(await decline(id)).toMatchObject({ id, item: batteries, status: "declined" });
  expect((await latest())?.status).toBe("declined");

  await ask(pills);
  expect((await latest())?.item.id).toBe("pills");
});

it("records a paid charge with PayPal's ids", async () => {
  await ask(glasses);
  const { id } = (await latest())!;
  await claim(id);
  await record(id, { state: "paid", orderId: "3BP30887MC6972056", captureId: "7BM91101S1572292D" });

  expect(await latest()).toMatchObject({
    status: "paid",
    orderId: "3BP30887MC6972056",
    captureId: "7BM91101S1572292D",
  });
});

it("records a refused charge with the reason", async () => {
  await ask(pills);
  const { id } = (await latest())!;
  await claim(id);
  await record(id, { state: "refused", reason: "PERMISSION_DENIED" });

  expect(await latest()).toMatchObject({ status: "failed", failureReason: "PERMISSION_DENIED" });
});

it("finds a charge left paying for over 15 seconds, and not a fresh one", async () => {
  await ask(glasses);
  const { id } = (await latest())!;
  await claim(id);
  expect(await stuck()).toBeNull();

  await sql(`UPDATE purchase_requests SET answered_at = now() - interval '20 seconds' WHERE id = ${id}`);
  expect((await stuck())?.id).toBe(id);
});

const strap = {
  id: "prod_9Wz4hY",
  name: "Adjustable Wide Slippers with Hook-and-Loop Strap",
  cents: 3250,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B0C7WIDE21",
  imageUrl: "https://cdn.trychannel3.com/prod_9Wz4hY",
  what: "Wide slippers that open across the top and close with a strap.",
  why: "You open them right up to put them on, then press the strap shut.",
  watch: "They're a wide fit, so they may feel loose on a narrow foot.",
};

it("records an ask from a search with the shop, the link and the reason it fits", async () => {
  await ask(strap, { shop: strap.shop, url: strap.url, reason: strap.why });

  expect(await latest()).toMatchObject({
    item: { id: "prod_9Wz4hY", name: "Adjustable Wide Slippers with Hook-and-Loop Strap", cents: 3250 },
    found: { shop: "amazon.com", url: "https://www.amazon.com/dp/B0C7WIDE21", reason: strap.why },
  });

  await sql("TRUNCATE purchase_requests");
  await ask(glasses);
  expect((await latest())?.found).toBeNull();
});

it("keeps Rose's one current search until the next one or a clear", async () => {
  expect(await getSearch()).toBeNull();

  await saveSearch("warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });
  expect(await getSearch()).toMatchObject({
    words: "warm slippers that are easy to put on, size 8",
    outcome: "options",
    options: [strap],
  });

  await saveSearch("AA batteries, a tablet for video calls", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [strap] },
      { thing: "a tablet for video calls", options: [], problem: "over limit" },
    ],
  });
  expect(await getSearch()).toMatchObject({
    outcome: "basket",
    options: [],
    groups: [
      { thing: "AA batteries", options: [strap] },
      { thing: "a tablet for video calls", options: [], problem: "over limit" },
    ],
  });

  await saveSearch("batteries, a night light, a phone charger, a doormat, a kettle and a flashlight", {
    outcome: "too many",
  });
  expect(await getSearch()).toMatchObject({ outcome: "too many", options: [], groups: [] });

  await clearSearch();
  expect(await getSearch()).toBeNull();
});

const aa = {
  id: "prod_3Ba7aA",
  name: "Amazon Basics 24-Pack AA Alkaline Batteries",
  cents: 999,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B00MNV8E0C",
  reason: "Enough for the remotes and clocks for a long while.",
  thing: "AA batteries",
};
const light = {
  id: "prod_6Nl2tL",
  name: "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack",
  cents: 1249,
  shop: "target.com",
  url: "https://www.target.com/p/A-81532901",
  reason: "They come on by themselves when it gets dark.",
  thing: "a night light",
};
const basket = { id: "basket", name: "2 things", cents: 2248 };

it("records a basket as one request with its lines", async () => {
  expect(await ask(basket, undefined, [aa, light])).toBe(true);

  expect(await latest()).toMatchObject({ item: basket, found: null, lines: [aa, light], leftOut: null, status: "waiting" });

  await sql("TRUNCATE purchase_requests");
  await ask(glasses);
  expect(await latest()).toMatchObject({ lines: null, leftOut: null });
});

it("keeps only the ticked lines, by their stored prices", () => {
  expect(keep([aa, light], ["prod_3Ba7aA", "prod_made_up"])).toEqual({
    lines: [aa],
    leftOut: ["a night light"],
    cents: 999,
  });
  expect(keep([aa, light], ["prod_6Nl2tL", "prod_3Ba7aA"])).toEqual({ lines: [aa, light], leftOut: [], cents: 2248 });
  expect(keep([aa, light], [])).toBeNull();
  expect(keep([aa, light], ["prod_made_up"])).toBeNull();
});

it("claims a basket for the ticked lines only, and only once", async () => {
  await ask(basket, undefined, [aa, light]);
  const { id } = (await latest())!;

  expect(await claim(id, ["prod_3Ba7aA"])).toMatchObject({
    status: "paying",
    item: { id: "basket", name: "1 thing", cents: 999 },
    lines: [aa],
    leftOut: ["a night light"],
  });
  expect(await claim(id, ["prod_3Ba7aA", "prod_6Nl2tL"])).toBeNull();
  expect((await latest())?.item.cents).toBe(999);
});

it("claims a whole basket with nothing left out, and refuses to claim one with nothing ticked", async () => {
  await ask(basket, undefined, [aa, light]);
  const { id } = (await latest())!;

  expect(await claim(id, [])).toBeNull();
  expect(await claim(id, ["prod_made_up"])).toBeNull();
  expect((await latest())?.status).toBe("waiting");

  expect(await claim(id, ["prod_3Ba7aA", "prod_6Nl2tL"])).toMatchObject({
    item: basket,
    lines: [aa, light],
    leftOut: null,
  });
});

it("keeps Sam's price limit, $50 until Sam sets one", async () => {
  expect(await getLimit()).toBe(5000);

  await setLimit(3000);
  expect(await getLimit()).toBe(3000);

  await expect(setLimit(300)).rejects.toThrow();
  expect(await getLimit()).toBe(3000);
});

const samPhone = {
  endpoint: "https://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4:APA91bH7",
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};
const rosePhone = {
  endpoint: "https://web.push.apple.com/QGuQyavXutnMH8Ig",
  p256dh: "BOVFfCoBB_N3lMHGrNTmFkzcTQKRhbVpzA2D5cNZRRyiAFTTrVrBwJkj5d8xLxLBNjYqGmQ7gT0nEDpVh3o0Wcc",
  auth: "8eDyX_uCN0XRhSbY5hs7Hg",
};

it("keeps each phone once under the person who turned it on, until it's forgotten", async () => {
  await saveSubscription("sam", samPhone);
  await saveSubscription("sam", { ...samPhone, auth: "Kp0vR3tYq8wZ1sXc5nBm2A" });
  await saveSubscription("rose", rosePhone);

  expect(await subscriptionsFor("sam")).toEqual([{ ...samPhone, auth: "Kp0vR3tYq8wZ1sXc5nBm2A" }]);
  expect(await subscriptionsFor("rose")).toEqual([rosePhone]);

  await forgetSubscription(samPhone.endpoint);
  expect(await subscriptionsFor("sam")).toEqual([]);
  expect(await subscriptionsFor("rose")).toEqual([rosePhone]);
});
