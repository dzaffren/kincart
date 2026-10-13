import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "./items";
import { pay, settleStuck } from "./pay";
import { ask, claim, latest, saveVault } from "./requests";

const glasses = ITEMS[0];

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
  await ask(glasses);
  return (await claim((await latest())!.id))!;
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
  await saveVault("1j970427g9944212v");
  stubOrders(completed);

  await pay(await claimedGlasses());

  expect(await latest()).toMatchObject({ status: "paid", captureId: "7BM91101S1572292D" });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^purchase id=\d+ item=glasses status=paid capture=7BM91101S1572292D$/));
});

it("leaves an unknown charge paying, then settles it with the same request id", async () => {
  await saveVault("1j970427g9944212v");
  const fetch = stubOrders(() => new Response("", { status: 503 }), completed);
  const request = await claimedGlasses();

  await pay(request);
  expect((await latest())?.status).toBe("paying");

  await sql(`UPDATE purchase_requests SET answered_at = now() - interval '20 seconds' WHERE id = ${request.id}`);
  await settleStuck();
  expect((await latest())?.status).toBe("paid");

  const ids = (fetch.mock.calls as unknown as [string, RequestInit][])
    .filter(([url]) => url.endsWith("/v2/checkout/orders"))
    .map(([, init]) => (init.headers as Record<string, string>)["PayPal-Request-Id"]);
  expect(ids).toEqual([`purchase-${request.id}`, `purchase-${request.id}`]);
});

it("fails the request when no PayPal is saved, without calling PayPal", async () => {
  const fetch = stubOrders();

  await pay(await claimedGlasses());

  expect(await latest()).toMatchObject({ status: "failed", failureReason: "not linked" });
  expect(fetch).not.toHaveBeenCalled();
});
