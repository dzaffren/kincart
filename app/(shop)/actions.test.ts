import pg from "pg";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "../../lib/shop/items";
import { addressOf, keyOf } from "../../lib/shop/limits";
import { hashOf, whoIs } from "../../lib/shop/people";
import { notify } from "../../lib/shop/push";
import {
  ask,
  claim,
  decline,
  getLimit,
  getSearch,
  getTotal,
  getVault,
  latest,
  record,
  saveSearch,
  saveVault,
  setTotal as saveTotal,
  startHousehold,
  subscriptionsFor,
} from "../../lib/shop/requests";
import {
  answer,
  askSam,
  find,
  findAnother,
  rebuy,
  setLimit,
  setTotal,
  skipLink,
  start,
  startLink,
  subscribe,
  tryAgain,
} from "./actions";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // No request surrounds these calls, so after() runs its task at once. Like Next, it keeps a failed task to itself.
  after: (task: () => unknown) => {
    Promise.resolve(task()).catch(() => {});
  },
}));

// This browser's cookies, as start() sets and reads them, and the address Vercel says it came from.
const jar = vi.hoisted(() => new Map<string, { value: string; options?: object }>());
const client = vi.hoisted(() => ({ address: "203.0.113.7" }));

vi.mock("next/headers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/headers")>()),
  cookies: async () => ({
    has: (name: string) => jar.has(name),
    set: (name: string, value: string, options?: object) => jar.set(name, { value, options }),
  }),
  headers: async () => new Headers({ "x-forwarded-for": client.address }),
}));

vi.mock("../../lib/shop/push", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/shop/push")>()),
  notify: vi.fn(),
}));

const [glasses] = ITEMS;
const rose = "rose-link-4f9c2a7e";
const sam = "sam-link-b81d5e30";
const owner = 1;

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions; DELETE FROM households WHERE id <> 1; DELETE FROM address_uses; DELETE FROM usage_days");
  await db.end();
  await saveVault(owner, "1j970427g9944212v");
  vi.stubEnv("ROSE_LINK_TOKEN", rose);
  vi.stubEnv("SAM_LINK_TOKEN", sam);
  vi.stubEnv("VAPID_PUBLIC_KEY", "vapid-test-public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "vapid-test-private-key");
  vi.stubEnv("VAPID_SUBJECT", "https://kincart.vercel.app");
  vi.stubEnv("ADDRESS_KEY", "test-address-key");
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(notify).mockReset();
  jar.clear();
  client.address = "203.0.113.7";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("won't answer for Sam from Rose's link or a made-up one", async () => {
  await ask(owner, glasses);
  const { id } = (await latest(owner))!;

  await expect(answer(rose, id, form({ answer: "ok" }))).resolves.toBeUndefined();
  await expect(answer("not-a-real-link", id, form({ answer: "ok" }))).resolves.toBeUndefined();
  await expect(answer(rose, id, form({ answer: "no" }))).resolves.toBeUndefined();

  expect((await latest(owner))!.status).toBe("waiting");
  expect(fetch).not.toHaveBeenCalled();
});

it("won't ask or link for Rose from Sam's link", async () => {
  await expect(askSam(sam, form({ item: "glasses" }))).resolves.toBeUndefined();
  await expect(startLink(sam)).resolves.toBeUndefined();

  expect(await latest(owner)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
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
  await saveSearch(owner, "warm slippers", { outcome: "options", options: [strap] });

  await expect(find(sam, form({ words: "warm slippers" }))).resolves.toBeUndefined();
  await expect(tryAgain(sam)).resolves.toBeUndefined();
  await expect(setLimit(rose, form({ limit: "30" }))).resolves.toBeUndefined();

  expect((await getSearch(owner))?.outcome).toBe("options");
  expect(await getLimit(owner)).toBe(5000);
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
  expect(await getSearch(owner)).toMatchObject({ words: six.join(", "), outcome: "too many" });

  expect(await redirectOf(find(rose, form({ words: "   " })))).toBe(`/r/${rose}?find=empty`);
});

// The first bytes of a JPEG, as the browser's shrink makes it.
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const photo = (bytes: Uint8Array<ArrayBuffer> | string, type = "image/jpeg") => new File([bytes], "image.jpg", { type });

// Haiku reads one thing from the photo, and Channel3 has no listings for it.
function stubPhotoServices() {
  const things = JSON.stringify({
    things: [{ words: "CR2032 coin battery", query: "CR2032 3V lithium coin battery", photos: [1] }],
    blank: [],
  });
  const fetch = vi.fn(async (url: string) =>
    url.includes("anthropic")
      ? Response.json({ content: [{ type: "text", text: things }], stop_reason: "end_turn" })
      : Response.json({ products: [] }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

it("finds from Rose's photo with an empty box, and keeps the AI's words marked as from the photo", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  const fetch = stubPhotoServices();

  expect(await redirectOf(find(rose, form({ words: "  ", photo: photo(jpeg) })))).toBe(`/r/${rose}`);

  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toContain("anthropic");
  expect(JSON.parse(String(init.body)).messages[0].content).toEqual([
    { type: "text", text: "Photo 1:" },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(jpeg).toString("base64") } },
    { type: "text", text: "They typed nothing." },
  ]);
  expect(await getSearch(owner)).toMatchObject({ words: "CR2032 coin battery", outcome: "nothing found", fromPhoto: true });
});

it("sends Rose's words with the photo, and a typed Find with an empty photo input stays a typed Find", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  const fetch = stubPhotoServices();

  await redirectOf(find(rose, form({ words: " size 8 ", photo: photo(jpeg) })));
  const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(String(init.body)).messages[0].content[2]).toEqual({ type: "text", text: "They typed: size 8" });

  fetch.mockClear();
  await redirectOf(find(rose, form({ words: "CR2032 coin battery", photo: photo("", "application/octet-stream") })));
  const [, typed] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(String(typed.body)).messages[0].content).toBe("CR2032 coin battery");
  expect(await getSearch(owner)).toMatchObject({ words: "CR2032 coin battery", fromPhoto: false });
});

// A second JPEG, with other bytes, so each photo can be told apart.
const second = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x18, 0x45, 0x78, 0x69, 0x66]);

function photos(words: string, files: File[]) {
  const data = form({ words });
  for (const file of files) data.append("photo", file);
  return data;
}

const sentImages = (fetch: ReturnType<typeof stubPhotoServices>) => {
  const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  const content: { type: string; source?: { data: string } }[] = JSON.parse(String(init.body)).messages[0].content;
  return content.filter(({ type }) => type === "image").map(({ source }) => source!.data);
};

it("sends Rose's photos to Haiku in the order Rose added them, and keeps how many Find read", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  const fetch = stubPhotoServices();

  expect(await redirectOf(find(rose, photos("", [photo(jpeg), photo(second)])))).toBe(`/r/${rose}`);

  expect(sentImages(fetch)).toEqual([Buffer.from(jpeg).toString("base64"), Buffer.from(second).toString("base64")]);
  expect(await getSearch(owner)).toMatchObject({ words: "CR2032 coin battery", fromPhoto: true, photos: 2, blankPhotos: 0 });
});

it("sends only the first 5 photos, whatever a request sends", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  const fetch = stubPhotoServices();

  await redirectOf(find(rose, photos("", [photo(jpeg), photo(jpeg), photo(jpeg), photo(jpeg), photo(jpeg), photo(second)])));

  expect(sentImages(fetch)).toEqual(Array(5).fill(Buffer.from(jpeg).toString("base64")));
  expect(await getSearch(owner)).toMatchObject({ photos: 5 });
});

it("refuses photos with a file among them that isn't a JPEG, and calls nothing", async () => {
  searchOn();

  expect(await redirectOf(find(rose, photos("", [photo(jpeg), photo("%PDF-1.7\n", "application/pdf")])))).toBe(
    `/r/${rose}?find=notphoto`,
  );
  expect(await getSearch(owner)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("refuses a file that isn't a JPEG, whatever it calls itself, and calls nothing", async () => {
  searchOn();

  expect(await redirectOf(find(rose, form({ words: "batteries", photo: photo("%PDF-1.7\n", "application/pdf") })))).toBe(
    `/r/${rose}?find=notphoto`,
  );
  expect(await redirectOf(find(rose, form({ words: "", photo: photo("%PDF-1.7\n") })))).toBe(`/r/${rose}?find=notphoto`);
  expect(await getSearch(owner)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

// count uses from one address, the oldest `hours` ago and the rest a minute apart after it.
async function usedFrom(address: string, kind: string, count: number, hours: number) {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(
    `INSERT INTO address_uses (kind, address, used_at)
     VALUES ($1, $2, ARRAY(SELECT now() - make_interval(secs => $4 * 3600) + n * interval '1 minute' FROM generate_series(0, $3 - 1) n))`,
    [kind, keyOf(addressOf(address)), count, hours],
  );
  await db.end();
}

async function usesFrom(address: string, kind: string): Promise<number> {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query("SELECT cardinality(used_at) AS n FROM address_uses WHERE kind = $1 AND address = $2", [
    kind,
    keyOf(addressOf(address)),
  ]);
  await db.end();
  return rows[0]?.n ?? 0;
}

// Haiku reads one thing from Rose's words, and Channel3 has no listings for it.
function stubWordServices() {
  const things = JSON.stringify({ things: [{ words: "a night light", query: "plug-in night light" }] });
  const fetch = vi.fn(async (url: string) =>
    url.includes("anthropic")
      ? Response.json({ content: [{ type: "text", text: things }], stop_reason: "end_turn" })
      : Response.json({ products: [] }),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

it("stops a Find past 20 from one address in a day, keeps Rose's words, and calls nothing", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 20, 21);

  const to = await redirectOf(find(rose, form({ words: "a night light" })));

  const until = Number(new URL(to, "https://kincart.vercel.app").searchParams.get("until"));
  expect(to).toBe(`/r/${rose}?find=limit&until=${until}`);
  expect(until - Date.now()).toBeGreaterThan(3 * 60 * 60 * 1000 - 5000);
  expect(until - Date.now()).toBeLessThan(3 * 60 * 60 * 1000 + 5000);
  expect(await getSearch(owner)).toMatchObject({ words: "a night light", outcome: "retry" });
  expect(fetch).not.toHaveBeenCalled();
  expect(console.log).toHaveBeenCalledWith("limit kind=find status=stopped wait=180");
  expect(await usesFrom("203.0.113.7", "find")).toBe(20);
});

it("lets another address find while one is stopped", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 20, 21);
  const services = stubWordServices();
  client.address = "198.51.100.24";

  expect(await redirectOf(find(rose, form({ words: "a night light" })))).toBe(`/r/${rose}`);
  expect(services).toHaveBeenCalled();
  expect(await usesFrom("198.51.100.24", "find")).toBe(1);
});

it("counts only the Finds that reach the AI", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 19, 21);

  expect(await redirectOf(find(rose, form({ words: "   " })))).toBe(`/r/${rose}?find=empty`);
  expect(await redirectOf(find(rose, form({ words: "", photo: photo("%PDF-1.7\n") })))).toBe(`/r/${rose}?find=notphoto`);
  expect(await usesFrom("203.0.113.7", "find")).toBe(19);

  stubWordServices();
  expect(await redirectOf(find(rose, form({ words: "a night light" })))).toBe(`/r/${rose}`);
  expect(await usesFrom("203.0.113.7", "find")).toBe(20);
});

// Today's row of counts, as /status reads it.
async function usedToday() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query(
    "SELECT finds, searches, stopped_finds, stopped_households FROM usage_days WHERE day = (now() AT TIME ZONE 'UTC')::date",
  );
  await db.end();
  return rows[0];
}

it("adds a Find and every search it sent to today's count, and nothing for a Find that never reaches the AI", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});

  expect(await redirectOf(find(rose, form({ words: "   " })))).toBe(`/r/${rose}?find=empty`);
  expect(await redirectOf(find(rose, form({ words: "", photo: photo("%PDF-1.7\n") })))).toBe(`/r/${rose}?find=notphoto`);
  expect(await usedToday()).toBeUndefined();

  stubWordServices();
  expect(await redirectOf(find(rose, form({ words: "a night light" })))).toBe(`/r/${rose}`);
  stubPhotoServices();
  expect(await redirectOf(find(rose, form({ words: "", photo: photo(jpeg) })))).toBe(`/r/${rose}`);

  expect(await usedToday()).toEqual({ finds: 2, searches: 4, stopped_finds: 0, stopped_households: 0 });
});

it("calls nothing for a Find without ADDRESS_KEY", async () => {
  searchOn();
  vi.stubEnv("ADDRESS_KEY", "");

  await expect(find(rose, form({ words: "a night light" }))).rejects.toThrow("no ADDRESS_KEY");
  expect(fetch).not.toHaveBeenCalled();
});

it("puts the AI's words for a photo in the box when Rose tries other words", async () => {
  searchOn();
  await saveSearch(owner, "CR2032 coin battery", { outcome: "options", options: [strap] }, 1);

  expect(await redirectOf(tryAgain(rose))).toBe(`/r/${rose}`);
  expect(await getSearch(owner)).toMatchObject({ words: "CR2032 coin battery", outcome: "retry", fromPhoto: false });
});

it("asks Sam for the picked listing at the saved search's price, never the form's", async () => {
  searchOn();
  await saveSearch(owner, "warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });

  expect(await redirectOf(askSam(rose, form({ listing: "prod_madeUp1", cents: "1" })))).toBe(`/r/${rose}?pick=missing`);
  expect(await latest(owner)).toBeNull();

  expect(await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY", cents: "1" })))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({
    item: { id: "prod_9Wz4hY", cents: 3250 },
    found: { shop: "amazon.com", url: strap.url, reason: strap.why, watch: strap.watch, imageUrl: strap.imageUrl },
  });
  expect(await getSearch(owner)).toBeNull();
});

it("keeps Rose's words when Rose tries other words", async () => {
  searchOn();
  await saveSearch(owner, "warm slippers", { outcome: "options", options: [strap] });

  expect(await redirectOf(tryAgain(rose))).toBe(`/r/${rose}`);
  expect(await getSearch(owner)).toMatchObject({ words: "warm slippers", outcome: "retry", options: [] });
});

it("saves Sam's limit in whole dollars from $5 to $500, and refuses anything else", async () => {
  expect(await redirectOf(setLimit(sam, form({ limit: "30" })))).toBe(`/h/${sam}?limit=saved`);
  expect(await getLimit(owner)).toBe(3000);

  for (const limit of ["3", "501", "30.5", "abc", ""]) {
    expect(await redirectOf(setLimit(sam, form({ limit })))).toBe(`/h/${sam}?limit=invalid`);
  }
  expect(await getLimit(owner)).toBe(3000);
});

it("saves Sam's total limit in whole dollars from $5 to $2,500, clears it when empty, and refuses anything else", async () => {
  expect(await redirectOf(setTotal(sam, form({ total: "40" })))).toBe(`/h/${sam}?total=saved`);
  expect(await getTotal(owner)).toBe(4000);

  for (const total of ["3", "2501", "12.50", "abc"]) {
    expect(await redirectOf(setTotal(sam, form({ total })))).toBe(`/h/${sam}?total=invalid`);
  }
  await expect(setTotal(rose, form({ total: "100" }))).resolves.toBeUndefined();
  expect(await getTotal(owner)).toBe(4000);

  expect(await redirectOf(setTotal(sam, form({ total: " " })))).toBe(`/h/${sam}?total=saved`);
  expect(await getTotal(owner)).toBeNull();
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

  expect(await subscriptionsFor(owner, "sam")).toEqual([{ endpoint: samPhone.endpoint, ...keys }]);
  expect(await subscriptionsFor(owner, "rose")).toEqual([{ endpoint: rosePhone.endpoint, ...keys }]);
});

it("refuses a phone from a made-up link, one it can't trust, or any while notifications are off", async () => {
  expect(await subscribe("not-a-real-link", samPhone)).toBe(false);
  expect(await subscribe(sam, { ...samPhone, endpoint: "http://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4" })).toBe(false);
  expect(await subscribe(sam, { ...samPhone, endpoint: "https://attacker.example/collect" })).toBe(false);
  expect(await subscribe(sam, { ...samPhone, keys: { p256dh: "not base64url!", auth: keys.auth } })).toBe(false);

  vi.stubEnv("VAPID_PRIVATE_KEY", "");
  expect(await subscribe(sam, samPhone)).toBe(false);

  expect(await subscriptionsFor(owner, "sam")).toEqual([]);
});

it("pings Sam when Rose's ask makes a request, and not for a second ask while one is open", async () => {
  searchOn();
  await saveSearch(owner, "warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });
  expect(await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY" })))).toBe(`/r/${rose}`);

  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "sam", {
    title: "Rose would like something",
    body: "Adjustable Wide Slippers with Hook-and-Loop Strap, $32.50. Tap to see it and say OK or No.",
  });

  await saveSearch(owner, "warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });
  await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY" })));
  expect(notify).toHaveBeenCalledTimes(1);
});

it("pings Sam for an item from the fixed list too", async () => {
  vi.stubEnv("CHANNEL3_API_KEY", "");
  expect(await redirectOf(askSam(rose, form({ item: "glasses" })))).toBe(`/r/${rose}`);

  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "sam", {
    title: "Rose would like something",
    body: "Reading glasses, +2.00, $18.99. Tap to see it and say OK or No.",
  });
});

it("asks and pings only Ben's own Sam, and Ben's Sam can't answer another household's ask", async () => {
  vi.stubEnv("CHANNEL3_API_KEY", "");
  const ben = await startHousehold(hashOf("ben-rose-link-7Qx2"), hashOf("ben-sam-link-9Lm4"));
  await saveVault(ben, "8kf02113h7720954x");
  await ask(owner, glasses);
  const theirs = (await latest(owner))!;

  expect(await redirectOf(askSam("ben-rose-link-7Qx2", form({ item: "batteries" })))).toBe("/r/ben-rose-link-7Qx2");
  expect(await latest(ben)).toMatchObject({ household: ben, item: { id: "batteries" }, status: "waiting" });
  expect(notify).toHaveBeenCalledExactlyOnceWith(ben, "sam", {
    title: "Rose would like something",
    body: "AA batteries, pack of 8, $9.99. Tap to see it and say OK or No.",
  });

  await redirectOf(answer("ben-sam-link-9Lm4", theirs.id, form({ answer: "ok" })));
  await redirectOf(answer("ben-sam-link-9Lm4", theirs.id, form({ answer: "no" })));
  expect((await latest(owner))?.status).toBe("waiting");
  expect(fetch).not.toHaveBeenCalled();
});

it("still asks Sam when the push can't go out", async () => {
  vi.stubEnv("CHANNEL3_API_KEY", "");
  vi.mocked(notify).mockRejectedValue(new Error("push service down"));

  expect(await redirectOf(askSam(rose, form({ item: "glasses" })))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({ status: "waiting", item: { id: "glasses" } });
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
  await ask(owner, glasses);
  const { id } = (await latest(owner))!;
  return redirectOf(answer(sam, id, form({ answer: choice })));
}

it("tells Rose when Sam says no", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  expect(await samAnswers("no")).toBe(`/h/${sam}`);

  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam said no",
    body: "Sam said no to Reading glasses, +2.00. Nothing was taken.",
  });
});

it("tells Rose when Sam's OK is paid, and when PayPal refuses it", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  expect(await samAnswers("ok")).toBe(`/h/${sam}`);
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam said OK",
    body: "Reading glasses, +2.00 is paid: $18.99. Tap to see the receipt.",
  });

  vi.mocked(notify).mockClear();
  paypalAnswers(() => Response.json({ name: "NOT_AUTHORIZED", details: [{ issue: "PERMISSION_DENIED" }] }, { status: 403 }));
  expect(await samAnswers("ok")).toBe(`/h/${sam}`);
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Payment didn't go through",
    body: "Sam said OK, but the payment didn't go through. Nothing was taken.",
  });
});

it("tells Rose nothing while the charge is unknown", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(() => new Response("", { status: 503 }));

  expect(await samAnswers("ok")).toBe(`/h/${sam}`);
  expect((await latest(owner))?.status).toBe("paying");
  expect(notify).not.toHaveBeenCalled();
});

const option = (id: string, name: string, cents: number, shop: string) => ({
  id,
  name,
  cents,
  shop,
  url: `https://www.${shop}/p/${id}`,
  imageUrl: `https://cdn.trychannel3.com/${id}`,
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
const lineOf = (thing: string, { id, name, cents, shop, url, why, watch, imageUrl }: typeof aa24) => ({
  id,
  name,
  cents,
  shop,
  url,
  reason: why,
  watch,
  imageUrl,
  thing,
});
const aaLine = lineOf("AA batteries", aa24);
const lightLine = lineOf("a night light", plugLight);

it("asks Sam for two picks as one basket at the saved prices, and pings Sam once", async () => {
  searchOn();
  await saveSearch(owner, "AA batteries, a night light and a phone charger", { outcome: "basket", groups });

  const picks = form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_6Nl2tL", "pick-2": "", cents: "1" });
  expect(await redirectOf(askSam(rose, picks))).toBe(`/r/${rose}`);

  expect(await latest(owner)).toMatchObject({
    item: { id: "basket", name: "2 things", cents: 2248 },
    found: null,
    lines: [aaLine, lightLine],
    status: "waiting",
  });
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "sam", {
    title: "Rose would like 2 things",
    body: "$22.48 in total. Tap to see them and say OK or No.",
  });
  expect(await getSearch(owner)).toBeNull();
});

it("asks Sam for one pick from a basket as one item, and for no pick asks Rose to pick one", async () => {
  searchOn();
  await saveSearch(owner, "AA batteries, a night light and a phone charger", { outcome: "basket", groups });

  const none = form({ "pick-0": "", "pick-1": "prod_madeUp1", "pick-2": "" });
  expect(await redirectOf(askSam(rose, none))).toBe(`/r/${rose}?pick=missing`);
  expect(await latest(owner)).toBeNull();

  expect(await redirectOf(askSam(rose, form({ "pick-1": "prod_6Nl2tL" })))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({
    item: { id: "prod_6Nl2tL", cents: 1249 },
    found: {
      shop: "target.com",
      url: plugLight.url,
      reason: plugLight.why,
      watch: plugLight.watch,
      imageUrl: plugLight.imageUrl,
    },
    lines: null,
  });
});

it("counts a listing picked under two things once", async () => {
  searchOn();
  await saveSearch(owner, "AA batteries and batteries for the remote", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24] },
      { thing: "batteries for the remote", options: [aa24] },
    ],
  });

  await redirectOf(askSam(rose, form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_3Ba7aA" })));
  expect(await latest(owner)).toMatchObject({ item: { id: "prod_3Ba7aA", cents: 999 }, lines: null });
});

const belkin = option("prod_7Bk2wC", "Belkin 25W USB-C Wall Charger with 6 ft Cable", 2499, "bestbuy.com");
const capped = [
  { thing: "AA batteries", options: [aa24] },
  { thing: "a night light", options: [plugLight] },
  { thing: "a phone charger", options: [belkin] },
];

it("stops picks over Sam's total limit before they reach Sam, and asks once Rose leaves one out", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveTotal(owner, 4000);
  await saveSearch(owner, "AA batteries, a night light and a phone charger", { outcome: "basket", groups: capped });

  const three = form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_6Nl2tL", "pick-2": "prod_7Bk2wC" });
  expect(await redirectOf(askSam(rose, three))).toBe(`/r/${rose}?over=prod_3Ba7aA,prod_6Nl2tL,prod_7Bk2wC`);
  expect(await latest(owner)).toBeNull();
  expect(notify).not.toHaveBeenCalled();
  expect(console.log).toHaveBeenCalledWith("ask status=over cents=4747 total=4000");
  expect(await getSearch(owner)).toMatchObject({ outcome: "basket" });

  const two = form({ "pick-0": "prod_3Ba7aA", "pick-1": "", "pick-2": "prod_7Bk2wC" });
  expect(await redirectOf(askSam(rose, two))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({ item: { id: "basket", name: "2 things", cents: 3498 }, status: "waiting" });
});

it("sends each group's pick back in its own place, with an empty place for a group left out", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  const aa16 = option("prod_8En1rG", "Energizer MAX AA Batteries, 16 Count", 1449, "walmart.com");
  await saveTotal(owner, 3000);
  await saveSearch(owner, "AA batteries, batteries for the remote and a phone charger", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24, aa16] },
      { thing: "batteries for the remote", options: [aa24] },
      { thing: "a phone charger", options: [belkin] },
    ],
  });

  const leftOut = form({ "pick-0": "prod_8En1rG", "pick-1": "", "pick-2": "prod_7Bk2wC" });
  expect(await redirectOf(askSam(rose, leftOut))).toBe(`/r/${rose}?over=prod_8En1rG,,prod_7Bk2wC`);
  const shared = form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_3Ba7aA", "pick-2": "prod_7Bk2wC" });
  expect(await redirectOf(askSam(rose, shared))).toBe(`/r/${rose}?over=prod_3Ba7aA,prod_3Ba7aA,prod_7Bk2wC`);
  expect(await latest(owner)).toBeNull();
});

it("lets picks that come to exactly Sam's total limit through", async () => {
  searchOn();
  const dimmer = option("prod_4Dm1nL", "Dimmable Plug-In Night Light", 1501, "walmart.com");
  await saveTotal(owner, 4000);
  await saveSearch(owner, "a phone charger and a night light", {
    outcome: "basket",
    groups: [
      { thing: "a phone charger", options: [belkin] },
      { thing: "a night light", options: [dimmer] },
    ],
  });

  expect(await redirectOf(askSam(rose, form({ "pick-0": "prod_7Bk2wC", "pick-1": "prod_4Dm1nL" })))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({ item: { id: "basket", cents: 4000 } });
});

it("stops one listing over Sam's total limit too", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveTotal(owner, 3000);
  await saveSearch(owner, "warm slippers that are easy to put on, size 8", { outcome: "options", options: [strap] });

  expect(await redirectOf(askSam(rose, form({ listing: "prod_9Wz4hY" })))).toBe(`/r/${rose}?over=prod_9Wz4hY`);
  expect(await latest(owner)).toBeNull();
});

it("lets any total through when Sam has set no total limit", async () => {
  searchOn();
  await saveSearch(owner, "AA batteries, a night light and a phone charger", { outcome: "basket", groups: capped });

  const three = form({ "pick-0": "prod_3Ba7aA", "pick-1": "prod_6Nl2tL", "pick-2": "prod_7Bk2wC" });
  expect(await redirectOf(askSam(rose, three))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({ item: { name: "3 things", cents: 4747 } });
});

const quadCane = option("prod_2Sq8aQ", "Small Base Aluminum Quad Cane", 2389, "staples.com");
const stick = "a walking stick that stands up by itself";
const saveCanes = () => saveSearch(owner, stick, { outcome: "over limit", options: [quadCane], query: "self-standing walking stick" });

it("asks Sam for a pick over Sam's limit at its saved price, never the form's, and pings Sam", async () => {
  searchOn();
  await saveCanes();

  expect(await redirectOf(askSam(rose, form({ listing: "prod_2Sq8aQ", cents: "2000" })))).toBe(`/r/${rose}`);
  expect(await latest(owner)).toMatchObject({
    item: { id: "prod_2Sq8aQ", name: "Small Base Aluminum Quad Cane", cents: 2389 },
    found: { shop: "staples.com", url: quadCane.url, reason: quadCane.why },
    queries: [{ id: "prod_2Sq8aQ", thing: stick, query: "self-standing walking stick" }],
    status: "waiting",
  });
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "sam", {
    title: "Rose would like something",
    body: "Small Base Aluminum Quad Cane, $23.89. Tap to see it and say OK or No.",
  });
});

it("stops a pick over Sam's limit that is also over Sam's total limit, before it reaches Sam", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveTotal(owner, 2000);
  await saveCanes();

  expect(await redirectOf(askSam(rose, form({ listing: "prod_2Sq8aQ" })))).toBe(`/r/${rose}?over=prod_2Sq8aQ`);
  expect(await latest(owner)).toBeNull();
  expect(notify).not.toHaveBeenCalled();
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
  await ask(owner, { id: "basket", name: "2 things", cents: 2248 }, undefined, [aaLine, lightLine]);
  const { id } = (await latest(owner))!;

  expect(await redirectOf(answer(sam, id, ticked("prod_3Ba7aA")))).toBe(`/h/${sam}`);

  expect(await chargedValue()).toBe("9.99");
  expect(await latest(owner)).toMatchObject({
    status: "paid",
    item: { cents: 999 },
    lines: [aaLine],
    leftOut: ["a night light"],
  });
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam said OK",
    body: "Sam paid $9.99 for 1 thing and left out a night light. Tap to see the receipt.",
  });
});

it("pays for the whole basket when Sam leaves both ticked", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  await ask(owner, { id: "basket", name: "2 things", cents: 2248 }, undefined, [aaLine, lightLine]);
  const { id } = (await latest(owner))!;

  await redirectOf(answer(sam, id, ticked("prod_3Ba7aA", "prod_6Nl2tL")));

  expect(await chargedValue()).toBe("22.48");
  expect(await latest(owner)).toMatchObject({ status: "paid", item: { cents: 2248 }, leftOut: null });
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam said OK",
    body: "Your 2 things are paid: $22.48. Tap to see the receipt.",
  });
});

it("charges nothing when Sam's OK has nothing ticked, and tells Rose when Sam says no to a basket", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  paypalAnswers(completed);
  await ask(owner, { id: "basket", name: "2 things", cents: 2248 }, undefined, [aaLine, lightLine]);
  const { id } = (await latest(owner))!;

  expect(await redirectOf(answer(sam, id, ticked()))).toBe(`/h/${sam}`);
  expect((await latest(owner))?.status).toBe("waiting");
  expect(fetch).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();

  await redirectOf(answer(sam, id, form({ answer: "no", line: "prod_3Ba7aA" })));
  expect((await latest(owner))?.status).toBe("declined");
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam said no",
    body: "Sam said no to your 2 things. Nothing was taken.",
  });
});

it("starts a household with its own two links and no saved PayPal, and keeps the links in this browser", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});

  expect(await redirectOf(start())).toBe("/?started=ready");

  const { value, options } = jar.get("household")!;
  const [roseLink, samLink] = value.split(".");
  const rose = (await whoIs(roseLink))!;
  expect(rose.person).toBe("rose");
  expect(rose.household).not.toBe(owner);
  expect(await whoIs(samLink)).toEqual({ household: rose.household, person: "sam" });
  expect(await getVault(rose.household)).toBeNull();
  expect(options).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 90 * 24 * 60 * 60 });
  expect(console.log).toHaveBeenCalledWith(`household id=${rose.household} status=started`);
});

it("starts a new household in place of this browser's old one, and the old links still work", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  await redirectOf(start());
  const old = jar.get("household")!.value;

  expect(await redirectOf(start())).toBe("/?started=fresh");

  const fresh = jar.get("household")!.value;
  expect(fresh).not.toBe(old);
  const [oldRose, oldSam] = old.split(".");
  const [freshRose] = fresh.split(".");
  expect((await whoIs(freshRose))?.household).not.toBe((await whoIs(oldRose))?.household);
  expect(await whoIs(oldSam)).toMatchObject({ person: "sam" });
});

it("stops a sixth household from one address in a day, and leaves this browser's own household alone", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  client.address = "198.51.100.24";
  await redirectOf(start());
  const own = jar.get("household")!.value;
  client.address = "203.0.113.7";
  await usedFrom("203.0.113.7", "household", 5, 19);
  const [{ count }] = await households();

  const to = await redirectOf(start());

  const until = Number(new URL(to, "https://kincart.vercel.app").searchParams.get("until"));
  expect(to).toBe(`/?started=limit&until=${until}`);
  expect(until - Date.now()).toBeGreaterThan(5 * 60 * 60 * 1000 - 5000);
  expect(until - Date.now()).toBeLessThan(5 * 60 * 60 * 1000 + 5000);
  expect(await households()).toEqual([{ count }]);
  expect(jar.get("household")!.value).toBe(own);
  expect(console.log).toHaveBeenCalledWith("limit kind=household status=stopped wait=300");
});

it("starts no household without ADDRESS_KEY, and says why", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.stubEnv("ADDRESS_KEY", "");

  expect(await redirectOf(start())).toBe("/?started=failed");
  expect(jar.has("household")).toBe(false);
  expect(console.log).toHaveBeenCalledWith("household status=failed reason=no ADDRESS_KEY");
});

it("counts a stopped Find and a stopped Try KinCart only as stopped", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 20, 21);
  await usedFrom("203.0.113.7", "household", 5, 19);

  expect(await redirectOf(find(rose, form({ words: "a night light" })))).toMatch(/\?find=limit&until=\d+$/);
  expect(await redirectOf(start())).toMatch(/^\/\?started=limit&until=\d+$/);

  expect(await usedToday()).toEqual({ finds: 0, searches: 0, stopped_finds: 1, stopped_households: 1 });
});

async function households(): Promise<{ count: string }[]> {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query("SELECT count(*) FROM households");
  await db.end();
  return rows;
}

it("saves nothing, and says so, when the database can't be reached", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const database = process.env.DATABASE_URL;
  vi.stubEnv("DATABASE_URL", "postgres://postgres@127.0.0.1:1/none");

  expect(await redirectOf(start())).toBe("/?started=failed");

  vi.stubEnv("DATABASE_URL", database);
  expect(jar.has("household")).toBe(false);
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^household status=failed reason=\S+/));
});

it("skips Rose to a copy of household 1's saved PayPal, and only for Rose", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const ben = await startHousehold(hashOf("ben-rose-link-7Qx2"), hashOf("ben-sam-link-9Lm4"));

  await expect(skipLink("ben-sam-link-9Lm4", form({}))).resolves.toBeUndefined();
  expect(await getVault(ben)).toBeNull();

  expect(await redirectOf(skipLink("ben-rose-link-7Qx2", form({ in: "phone" })))).toBe("/r/ben-rose-link-7Qx2?in=phone");
  expect(await getVault(ben)).toBe("1j970427g9944212v");
  expect(console.log).toHaveBeenCalledWith(`paypal skip household=${ben} status=copied`);
});

it("says a Skip failed when household 1 has no saved PayPal, and sends Rose back not linked, still in her phone", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const ben = await startHousehold(hashOf("ben-rose-link-7Qx2"), hashOf("ben-sam-link-9Lm4"));
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DELETE FROM paypal_vault");
  await client.end();

  expect(await redirectOf(skipLink("ben-rose-link-7Qx2", form({})))).toBe("/r/ben-rose-link-7Qx2?cancelled=1");
  expect(await redirectOf(skipLink("ben-rose-link-7Qx2", form({ in: "phone" })))).toBe(
    "/r/ben-rose-link-7Qx2?in=phone&cancelled=1",
  );
  expect(await getVault(ben)).toBeNull();
  expect(console.log).toHaveBeenCalledWith(`paypal skip household=${ben} status=failed reason=no demo PayPal`);
});


it("keeps the PayPal Rose linked in a new tab when she taps Skip in the old one, and says so", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const ben = await startHousehold(hashOf("ben-rose-link-7Qx2"), hashOf("ben-sam-link-9Lm4"));
  await saveVault(ben, "8kf02113h7720954x");

  expect(await redirectOf(skipLink("ben-rose-link-7Qx2", form({})))).toBe("/r/ben-rose-link-7Qx2");
  expect(await getVault(ben)).toBe("8kf02113h7720954x");
  expect(console.log).toHaveBeenCalledWith(`paypal skip household=${ben} status=kept`);
});

const webp = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#e8e8e8" } }).webp().toBuffer();

// A listing as Channel3 sends it.
const product = ({ id, name, cents, shop, url, what, imageUrl }: typeof aa24) => ({
  id,
  title: name,
  description: what,
  images: [{ url: imageUrl }],
  offers: [{ url, domain: shop, price: { price: cents / 100, currency: "USD" }, availability: "InStock" }],
});

// Channel3 answers every search with these listings. Haiku's other words for a thing are "<thing> in other
// words", and its pick call picks every listing it's sent.
function stubAgainServices(listings: (typeof aa24)[]) {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("cdn.trychannel3.com")) {
      return new Response(new Uint8Array(webp), { headers: { "content-type": "image/webp" } });
    }
    const body = JSON.parse(String(init?.body));
    if (url.includes("api.trychannel3.com")) return Response.json({ products: listings.map(product) });
    const content = body.messages[0].content;
    const data =
      body.output_config.format.schema.required[0] === "query"
        ? { query: `${JSON.parse(content.split("\n")[0].slice("They want: ".length))} in other words` }
        : {
            picks: content
              .flatMap((block: { text?: string }) => block.text?.match(/^Listing (\S+?)[: ]/)?.[1] ?? [])
              .map((id: string) => ({ id, what: "What it is.", why: "Why it fits.", watch: "Good to know." })),
            aboveLimit: false,
          };
    return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn" });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

// What each other-words call asked Haiku.
const askedForOtherWords = (fetch: ReturnType<typeof stubAgainServices>) =>
  fetch.mock.calls
    .map(([, init]) => init?.body && JSON.parse(String(init.body)))
    .filter((body) => body?.output_config?.format.schema.required[0] === "query")
    .map((body) => body.messages[0].content);

const jarWords = "something to grip jar lids";
const opener = option("prod_5Jo1xO", "OXO Good Grips Jar Opener with Base Pad", 999, "amazon.com");
const pads = option("prod_7Jp4dS", "Rubber Jar Gripper Pads, Set of 6", 749, "target.com");
const slippers = "warm slippers that are easy to put on, size 8";
const isotoner = option("prod_1Is8tN", "Isotoner Women's Microterry Slip-On Slippers, Size 8", 1999, "macys.com");

it("finds another after an empty Find with other words, keeps them as its query, and counts a Find", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, jarWords, { outcome: "nothing found", query: "jar lid grip" });
  const services = stubAgainServices([opener, pads]);

  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);

  expect(await getSearch(owner)).toMatchObject({
    words: jarWords,
    outcome: "options",
    options: [{ id: opener.id }, { id: pads.id }],
    query: `${jarWords} in other words`,
    tried: true,
  });
  expect(askedForOtherWords(services)).toEqual([`They want: "${jarWords}"\nThe last query: "jar lid grip"`]);
  expect(await usesFrom("203.0.113.7", "find")).toBe(1);
  expect(await usedToday()).toEqual({ finds: 1, searches: 2, stopped_finds: 0, stopped_households: 0 });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^find outcome=options listings=2 searches=2 .* again=1$/));
});

it("calls nothing for a search Find another already ran, or one that found something", async () => {
  searchOn();
  await saveSearch(owner, jarWords, { outcome: "nothing found", query: "jar opener" }, 0, 0, true);

  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);
  await saveSearch(owner, jarWords, { outcome: "options", options: [opener], query: "jar opener" });
  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);

  expect(fetch).not.toHaveBeenCalled();
  expect(await usesFrom("203.0.113.7", "find")).toBe(0);
  expect(await usedToday()).toBeUndefined();
});

it("keeps the thing, query and listing of one pick with the ask", async () => {
  searchOn();
  await saveSearch(owner, slippers, { outcome: "options", options: [strap], query: "warm slip-on slippers size 8" });
  await redirectOf(askSam(rose, form({ listing: strap.id })));
  expect((await latest(owner))?.queries).toEqual([{ id: strap.id, thing: slippers, query: "warm slip-on slippers size 8" }]);
});

it("keeps each basket pick's thing, query and listing with the ask, with the thing for a group from before queries", async () => {
  searchOn();
  await saveSearch(owner, "AA batteries, a night light and a phone charger", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24], query: "AA batteries" },
      { thing: "a night light", options: [plugLight] },
      { thing: "a phone charger", options: [anker], query: "phone charger" },
    ],
  });
  await redirectOf(askSam(rose, form({ "pick-0": aa24.id, "pick-1": plugLight.id, "pick-2": "" })));
  expect((await latest(owner))?.queries).toEqual([
    { id: aa24.id, thing: "AA batteries", query: "AA batteries" },
    { id: plugLight.id, thing: "a night light", query: "a night light" },
  ]);
});

it("after Sam's No, searches the thing again with other words, without the listing Sam said no to", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, slippers, { outcome: "options", options: [strap], query: "warm slip-on slippers size 8" });
  await redirectOf(askSam(rose, form({ listing: strap.id })));
  await decline(owner, (await latest(owner))!.id);
  const services = stubAgainServices([strap, isotoner]);

  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);

  expect(await getSearch(owner)).toMatchObject({
    words: slippers,
    outcome: "options",
    options: [{ id: isotoner.id }],
    tried: true,
  });
  expect(askedForOtherWords(services)).toEqual([`They want: "${slippers}"\nThe last query: "warm slip-on slippers size 8"`]);
});

it("after Sam's No to a basket, searches every thing again, each without the basket's listings", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, "AA batteries, a night light", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24], query: "AA batteries" },
      { thing: "a night light", options: [plugLight], query: "plug-in night light" },
    ],
  });
  await redirectOf(askSam(rose, form({ "pick-0": aa24.id, "pick-1": plugLight.id })));
  await decline(owner, (await latest(owner))!.id);
  const services = stubAgainServices([aa24, plugLight, anker]);

  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);

  const saved = await getSearch(owner);
  expect(saved).toMatchObject({
    words: "AA batteries and a night light",
    outcome: "basket",
    tried: true,
    groups: [
      { thing: "AA batteries", options: [{ id: anker.id }], tried: true },
      { thing: "a night light", options: [{ id: anker.id }], tried: true },
    ],
  });
  expect(askedForOtherWords(services)).toEqual([
    'They want: "AA batteries"\nThe last query: "AA batteries"',
    'They want: "a night light"\nThe last query: "plug-in night light"',
  ]);
  expect(await usedToday()).toMatchObject({ finds: 1, searches: 4 });
});

it("after Sam leaves a thing out, searches only that thing again, without the listing Sam left out", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, "AA batteries, a night light", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24], query: "AA batteries" },
      { thing: "a night light", options: [plugLight], query: "plug-in night light" },
    ],
  });
  await redirectOf(askSam(rose, form({ "pick-0": aa24.id, "pick-1": plugLight.id })));
  const { id } = (await latest(owner))!;
  await claim(owner, id, [aa24.id]);
  await record(id, { state: "paid", orderId: "5O190127TN364715T", captureId: "7BM91101S1572292D" });
  const services = stubAgainServices([plugLight, anker]);

  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);

  expect(await getSearch(owner)).toMatchObject({
    words: "a night light",
    outcome: "options",
    options: [{ id: anker.id }],
    tried: true,
  });
  expect(askedForOtherWords(services)).toEqual(['They want: "a night light"\nThe last query: "plug-in night light"']);
});

const aa8 = option("prod_1Dc8aA", "Duracell Coppertop AA Batteries, 8 Pack", 879, "target.com");
const jarBasket = (group: object = {}) => ({
  outcome: "basket" as const,
  groups: [
    { thing: "AA batteries", options: [aa24, aa8], query: "AA batteries" },
    { thing: jarWords, options: [], problem: "nothing found" as const, query: "jar lid grip", ...group },
  ],
});

it("searches one empty group of a basket again, keeps Rose's other picks and the photo counts, and never asks Sam", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, "AA batteries, something to grip jar lids", jarBasket(), 2, 1);
  const services = stubAgainServices([opener]);

  const tapped = form({ "pick-0": aa8.id, another: "1" });
  expect(await redirectOf(findAnother(rose, tapped))).toBe(`/r/${rose}?picked=${aa8.id},`);

  expect(await getSearch(owner)).toMatchObject({
    words: "AA batteries, something to grip jar lids",
    outcome: "basket",
    photos: 2,
    blankPhotos: 1,
    tried: false,
    groups: [
      { thing: "AA batteries", options: [{ id: aa24.id }, { id: aa8.id }], query: "AA batteries" },
      { thing: jarWords, options: [{ id: opener.id }], query: `${jarWords} in other words`, tried: true },
    ],
  });
  expect(askedForOtherWords(services)).toEqual([`They want: "${jarWords}"\nThe last query: "jar lid grip"`]);
  expect(await latest(owner)).toBeNull();
  expect(notify).not.toHaveBeenCalled();

  services.mockClear();
  expect(await redirectOf(findAnother(rose, form({ another: "1" })))).toBe(`/r/${rose}`);
  expect(await redirectOf(findAnother(rose, form({ another: "0" })))).toBe(`/r/${rose}`);
  expect(await redirectOf(findAnother(rose, form({ another: "7" })))).toBe(`/r/${rose}`);
  expect(services).not.toHaveBeenCalled();
});

it("after a Find whose every thing found nothing, asks for other words for each thing on its own", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, "AA batteries, something to grip jar lids", {
    outcome: "nothing found",
    groups: [
      { thing: "AA batteries", options: [], problem: "nothing found", query: "AA batteries" },
      { thing: jarWords, options: [], problem: "nothing found", query: "jar lid grip" },
    ],
  });
  const services = stubAgainServices([aa8, opener]);

  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);

  expect(askedForOtherWords(services)).toEqual([
    'They want: "AA batteries"\nThe last query: "AA batteries"',
    `They want: "${jarWords}"\nThe last query: "jar lid grip"`,
  ]);
  expect(await getSearch(owner)).toMatchObject({
    words: "AA batteries, something to grip jar lids",
    outcome: "basket",
    tried: true,
    groups: [{ thing: "AA batteries", tried: true }, { thing: jarWords, tried: true }],
  });
});

it("hands a group's Find another, sent with the Ask Sam form, to Find another, and asks Sam nothing", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, "AA batteries, something to grip jar lids", jarBasket());
  stubAgainServices([opener]);

  expect(await redirectOf(askSam(rose, form({ "pick-0": aa24.id, another: "1" })))).toBe(`/r/${rose}?picked=${aa24.id},`);

  expect(await getSearch(owner)).toMatchObject({ groups: [{ thing: "AA batteries" }, { options: [{ id: opener.id }], tried: true }] });
  expect(await latest(owner)).toBeNull();
  expect(notify).not.toHaveBeenCalled();
});

it("stops a Find another past 20 Finds, saves nothing, counts a stopped Find, and keeps Rose's picks", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 20, 21);
  await saveSearch(owner, slippers, { outcome: "options", options: [strap], query: "warm slip-on slippers size 8" });
  await redirectOf(askSam(rose, form({ listing: strap.id })));
  await decline(owner, (await latest(owner))!.id);
  vi.mocked(fetch).mockClear();

  const to = await redirectOf(findAnother(rose, form({})));

  const until = Number(new URL(to, "https://kincart.vercel.app").searchParams.get("until"));
  expect(to).toBe(`/r/${rose}?find=limit&until=${until}`);
  expect(until - Date.now()).toBeGreaterThan(3 * 60 * 60 * 1000 - 5000);
  expect(fetch).not.toHaveBeenCalled();
  expect(await getSearch(owner)).toBeNull();
  expect((await latest(owner))?.status).toBe("declined");
  expect(await usedToday()).toEqual({ finds: 0, searches: 0, stopped_finds: 1, stopped_households: 0 });
  expect(console.log).toHaveBeenCalledWith("limit kind=find status=stopped wait=180");

  await saveSearch(owner, "AA batteries, something to grip jar lids", jarBasket());
  const fromBasket = await redirectOf(findAnother(rose, form({ "pick-0": aa24.id, another: "1" })));
  expect(fromBasket).toMatch(new RegExp(`^/r/${rose}\\?find=limit&until=\\d+&picked=${aa24.id},$`));
  expect(await getSearch(owner)).toMatchObject(jarBasket());
  expect(fetch).not.toHaveBeenCalled();
});

it("won't find another for Rose's own empty Find from Sam's link, or while search is off", async () => {
  searchOn();
  await saveSearch(owner, jarWords, { outcome: "nothing found", query: "jar lid grip" });

  expect(await redirectOf(findAnother(sam, form({})))).toBe(`/h/${sam}`);
  vi.stubEnv("ADDRESS_KEY", "");
  await expect(findAnother(rose, form({}))).resolves.toBeUndefined();

  expect(fetch).not.toHaveBeenCalled();
  expect(await getSearch(owner)).toMatchObject({ outcome: "nothing found", tried: false });
});

async function samSaysNoToSlippers() {
  await saveSearch(owner, slippers, { outcome: "options", options: [strap], query: "warm slip-on slippers size 8" });
  await redirectOf(askSam(rose, form({ listing: strap.id })));
  await decline(owner, (await latest(owner))!.id);
  vi.mocked(notify).mockClear();
}

it("after Sam's No, Sam's Find another searches for Rose without the refused listing, and tells Rose", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await samSaysNoToSlippers();
  const services = stubAgainServices([strap, isotoner]);

  expect(await redirectOf(findAnother(sam, form({ another: "0" })))).toBe(`/h/${sam}`);

  expect(await getSearch(owner)).toMatchObject({
    words: slippers,
    outcome: "options",
    options: [{ id: isotoner.id }],
    tried: true,
    bySam: true,
  });
  expect(askedForOtherWords(services)).toEqual([`They want: "${slippers}"\nThe last query: "warm slip-on slippers size 8"`]);
  expect(await usesFrom("203.0.113.7", "find")).toBe(1);
  expect(await usedToday()).toMatchObject({ finds: 1, stopped_finds: 0 });
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam asked KinCart to look again",
    body: "New options are ready. Tap to pick one.",
  });
});

it("tells Rose when Sam's Find another finds nothing, and offers no second one", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await samSaysNoToSlippers();
  stubAgainServices([strap]);

  expect(await redirectOf(findAnother(sam, form({})))).toBe(`/h/${sam}`);
  expect(await getSearch(owner)).toMatchObject({ outcome: "nothing found", tried: true, bySam: true });
  expect(notify).toHaveBeenCalledExactlyOnceWith(owner, "rose", {
    title: "Sam asked KinCart to look again",
    body: "KinCart found nothing this time. Tap to try different words.",
  });

  vi.mocked(fetch).mockClear();
  vi.mocked(notify).mockClear();
  expect(await redirectOf(findAnother(sam, form({})))).toBe(`/h/${sam}`);
  expect(await redirectOf(findAnother(rose, form({})))).toBe(`/r/${rose}`);
  expect(fetch).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

it("sends no push for Rose's own Find another, and keeps it as Rose's", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await samSaysNoToSlippers();
  stubAgainServices([strap, isotoner]);

  await redirectOf(findAnother(rose, form({})));
  expect(await getSearch(owner)).toMatchObject({ tried: true, bySam: false });
  expect(notify).not.toHaveBeenCalled();
});

it("stops Sam's Find another past 20 Finds from Sam's address, saves nothing, and keeps Sam on Sam's page", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 20, 21);
  await samSaysNoToSlippers();
  vi.mocked(fetch).mockClear();

  const to = await redirectOf(findAnother(sam, form({})));

  const until = Number(new URL(to, "https://kincart.vercel.app").searchParams.get("until"));
  expect(to).toBe(`/h/${sam}?find=limit&until=${until}`);
  expect(fetch).not.toHaveBeenCalled();
  expect(await getSearch(owner)).toBeNull();
  expect(await usedToday()).toMatchObject({ finds: 0, stopped_finds: 1 });
  expect(notify).not.toHaveBeenCalled();
});

// Sam's OK, without a charge: claim() keeps the ticked lines, and the charge is recorded as paid.
async function paidFor(ticked: string[] = []): Promise<number> {
  const { id } = (await latest(owner))!;
  await claim(owner, id, ticked);
  await record(id, { state: "paid", orderId: "5O190127TN364715T", captureId: "7BM91101S1572292D" });
  return id;
}

// What each Channel3 search asked for, with a filter or without.
const searchedFor = (fetch: ReturnType<typeof stubAgainServices>) =>
  fetch.mock.calls
    .filter(([url]) => String(url).includes("api.trychannel3.com"))
    .map(([, init]) => JSON.parse(String(init?.body)))
    .map(({ query, filters }) => (filters ? `${query} under $${filters.price.max_price}` : query));

it("asks again for what Sam paid for, with last time's query and its listing's name, keeps that listing, and counts a Find", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, slippers, { outcome: "options", options: [strap], query: "warm slip-on slippers size 8" });
  await redirectOf(askSam(rose, form({ listing: strap.id })));
  const id = await paidFor();
  const services = stubAgainServices([isotoner, strap]);

  expect(await redirectOf(rebuy(rose, form({ request: String(id) })))).toBe(`/r/${rose}`);

  expect(await getSearch(owner)).toMatchObject({
    words: slippers,
    outcome: "options",
    options: [{ id: strap.id }, { id: isotoner.id }],
    query: "warm slip-on slippers size 8",
    tried: false,
    last: { id: strap.id, cents: 3250, shop: "amazon.com" },
  });
  expect(searchedFor(services)).toEqual([
    "warm slip-on slippers size 8 under $50",
    "warm slip-on slippers size 8",
    strap.name,
  ]);
  expect(await usesFrom("203.0.113.7", "find")).toBe(1);
  expect(await usedToday()).toEqual({ finds: 1, searches: 3, stopped_finds: 0, stopped_households: 0 });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^find outcome=options listings=2 searches=3 .* rebuy=1 same=1\/1$/));
});

it("asks again only for what Sam paid for in a basket, and leaves out what Sam left out", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await saveSearch(owner, "AA batteries, a night light", {
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [aa24], query: "AA alkaline batteries" },
      { thing: "a night light", options: [plugLight], query: "plug-in night light" },
    ],
  });
  await redirectOf(askSam(rose, form({ "pick-0": aa24.id, "pick-1": plugLight.id })));
  const id = await paidFor([aa24.id]);
  const services = stubAgainServices([aa24, anker]);

  expect(await redirectOf(rebuy(rose, form({ request: String(id) })))).toBe(`/r/${rose}`);

  expect(await getSearch(owner)).toMatchObject({
    words: "AA batteries",
    outcome: "options",
    options: [{ id: aa24.id }, { id: anker.id }],
    last: { id: aa24.id, cents: aa24.cents, shop: aa24.shop },
  });
  expect(searchedFor(services)).toEqual(["AA alkaline batteries under $50", "AA alkaline batteries", aa24.name]);
});

it("searches nothing for another household's ask, one Sam didn't pay for, or while an ask is open", async () => {
  searchOn();
  const ben = await startHousehold(hashOf("ben-rose-link-7Qx2"), hashOf("ben-sam-link-9Lm4"));
  await ask(ben, strap, { shop: strap.shop, url: strap.url, reason: strap.why });
  const { id: bens } = (await latest(ben))!;
  await claim(ben, bens);
  await record(bens, { state: "paid", orderId: "5O190127TN364715T", captureId: "7BM91101S1572292D" });
  await ask(owner, strap, { shop: strap.shop, url: strap.url, reason: strap.why });
  const { id: refused } = (await latest(owner))!;
  await decline(owner, refused);

  expect(await redirectOf(rebuy(rose, form({ request: String(bens) })))).toBe(`/r/${rose}`);
  expect(await redirectOf(rebuy(rose, form({ request: String(refused) })))).toBe(`/r/${rose}`);
  expect(await redirectOf(rebuy(rose, form({ request: "a night light" })))).toBe(`/r/${rose}`);
  expect(await redirectOf(rebuy(rose, form({})))).toBe(`/r/${rose}`);

  await ask(owner, aa24, { shop: aa24.shop, url: aa24.url, reason: aa24.why });
  const paid = await paidFor();
  await ask(owner, strap, { shop: strap.shop, url: strap.url, reason: strap.why });
  expect(await redirectOf(rebuy(rose, form({ request: String(paid) })))).toBe(`/r/${rose}`);

  expect(fetch).not.toHaveBeenCalled();
  expect(await getSearch(owner)).toBeNull();
  expect(await usesFrom("203.0.113.7", "find")).toBe(0);
});

it("stops an Ask again past 20 Finds, saves nothing, counts a stopped Find, and keeps Rose on the ask screen", async () => {
  searchOn();
  vi.spyOn(console, "log").mockImplementation(() => {});
  await usedFrom("203.0.113.7", "find", 20, 21);
  await ask(owner, aa24, { shop: aa24.shop, url: aa24.url, reason: aa24.why });
  const id = await paidFor();

  const to = await redirectOf(rebuy(rose, form({ request: String(id) })));

  const until = Number(new URL(to, "https://kincart.vercel.app").searchParams.get("until"));
  expect(to).toBe(`/r/${rose}?ask=1&find=limit&until=${until}`);
  expect(until - Date.now()).toBeGreaterThan(3 * 60 * 60 * 1000 - 5000);
  expect(fetch).not.toHaveBeenCalled();
  expect(await getSearch(owner)).toBeNull();
  expect(await usedToday()).toEqual({ finds: 0, searches: 0, stopped_finds: 1, stopped_households: 0 });
  expect(console.log).toHaveBeenCalledWith("limit kind=find status=stopped wait=180");
});

it("won't ask again from Sam's link, or while search is off", async () => {
  searchOn();
  await ask(owner, aa24, { shop: aa24.shop, url: aa24.url, reason: aa24.why });
  const id = await paidFor();

  await expect(rebuy(sam, form({ request: String(id) }))).resolves.toBeUndefined();
  vi.stubEnv("ADDRESS_KEY", "");
  await expect(rebuy(rose, form({ request: String(id) }))).resolves.toBeUndefined();

  expect(fetch).not.toHaveBeenCalled();
  expect(await getSearch(owner)).toBeNull();
});
