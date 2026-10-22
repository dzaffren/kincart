import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "./items";
import { pay, settleStuck } from "./pay";
import { ask, claim, latest, saveVault } from "./requests";

const glasses = ITEMS[0];
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

function stubOrders(...answers: (() => Response)[]) {
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/v1/oauth2/token")) return new Response('{"access_token":"A21AA-sandbox"}');
    return answers.shift()!();
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const completed = () =>
  new Response(
    JSON.stringify({
      id: "3BP30887MC6972056",
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{ id: "7BM91101S1572292D", status: "COMPLETED" }] } }],
    }),
    { status: 201 },
  );

async function claimedGlasses() {
  await ask(owner, glasses);
  return (await claim(owner, (await latest(owner))!.id))!;
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  await sql("TRUNCATE purchase_requests; DELETE FROM paypal_vault");
  vi.stubEnv("PAYPAL_CLIENT_ID", "sandbox-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "sandbox-secret");
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("charges Rose's saved PayPal and records the receipt", async () => {
  await saveVault(owner, "1j970427g9944212v");
  stubOrders(completed);

  expect(await pay(await claimedGlasses())).toBe("paid");

  expect(await latest(owner)).toMatchObject({ status: "paid", captureId: "7BM91101S1572292D" });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^purchase id=\d+ item=glasses status=paid capture=7BM91101S1572292D$/));
});

it("sends PayPal only the basket's ticked lines, at the amount Sam saw", async () => {
  await saveVault(owner, "1j970427g9944212v");
  const fetch = stubOrders(completed);
  const line = (id: string, name: string, cents: number, shop: string, thing: string) => ({
    id,
    name,
    cents,
    shop,
    url: `https://www.${shop}/`,
    reason: "It is what Rose asked for.",
    thing,
  });
  const lines = [
    line("prod_8Ee4aA", "Energizer MAX AA Batteries, 8 Pack", 947, "walmart.com", "AA batteries"),
    line("prod_2Ln9nL", "LED Plug-in Night Light, Dusk to Dawn Sensor, 2 Pack", 1299, "amazon.com", "a night light"),
    line("prod_5Ch3wC", "Anker 20W USB-C Wall Charger", 1499, "target.com", "a phone charger"),
  ];
  await ask(owner, { id: "basket", name: "3 things", cents: 3745 }, undefined, lines);
  const request = (await claim(owner, (await latest(owner))!.id, ["prod_8Ee4aA", "prod_2Ln9nL"]))!;

  expect(await pay(request)).toBe("paid");

  const [, init] = (fetch.mock.calls as unknown as [string, RequestInit][]).find(([url]) => url.endsWith("/v2/checkout/orders"))!;
  const [unit] = JSON.parse(String(init.body)).purchase_units;
  expect(unit.items.map((item: { name: string; unit_amount: { value: string } }) => [item.name, item.unit_amount.value])).toEqual([
    ["Energizer MAX AA Batteries, 8 Pack", "9.47"],
    ["LED Plug-in Night Light, Dusk to Dawn Sensor, 2 Pack", "12.99"],
  ]);
  expect(unit.amount.value).toBe("22.46");
  expect(request.item.cents).toBe(2246);
});

it("leaves an unknown charge paying, then settles it with the same request id", async () => {
  await saveVault(owner, "1j970427g9944212v");
  const fetch = stubOrders(() => new Response("", { status: 503 }), completed);
  const request = await claimedGlasses();

  expect(await pay(request)).toBe("unknown");
  expect((await latest(owner))?.status).toBe("paying");
  expect(await settleStuck(owner)).toBeNull();

  await sql(`UPDATE purchase_requests SET answered_at = now() - interval '20 seconds' WHERE id = ${request.id}`);
  expect(await settleStuck(owner)).toMatchObject({ request: { id: request.id, item: glasses }, result: "paid" });
  expect((await latest(owner))?.status).toBe("paid");

  const ids = (fetch.mock.calls as unknown as [string, RequestInit][])
    .filter(([url]) => url.endsWith("/v2/checkout/orders"))
    .map(([, init]) => (init.headers as Record<string, string>)["PayPal-Request-Id"]);
  const key = `purchase-${request.id}-${request.askedAt.getTime()}`;
  expect(ids).toEqual([key, key]);
});

it("reports a payment only from the call that recorded it, so two overlapping settles ping Rose once", async () => {
  await saveVault(owner, "1j970427g9944212v");
  stubOrders(completed, completed);
  const request = await claimedGlasses();

  expect(await pay(request)).toBe("paid");
  expect(await pay(request)).toBe("unknown");
  expect((await latest(owner))?.status).toBe("paid");
});

it("sends a new request id when a fresh database reuses a request's number", async () => {
  await saveVault(owner, "1j970427g9944212v");
  const fetch = stubOrders(completed, completed);

  await sql("TRUNCATE purchase_requests RESTART IDENTITY");
  const first = await claimedGlasses();
  await pay(first);
  await sql("TRUNCATE purchase_requests RESTART IDENTITY");
  const second = await claimedGlasses();
  await pay(second);

  const ids = (fetch.mock.calls as unknown as [string, RequestInit][])
    .filter(([url]) => url.endsWith("/v2/checkout/orders"))
    .map(([, init]) => (init.headers as Record<string, string>)["PayPal-Request-Id"]);
  expect(second.id).toBe(first.id);
  expect(ids[1]).not.toBe(ids[0]);
});

it("fails the request when no PayPal is saved, without calling PayPal", async () => {
  const fetch = stubOrders();

  expect(await pay(await claimedGlasses())).toBe("refused");

  expect(await latest(owner)).toMatchObject({ status: "failed", failureReason: "not linked" });
  expect(fetch).not.toHaveBeenCalled();
});
