import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "../../lib/shop/items";
import { notify } from "../../lib/shop/push";
import {
  ask,
  getLimit,
  getSearch,
  getTotal,
  latest,
  saveSearch,
  saveVault,
  subscriptionsFor,
} from "../../lib/shop/requests";
import { answer, askSam, find, setLimit, setTotal, startLink, subscribe, tryAgain } from "./actions";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // No request surrounds these calls, so after() runs its task at once. Like Next, it keeps a failed task to itself.
  after: (task: () => unknown) => {
    Promise.resolve(task()).catch(() => {});
  },
}));

vi.mock("../../lib/shop/push", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/shop/push")>()),
  notify: vi.fn(),
}));

const [glasses] = ITEMS;
const rose = "rose-link-4f9c2a7e";
const sam = "sam-link-b81d5e30";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions");
  await client.end();
  await saveVault("1j970427g9944212v");
  vi.stubEnv("ROSE_LINK_TOKEN", rose);
  vi.stubEnv("SAM_LINK_TOKEN", sam);
  vi.stubEnv("VAPID_PUBLIC_KEY", "vapid-test-public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "vapid-test-private-key");
  vi.stubEnv("VAPID_SUBJECT", "https://kincart.vercel.app");
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(notify).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("won't answer for Sam from Rose's link or a made-up one", async () => {
  await ask(glasses);
  const { id } = (await latest())!;

  await expect(answer(rose, id, form({ answer: "ok" }))).resolves.toBeUndefined();
  await expect(answer("not-a-real-link", id, form({ answer: "ok" }))).resolves.toBeUndefined();
  await expect(answer(rose, id, form({ answer: "no" }))).resolves.toBeUndefined();

  expect((await latest())!.status).toBe("waiting");
  expect(fetch).not.toHaveBeenCalled();
});

it("won't ask or link for Rose from Sam's link", async () => {
  await expect(askSam(sam, form({ item: "glasses" }))).resolves.toBeUndefined();
  await expect(startLink(sam)).resolves.toBeUndefined();

  expect(await latest()).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

const strap = {
  id: "prod_9Wz4hY",
  name: "Adjustable Wide Slippers with Hook-and-Loop Strap",
  cents: 3250,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B0C7WIDE21",
  what: "Wide slippers that open across the top and close with a strap.",
  why: "You open them right up to put them on, then press the strap shut.",
  watch: "They're a wide fit, so they may feel loose on a narrow foot.",
};

async function redirectOf(action: Promise<void>): Promise<string> {
  const error = await action.then(
    () => null,
    (thrown: { digest?: string }) => thrown,
  );
  return error?.digest?.split(";")[2] ?? "no redirect";
}

function searchOn() {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
  vi.stubEnv("CHANNEL3_API_KEY", "c3-test-key");
}

it("won't find, try again or set the limit from the wrong person's link", async () => {
  searchOn();
  await saveSearch("warm slippers", { outcome: "options", options: [strap] });

  await expect(find(sam, form({ words: "warm slippers" }))).resolves.toBeUndefined();
  await expect(tryAgain(sam)).resolves.toBeUndefined();
  await expect(setLimit(rose, form({ limit: "30" }))).resolves.toBeUndefined();

  expect((await getSearch())?.outcome).toBe("options");
  expect(await getLimit()).toBe(5000);
  expect(fetch).not.toHaveBeenCalled();
});

it("finds with Rose's words and keeps the result, and asks for words when the box is empty", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  const six = ["batteries", "a night light", "a phone charger", "a doormat", "a kettle", "a flashlight"];
  const things = JSON.stringify({ things: six.map((thing) => ({ words: thing, query: thing })) });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ content: [{ type: "text", text: things }], stop_reason: "end_turn" })),
  );

  expect(await redirectOf(find(rose, form({ words: `  ${six.join(", ")} ` })))).toBe(`/r/${rose}`);
  expect(await getSearch()).toMatchObject({ words: six.join(", "), outcome: "too many" });

  expect(await redirectOf(find(rose, form({ words: "   " })))).toBe(`/r/${rose}?find=empty`);
});

it("asks Sam for the picked listing at the saved search's price, never the form's", async () => {
  searchOn();
  await saveSearch("warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });

  expect(await redirectOf(askSam(rose, form({ listing: "prod_madeUp1", cents: "1" })))).toBe(`/r/${rose}?pick=missing`);
  expect(await latest()).toBeNull();

  expect(await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY", cents: "1" })))).toBe(`/r/${rose}`);
  expect(await latest()).toMatchObject({
    item: { id: "prod_9Wz4hY", cents: 3250 },
    found: { shop: "amazon.com", url: strap.url, reason: strap.why },
  });
  expect(await getSearch()).toBeNull();
});

it("keeps Rose's words when Rose tries other words", async () => {
  searchOn();
  await saveSearch("warm slippers", { outcome: "options", options: [strap] });

  expect(await redirectOf(tryAgain(rose))).toBe(`/r/${rose}`);
  expect(await getSearch()).toMatchObject({ words: "warm slippers", outcome: "retry", options: [] });
});

it("saves Sam's limit in whole dollars from $5 to $500, and refuses anything else", async () => {
  expect(await redirectOf(setLimit(sam, form({ limit: "30" })))).toBe(`/h/${sam}?limit=saved`);
  expect(await getLimit()).toBe(3000);

  for (const limit of ["3", "501", "30.5", "abc", ""]) {
    expect(await redirectOf(setLimit(sam, form({ limit })))).toBe(`/h/${sam}?limit=invalid`);
  }
  expect(await getLimit()).toBe(3000);
});

it("saves Sam's total limit in whole dollars from $5 to $2,500, clears it when empty, and refuses anything else", async () => {
  expect(await redirectOf(setTotal(sam, form({ total: "40" })))).toBe(`/h/${sam}?total=saved`);
  expect(await getTotal()).toBe(4000);

  for (const total of ["3", "2501", "12.50", "abc"]) {
    expect(await redirectOf(setTotal(sam, form({ total })))).toBe(`/h/${sam}?total=invalid`);
  }
  await expect(setTotal(rose, form({ total: "100" }))).resolves.toBeUndefined();
  expect(await getTotal()).toBe(4000);

  expect(await redirectOf(setTotal(sam, form({ total: " " })))).toBe(`/h/${sam}?total=saved`);
  expect(await getTotal()).toBeNull();
});

const keys = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};
const samPhone = { endpoint: "https://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4:APA91bH7", expirationTime: null, keys };
const rosePhone = { endpoint: "https://web.push.apple.com/QGuQyavXutnMH8Ig", expirationTime: null, keys };

it("saves the phone that turned notifications on, for Sam's link and for Rose's", async () => {
  expect(await subscribe(sam, samPhone)).toBe(true);
  expect(await subscribe(rose, rosePhone)).toBe(true);

  expect(await subscriptionsFor("sam")).toEqual([{ endpoint: samPhone.endpoint, ...keys }]);
  expect(await subscriptionsFor("rose")).toEqual([{ endpoint: rosePhone.endpoint, ...keys }]);
});

it("refuses a phone from a made-up link, one it can't trust, or any while notifications are off", async () => {
  expect(await subscribe("not-a-real-link", samPhone)).toBe(false);
  expect(await subscribe(sam, { ...samPhone, endpoint: "http://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4" })).toBe(false);
  expect(await subscribe(sam, { ...samPhone, endpoint: "https://attacker.example/collect" })).toBe(false);
  expect(await subscribe(sam, { ...samPhone, keys: { p256dh: "not base64url!", auth: keys.auth } })).toBe(false);

  vi.stubEnv("VAPID_PRIVATE_KEY", "");
  expect(await subscribe(sam, samPhone)).toBe(false);

  expect(await subscriptionsFor("sam")).toEqual([]);
});

it("pings Sam when Rose's ask makes a request, and not for a second ask while one is open", async () => {
  searchOn();
  await saveSearch("warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });
  expect(await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY" })))).toBe(`/r/${rose}`);

  expect(notify).toHaveBeenCalledExactlyOnceWith("sam", {
    title: "Rose would like something",
    body: "Adjustable Wide Slippers with Hook-and-Loop Strap, $32.50. Tap to see it and say OK or No.",
  });

  await saveSearch("warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });
  await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY" })));
  expect(notify).toHaveBeenCalledTimes(1);
});

it("pings Sam for an item from the fixed list too", async () => {
  vi.stubEnv("CHANNEL3_API_KEY", "");
  expect(await redirectOf(askSam(rose, form({ item: "glasses" })))).toBe(`/r/${rose}`);

  expect(notify).toHaveBeenCalledExactlyOnceWith("sam", {
    title: "Rose would like something",
    body: "Reading glasses, +2.00, $18.99. Tap to see it and say OK or No.",
  });
});

it("still asks Sam when the push can't go out", async () => {
  vi.stubEnv("CHANNEL3_API_KEY", "");
  vi.mocked(notify).mockRejectedValue(new Error("push service down"));

  expect(await redirectOf(askSam(rose, form({ item: "glasses" })))).toBe(`/r/${rose}`);
  expect(await latest()).toMatchObject({ status: "waiting", item: { id: "glasses" } });
});

function paypalAnswers(order: () => Response) {
  vi.stubEnv("PAYPAL_CLIENT_ID", "sandbox-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "sandbox-secret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("/v1/oauth2/token") ? new Response('{"access_token":"A21AA-sandbox"}') : order(),
    ),
  );
}

const completed = () =>
  Response.json(
    {
      id: "3BP30887MC6972056",
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{ id: "7BM91101S1572292D", status: "COMPLETED" }] } }],
    },
    { status: 201 },
  );

async function samAnswers(choice: "ok" | "no") {
  await ask(glasses);
  const { id } = (await latest())!;
  return redirectOf(answer(sam, id, form({ answer: choice })));
}

it("tells Rose when Sam says no", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  expect(await samAnswers("no")).toBe(`/h/${sam}`);

  expect(notify).toHaveBeenCalledExactlyOnceWith("rose", {
    title: "Sam said no",
    body: "Sam said no to Reading glasses, +2.00. Nothing was taken.",
  });
});

it("tells Rose when Sam's OK is paid, and when PayPal refuses it", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  expect(await samAnswers("ok")).toBe(`/h/${sam}`);
  expect(notify).toHaveBeenCalledExactlyOnceWith("rose", {
    title: "Sam said OK",
    body: "Reading glasses, +2.00 is paid: $18.99. Tap to see the receipt.",
  });

  vi.mocked(notify).mockClear();
  paypalAnswers(() => Response.json({ name: "NOT_AUTHORIZED", details: [{ issue: "PERMISSION_DENIED" }] }, { status: 403 }));
  expect(await samAnswers("ok")).toBe(`/h/${sam}`);
  expect(notify).toHaveBeenCalledExactlyOnceWith("rose", {
    title: "Payment didn't go through",
    body: "Sam said OK, but the payment didn't go through. Nothing was taken.",
  });
});

it("tells Rose nothing while the charge is unknown", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(() => new Response("", { status: 503 }));

  expect(await samAnswers("ok")).toBe(`/h/${sam}`);
  expect((await latest())?.status).toBe("paying");
  expect(notify).not.toHaveBeenCalled();
});

const option = (id: string, name: string, cents: number, shop: string) => ({
  id,
  name,
  cents,
  shop,
  url: `https://www.${shop}/p/${id}`,
  what: `${name}.`,
  why: `Why ${name} fits.`,
  watch: "Check the pack size.",
});
const aa24 = option("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com");
const plugLight = option("prod_6Nl2tL", "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack", 1249, "target.com");
const anker = option("prod_2Ak5cH", "Anker USB-C Wall Charger with 6 ft Cable", 1599, "amazon.com");
const groups = [
  { thing: "AA batteries", options: [aa24] },
  { thing: "a night light", options: [plugLight] },
  { thing: "a phone charger", options: [anker] },
];
const lineOf = (thing: string, { id, name, cents, shop, url, why }: typeof aa24) => ({
  id,
  name,
  cents,
  shop,
  url,
  reason: why,
  thing,
});
const aaLine = lineOf("AA batteries", aa24);
const lightLine = lineOf("a night light", plugLight);

it("asks Sam for two picks as one basket at the saved prices, and pings Sam once", async () => {
  searchOn();
  await saveSearch("AA batteries, a night light and a phone charger", { outcome: "basket", groups });

  const picks = form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_6Nl2tL", "pick-2": "", cents: "1" });
  expect(await redirectOf(askSam(rose, picks))).toBe(`/r/${rose}`);

  expect(await latest()).toMatchObject({
    item: { id: "basket", name: "2 things", cents: 2248 },
    found: null,
    lines: [aaLine, lightLine],
    status: "waiting",
  });
  expect(notify).toHaveBeenCalledExactlyOnceWith("sam", {
    title: "Rose would like 2 things",
    body: "$22.48 in total. Tap to see them and say OK or No.",
  });
  expect(await getSearch()).toBeNull();
});

it("asks Sam for one pick from a basket as one item, and for no pick asks Rose to pick one", async () => {
  searchOn();
  await saveSearch("AA batteries, a night light and a phone charger", { outcome: "basket", groups });

  const none = form({ "pick-0": "", "pick-1": "prod_madeUp1", "pick-2": "" });
  expect(await redirectOf(askSam(rose, none))).toBe(`/r/${rose}?pick=missing`);
  expect(await latest()).toBeNull();

  expect(await redirectOf(askSam(rose, form({ "pick-1": "prod_6Nl2tL" })))).toBe(`/r/${rose}`);
  expect(await latest()).toMatchObject({
    item: { id: "prod_6Nl2tL", cents: 1249 },
    found: { shop: "target.com", url: plugLight.url, reason: plugLight.why },
    lines: null,
  });
});

it("counts a listing picked under two things once", async () => {
  searchOn();
  await saveSearch("AA batteries and batteries for the remote", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24] },
      { thing: "batteries for the remote", options: [aa24] },
    ],
  });

  await redirectOf(askSam(rose, form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_3Ba7aA" })));
  expect(await latest()).toMatchObject({ item: { id: "prod_3Ba7aA", cents: 999 }, lines: null });
});

function ticked(...lines: string[]) {
  const data = form({ answer: "ok" });
  for (const line of lines) data.append("line", line);
  return data;
}

async function chargedValue() {
  const [, init] = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith("/v2/checkout/orders"))!;
  return JSON.parse(String(init!.body)).purchase_units[0].amount.value;
}

it("pays for the ticked lines only, and tells Rose what Sam left out", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  await ask({ id: "basket", name: "2 things", cents: 2248 }, undefined, [aaLine, lightLine]);
  const { id } = (await latest())!;

  expect(await redirectOf(answer(sam, id, ticked("prod_3Ba7aA")))).toBe(`/h/${sam}`);

  expect(await chargedValue()).toBe("9.99");
  expect(await latest()).toMatchObject({
    status: "paid",
    item: { cents: 999 },
    lines: [aaLine],
    leftOut: ["a night light"],
  });
  expect(notify).toHaveBeenCalledExactlyOnceWith("rose", {
    title: "Sam said OK",
    body: "Sam paid $9.99 for 1 thing and left out a night light. Tap to see the receipt.",
  });
});

it("pays for the whole basket when Sam leaves both ticked", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  await ask({ id: "basket", name: "2 things", cents: 2248 }, undefined, [aaLine, lightLine]);
  const { id } = (await latest())!;

  await redirectOf(answer(sam, id, ticked("prod_3Ba7aA", "prod_6Nl2tL")));

  expect(await chargedValue()).toBe("22.48");
  expect(await latest()).toMatchObject({ status: "paid", item: { cents: 2248 }, leftOut: null });
  expect(notify).toHaveBeenCalledExactlyOnceWith("rose", {
    title: "Sam said OK",
    body: "Your 2 things are paid: $22.48. Tap to see the receipt.",
  });
});

it("charges nothing when Sam's OK has nothing ticked, and tells Rose when Sam says no to a basket", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  await ask({ id: "basket", name: "2 things", cents: 2248 }, undefined, [aaLine, lightLine]);
  const { id } = (await latest())!;

  expect(await redirectOf(answer(sam, id, ticked()))).toBe(`/h/${sam}`);
  expect((await latest())?.status).toBe("waiting");
  expect(fetch).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();

  await redirectOf(answer(sam, id, form({ answer: "no", line: "prod_3Ba7aA" })));
  expect((await latest())?.status).toBe("declined");
  expect(notify).toHaveBeenCalledExactlyOnceWith("rose", {
    title: "Sam said no",
    body: "Sam said no to your 2 things. Nothing was taken.",
  });
});
