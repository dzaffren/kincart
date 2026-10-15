import pg from "pg";
import { beforeAll, beforeEach, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "./items";
import {
  ask,
  claim,
  clearSearch,
  decline,
  findHousehold,
  forgetSubscription,
  getLimit,
  getSearch,
  getTotal,
  getVault,
  keep,
  latest,
  record,
  saveSearch,
  saveSubscription,
  saveVault,
  setLimit,
  setTotal,
  startHousehold,
  stuck,
  subscriptionsFor,
} from "./requests";

const [glasses, pills, batteries] = ITEMS;

// Household 1: the links in Vercel's env (D45).
const owner = 1;

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
  await sql("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions; DELETE FROM households WHERE id <> 1");
});

it("keeps one saved PayPal, replaced when Rose links again", async () => {
  expect(await getVault(owner)).toBeNull();
  await saveVault(owner, "1j970427g9944212v");
  await saveVault(owner, "8kf02113h7720954x");
  expect(await getVault(owner)).toBe("8kf02113h7720954x");
});

it("records an ask as waiting, with the item's name and price copied in", async () => {
  await ask(owner, glasses);

  expect(await latest(owner)).toMatchObject({
    item: { id: "glasses", name: "Reading glasses, +2.00", cents: 1899 },
    status: "waiting",
    answeredAt: null,
  });
});

it("ignores a second ask while one is still open, and says which ask made a request", async () => {
  expect(await ask(owner, glasses)).toBe(true);
  expect(await ask(owner, batteries)).toBe(false);

  expect((await latest(owner))?.item.id).toBe("glasses");
});

it("lets only the first OK claim a request", async () => {
  await ask(owner, glasses);
  const { id } = (await latest(owner))!;

  expect((await claim(owner, id))?.status).toBe("paying");
  expect(await claim(owner, id)).toBeNull();
  expect(await decline(owner, id)).toBeNull();
});

it("declines a waiting request, after which Rose can ask again", async () => {
  await ask(owner, batteries);
  const { id } = (await latest(owner))!;

  expect(await decline(owner, id)).toMatchObject({ id, item: batteries, status: "declined" });
  expect((await latest(owner))?.status).toBe("declined");

  await ask(owner, pills);
  expect((await latest(owner))?.item.id).toBe("pills");
});

it("records a paid charge with PayPal's ids", async () => {
  await ask(owner, glasses);
  const { id } = (await latest(owner))!;
  await claim(owner, id);
  await record(id, { state: "paid", orderId: "3BP30887MC6972056", captureId: "7BM91101S1572292D" });

  expect(await latest(owner)).toMatchObject({
    status: "paid",
    orderId: "3BP30887MC6972056",
    captureId: "7BM91101S1572292D",
  });
});

it("records a refused charge with the reason", async () => {
  await ask(owner, pills);
  const { id } = (await latest(owner))!;
  await claim(owner, id);
  await record(id, { state: "refused", reason: "PERMISSION_DENIED" });

  expect(await latest(owner)).toMatchObject({ status: "failed", failureReason: "PERMISSION_DENIED" });
});

it("finds a charge left paying for over 15 seconds, and not a fresh one", async () => {
  await ask(owner, glasses);
  const { id } = (await latest(owner))!;
  await claim(owner, id);
  expect(await stuck(owner)).toBeNull();

  await sql(`UPDATE purchase_requests SET answered_at = now() - interval '20 seconds' WHERE id = ${id}`);
  expect((await stuck(owner))?.id).toBe(id);
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

it("records an ask from a search with the shop, the link, the reason it fits, the note and the photo", async () => {
  await ask(owner, strap, { shop: strap.shop, url: strap.url, reason: strap.why, watch: strap.watch, imageUrl: strap.imageUrl });

  expect(await latest(owner)).toMatchObject({
    item: { id: "prod_9Wz4hY", name: "Adjustable Wide Slippers with Hook-and-Loop Strap", cents: 3250 },
    found: {
      shop: "amazon.com",
      url: "https://www.amazon.com/dp/B0C7WIDE21",
      reason: strap.why,
      watch: strap.watch,
      imageUrl: "https://cdn.trychannel3.com/prod_9Wz4hY",
    },
  });

  await sql("TRUNCATE purchase_requests");
  await ask(owner, glasses);
  expect((await latest(owner))?.found).toBeNull();
});

it("leaves out the note and the photo of an ask that has none, as an ask from before they were kept", async () => {
  await ask(owner, strap, { shop: strap.shop, url: strap.url, reason: strap.why });

  expect((await latest(owner))?.found).toEqual({ shop: "amazon.com", url: strap.url, reason: strap.why });
});

it("keeps Rose's one current search until the next one or a clear", async () => {
  expect(await getSearch(owner)).toBeNull();

  await saveSearch(owner, "warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });
  expect(await getSearch(owner)).toMatchObject({
    words: "warm slippers that are easy to put on, size 8",
    outcome: "options",
    options: [strap],
  });

  await saveSearch(owner, "AA batteries, a tablet for video calls", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [strap] },
      { thing: "a tablet for video calls", options: [], problem: "over limit" },
    ],
  });
  expect(await getSearch(owner)).toMatchObject({
    outcome: "basket",
    options: [],
    groups: [
      { thing: "AA batteries", options: [strap] },
      { thing: "a tablet for video calls", options: [], problem: "over limit" },
    ],
  });

  await saveSearch(owner, "batteries, a night light, a phone charger, a doormat, a kettle and a flashlight", {
    outcome: "too many",
  });
  expect(await getSearch(owner)).toMatchObject({ outcome: "too many", options: [], groups: [] });

  await clearSearch(owner);
  expect(await getSearch(owner)).toBeNull();
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
  expect(await ask(owner, basket, undefined, [aa, light])).toBe(true);

  expect(await latest(owner)).toMatchObject({ item: basket, found: null, lines: [aa, light], leftOut: null, status: "waiting" });

  await sql("TRUNCATE purchase_requests");
  await ask(owner, glasses);
  expect(await latest(owner)).toMatchObject({ lines: null, leftOut: null });
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
  await ask(owner, basket, undefined, [aa, light]);
  const { id } = (await latest(owner))!;

  expect(await claim(owner, id, ["prod_3Ba7aA"])).toMatchObject({
    status: "paying",
    item: { id: "basket", name: "1 thing", cents: 999 },
    lines: [aa],
    leftOut: ["a night light"],
  });
  expect(await claim(owner, id, ["prod_3Ba7aA", "prod_6Nl2tL"])).toBeNull();
  expect((await latest(owner))?.item.cents).toBe(999);
});

it("claims a whole basket with nothing left out, and refuses to claim one with nothing ticked", async () => {
  await ask(owner, basket, undefined, [aa, light]);
  const { id } = (await latest(owner))!;

  expect(await claim(owner, id, [])).toBeNull();
  expect(await claim(owner, id, ["prod_made_up"])).toBeNull();
  expect((await latest(owner))?.status).toBe("waiting");

  expect(await claim(owner, id, ["prod_3Ba7aA", "prod_6Nl2tL"])).toMatchObject({
    item: basket,
    lines: [aa, light],
    leftOut: null,
  });
});

it("keeps Sam's price limit, $50 until Sam sets one", async () => {
  expect(await getLimit(owner)).toBe(5000);

  await setLimit(owner, 3000);
  expect(await getLimit(owner)).toBe(3000);

  await expect(setLimit(owner, 300)).rejects.toThrow();
  expect(await getLimit(owner)).toBe(3000);
});

it("keeps no total limit until Sam sets one, and clears it", async () => {
  expect(await getTotal(owner)).toBeNull();

  await setTotal(owner, 4000);
  expect(await getTotal(owner)).toBe(4000);

  await expect(setTotal(owner, 300)).rejects.toThrow();
  expect(await getTotal(owner)).toBe(4000);

  await setTotal(owner, null);
  expect(await getTotal(owner)).toBeNull();
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
  await saveSubscription(owner, "sam", samPhone);
  await saveSubscription(owner, "sam", { ...samPhone, auth: "Kp0vR3tYq8wZ1sXc5nBm2A" });
  await saveSubscription(owner, "rose", rosePhone);

  expect(await subscriptionsFor(owner, "sam")).toEqual([{ ...samPhone, auth: "Kp0vR3tYq8wZ1sXc5nBm2A" }]);
  expect(await subscriptionsFor(owner, "rose")).toEqual([rosePhone]);

  await forgetSubscription(samPhone.endpoint);
  expect(await subscriptionsFor(owner, "sam")).toEqual([]);
  expect(await subscriptionsFor(owner, "rose")).toEqual([rosePhone]);
});

it("starts a household with no saved PayPal, even when household 1 has one, and finds it by either link's hash", async () => {
  await saveVault(owner, "1j970427g9944212v");
  const fresh = await startHousehold("rose-hash-2c3d", "sam-hash-2c3d");
  expect(await getVault(fresh)).toBeNull();
  expect(await getVault(owner)).toBe("1j970427g9944212v");

  expect(await findHousehold("rose-hash-2c3d")).toEqual({ household: fresh, person: "rose" });
  expect(await findHousehold("sam-hash-2c3d")).toEqual({ household: fresh, person: "sam" });
  expect(await findHousehold("rose-hash-ffff")).toBeNull();
});

it("keeps each household's asks, searches, limits, saved PayPal and phones apart", async () => {
  await saveVault(owner, "1j970427g9944212v");
  const ana = await startHousehold("rose-hash-ana", "sam-hash-ana");
  const ben = await startHousehold("rose-hash-ben", "sam-hash-ben");

  expect(await ask(ana, batteries)).toBe(true);
  expect(await ask(ben, light)).toBe(true);
  expect((await latest(ana))?.item.id).toBe("batteries");
  expect((await latest(ben))?.item.id).toBe("prod_6Nl2tL");
  expect(await latest(owner)).toBeNull();

  await saveSearch(ana, "warm slippers", { outcome: "options", options: [strap] });
  await setLimit(ana, 3000);
  await setTotal(ana, 2000);
  await saveSubscription(ana, "sam", samPhone);
  await saveVault(ben, "8kf02113h7720954x");

  expect(await getSearch(ben)).toBeNull();
  expect(await getLimit(ben)).toBe(5000);
  expect(await getTotal(ben)).toBeNull();
  expect(await subscriptionsFor(ben, "sam")).toEqual([]);
  expect(await subscriptionsFor(ana, "sam")).toEqual([samPhone]);
  expect(await getVault(ana)).toBeNull();
  expect(await getVault(ben)).toBe("8kf02113h7720954x");
  expect(await getVault(owner)).toBe("1j970427g9944212v");
});

it("lets only a household's own Sam claim or decline its ask, and finds only its own stuck charge", async () => {
  const ana = await startHousehold("rose-hash-ana", "sam-hash-ana");
  const ben = await startHousehold("rose-hash-ben", "sam-hash-ben");
  await ask(ana, glasses);
  const { id } = (await latest(ana))!;

  expect(await claim(ben, id)).toBeNull();
  expect(await decline(ben, id)).toBeNull();
  expect((await latest(ana))?.status).toBe("waiting");

  expect((await claim(ana, id))?.household).toBe(ana);
  await sql(`UPDATE purchase_requests SET answered_at = now() - interval '20 seconds' WHERE id = ${id}`);
  expect(await stuck(ben)).toBeNull();
  expect((await stuck(ana))?.id).toBe(id);
});
