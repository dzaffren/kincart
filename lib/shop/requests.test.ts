import pg from "pg";
import { beforeAll, beforeEach, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "./items";
import {
  ask,
  claim,
  clearSearch,
  decline,
  getLimit,
  getSearch,
  getVault,
  latest,
  record,
  saveSearch,
  saveVault,
  setLimit,
  stuck,
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
  await sql("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit");
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

it("ignores a second ask while one is still open", async () => {
  await ask(glasses);
  await ask(batteries);

  expect((await latest())?.item.id).toBe("glasses");
});

it("lets only the first OK claim a request", async () => {
  await ask(glasses);
  const { id } = (await latest())!;

  expect((await claim(id))?.status).toBe("paying");
  expect(await claim(id)).toBeNull();
  expect(await decline(id)).toBe(false);
});

it("declines a waiting request, after which Rose can ask again", async () => {
  await ask(batteries);
  const { id } = (await latest())!;

  expect(await decline(id)).toBe(true);
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

  await saveSearch("milk, bread and eggs", { outcome: "several" });
  expect(await getSearch()).toMatchObject({ words: "milk, bread and eggs", outcome: "several", options: [] });

  await clearSearch();
  expect(await getSearch()).toBeNull();
});

it("keeps Sam's price limit, $50 until Sam sets one", async () => {
  expect(await getLimit()).toBe(5000);

  await setLimit(3000);
  expect(await getLimit()).toBe(3000);

  await expect(setLimit(300)).rejects.toThrow();
  expect(await getLimit()).toBe(3000);
});
