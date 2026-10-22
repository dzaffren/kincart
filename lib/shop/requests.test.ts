import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "./items";
import {
  ask,
  copyDemoVault,
  claim,
  clearSearch,
  countUse,
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
  takeUse,
} from "./requests";

const [glasses, pills, batteries] = ITEMS;

// Household 1: the links in Vercel's env (D45).
const owner = 1;

async function sql(text: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text)).rows;
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  await sql("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions; DELETE FROM households WHERE id <> 1; DELETE FROM address_uses; DELETE FROM usage_days");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
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

it("keeps how many photos Rose's current search read and how many showed nothing to buy", async () => {
  await saveSearch(owner, "CR2032 coin battery", { outcome: "options", options: [strap] }, 1);
  expect(await getSearch(owner)).toMatchObject({
    words: "CR2032 coin battery",
    outcome: "options",
    fromPhoto: true,
    photos: 1,
    blankPhotos: 0,
  });

  await saveSearch(owner, "CR2032 coin battery, grey slippers", { outcome: "basket", groups: [] }, 3, 1);
  expect(await getSearch(owner)).toMatchObject({ outcome: "basket", fromPhoto: true, photos: 3, blankPhotos: 1 });

  await saveSearch(owner, "", { outcome: "nothing in photo" }, 2);
  expect(await getSearch(owner)).toMatchObject({ words: "", outcome: "nothing in photo", fromPhoto: true, photos: 2 });

  await saveSearch(owner, "CR2032 coin battery", { outcome: "retry" });
  expect(await getSearch(owner)).toMatchObject({ outcome: "retry", fromPhoto: false, photos: 0, blankPhotos: 0 });
});

it("keeps a search's query, and whether Find another ran it", async () => {
  await saveSearch(owner, "warm slippers that are easy to put on, size 8", {
    outcome: "options",
    options: [strap],
    query: "warm slip-on slippers size 8",
  });
  expect(await getSearch(owner)).toMatchObject({ query: "warm slip-on slippers size 8", tried: false });

  await saveSearch(owner, "a lamp for reading in bed", { outcome: "over limit", query: "bedside reading lamp" }, 0, 0, true);
  expect(await getSearch(owner)).toMatchObject({ outcome: "over limit", query: "bedside reading lamp", tried: true });

  await saveSearch(owner, "AA batteries, something to grip jar lids", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [strap], query: "AA batteries" },
      { thing: "something to grip jar lids", options: [], problem: "nothing found", query: "jar opener", tried: true },
    ],
  });
  expect(await getSearch(owner)).toMatchObject({
    query: null,
    tried: false,
    groups: [
      { thing: "AA batteries", query: "AA batteries" },
      { thing: "something to grip jar lids", query: "jar opener", tried: true },
    ],
  });

  await saveSearch(owner, "a lamp for reading in bed", { outcome: "retry" });
  expect(await getSearch(owner)).toMatchObject({ query: null, tried: false });

  const empty = [
    { thing: "AA batteries", options: [], problem: "nothing found" as const, query: "AA batteries" },
    { thing: "something to grip jar lids", options: [], problem: "over limit" as const, query: "jar lid grip" },
  ];
  await saveSearch(owner, "AA batteries, something to grip jar lids", { outcome: "nothing found", groups: empty });
  expect(await getSearch(owner)).toMatchObject({ outcome: "nothing found", groups: empty });
});

it("keeps each pick's thing, query and listing id with the ask, after Sam's OK too", async () => {
  const queries = [{ id: strap.id, thing: "warm slippers that are easy to put on, size 8", query: "warm slip-on slippers size 8" }];
  await ask(owner, strap, { shop: strap.shop, url: strap.url, reason: strap.why }, undefined, queries);
  expect((await latest(owner))?.queries).toEqual(queries);

  await sql("TRUNCATE purchase_requests");
  const picks = [
    { id: aa.id, thing: "AA batteries", query: "AA batteries" },
    { id: light.id, thing: "a night light", query: "plug-in night light" },
  ];
  await ask(owner, basket, undefined, [aa, light], picks);
  const { id } = (await latest(owner))!;
  await claim(owner, id, [aa.id]);
  expect(await latest(owner)).toMatchObject({ lines: [aa], leftOut: ["a night light"], queries: picks });

  await sql("TRUNCATE purchase_requests");
  await ask(owner, glasses);
  expect((await latest(owner))?.queries).toBeNull();
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

it("copies household 1's saved PayPal into a household that skips, but never over one it linked", async () => {
  await saveVault(owner, "1j970427g9944212v");
  const skipped = await startHousehold("rose-hash-4e5f", "sam-hash-4e5f");
  const linked = await startHousehold("rose-hash-6a7b", "sam-hash-6a7b");
  await saveVault(linked, "8kf02113h7720954x");

  expect(await copyDemoVault(skipped)).toBe(true);
  expect(await getVault(skipped)).toBe("1j970427g9944212v");
  expect(await copyDemoVault(linked)).toBe(false);
  expect(await getVault(linked)).toBe("8kf02113h7720954x");
});

it("copies nothing when household 1 has no saved PayPal", async () => {
  const skipped = await startHousehold("rose-hash-8c9d", "sam-hash-8c9d");

  expect(await copyDemoVault(skipped)).toBe(false);
  expect(await getVault(skipped)).toBeNull();
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

// count uses for one address, the oldest `hours` ago and the rest a minute apart after it.
async function used(kind: string, address: string, count: number, hours: number) {
  await sql(
    `INSERT INTO address_uses (kind, address, used_at) VALUES ('${kind}', '${address}',
       ARRAY(SELECT now() - interval '${hours} hours' + n * interval '1 minute' FROM generate_series(0, ${count - 1}) n))`,
  );
}

async function stored(kind: string, address: string): Promise<number> {
  const [row] = await sql(`SELECT cardinality(used_at) AS n FROM address_uses WHERE kind = '${kind}' AND address = '${address}'`);
  return row?.n ?? 0;
}

it("lets an address take the day's last place, then says when its oldest use turns a day old", async () => {
  await used("find", "key-a", 19, 21);

  expect(await takeUse("find", "key-a", 20)).toBeNull();
  const until = await takeUse("find", "key-a", 20);

  expect(until!.getTime() - Date.now()).toBeGreaterThan(3 * 60 * 60 * 1000 - 5000);
  expect(until!.getTime() - Date.now()).toBeLessThan(3 * 60 * 60 * 1000 + 5000);
  expect(await stored("find", "key-a")).toBe(20);
});

it("drops a use once it is 24 hours old, so its place is free again", async () => {
  await used("find", "key-a", 20, 24.01);

  expect(await takeUse("find", "key-a", 20)).toBeNull();
  expect(await stored("find", "key-a")).toBe(20);
});

it("lets exactly 20 of 30 Finds at once through", async () => {
  const results = await Promise.all(Array.from({ length: 30 }, () => takeUse("find", "key-a", 20)));

  expect(results.filter((until) => until === null)).toHaveLength(20);
  expect(await stored("find", "key-a")).toBe(20);
});

it("counts Finds and households apart, and each address apart", async () => {
  await used("household", "key-a", 5, 2);

  expect(await takeUse("household", "key-a", 5)).toBeInstanceOf(Date);
  expect(await takeUse("find", "key-a", 20)).toBeNull();
  expect(await takeUse("household", "key-b", 5)).toBeNull();
});

it("deletes an address once its newest use is a day old", async () => {
  await used("find", "key-old", 3, 26);

  await takeUse("find", "key-new", 20);

  expect(await stored("find", "key-old")).toBe(0);
  expect(await stored("find", "key-new")).toBe(1);
});

async function today() {
  return sql(
    "SELECT finds, searches, stopped_finds, stopped_households FROM usage_days WHERE day = (now() AT TIME ZONE 'UTC')::date",
  );
}

it("adds each use to today's UTC row, and 30 at once all count", async () => {
  await countUse({ finds: 1, searches: 4 });
  await Promise.all(Array.from({ length: 30 }, () => countUse({ searches: 2, stoppedFinds: 1 })));
  await countUse({ stoppedHouseholds: 1 });

  expect(await today()).toEqual([{ finds: 1, searches: 64, stopped_finds: 30, stopped_households: 1 }]);
});

it("logs a count it can't write, and doesn't throw", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://u:p@127.0.0.1:1/x");
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  await expect(countUse({ finds: 1, searches: 2 })).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledWith(expect.stringMatching(/^usage status=failed reason=.*ECONNREFUSED/));
});
