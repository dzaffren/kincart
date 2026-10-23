import sharp from "sharp";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { find, findAgain, findPhoto, findRebuy } from "./find";

const words = "warm slippers that are easy to put on, size 8";

const product = (id: string, title: string, price: number, domain: string) => ({
  id,
  title,
  description: `${title}, warm and soft.`,
  images: [{ url: `https://cdn.trychannel3.com/${id}` }],
  offers: [{ url: `https://www.${domain}/p/${id}`, domain, price: { price, currency: "USD" }, availability: "InStock" }],
});

const kohls = product("prod_7Hq2kZ", "Warm House Shoes Unisex Comfy Fuzzy Slip-on House Slippers", 27.07, "kohls.com");
const muji = product("prod_4Fd6sW", "Warm Fiber Slippers", 19.9, "muji.us");
const ikea = product("prod_8Kp3rT", "Slippers", 9, "ikea.com");
const avenue = product("prod_5Gn2cX", "Sara Slippers", 51, "avenue.com");
const sheepskin = product("prod_2Lm9vQ", "Sheepskin Moccasin Slippers", 129, "llbean.com");

const pick = (id: string) => ({
  id,
  what: "A soft slip-on slipper. It costs $5 at a discount.",
  why: "It slides on without bending down.",
  watch: "Check the size chart.",
});

// The first Haiku call answers with things; the pick calls answer with picks.
const isNeed = (body: { output_config: { format: { schema: { required: string[] } } } }) =>
  body.output_config.format.schema.required[0] === "things";

// over answers a second pick call, on the listings over the limit, and overFails fails it.
type Answers = { need: unknown; under?: unknown[]; all?: unknown[]; choice?: unknown; over?: unknown; overFails?: boolean };

const webp = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#e8e8e8" } }).webp().toBuffer();

// Channel3's photo host answers with a small WebP, or a 404 for a photo that is gone.
const photoAnswer = (url: string) =>
  url.endsWith("/gone")
    ? new Response("Not found", { status: 404 })
    : new Response(new Uint8Array(webp), { headers: { "content-type": "image/webp" } });

function stubServices(answers: Answers | (() => never)) {
  let picks = 0;
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (typeof answers === "function") return answers();
    if (url.includes("cdn.trychannel3.com")) return photoAnswer(url);
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      const second = !isNeed(body) && picks++ > 0;
      if (second && answers.overFails) return Response.json({ error: "overloaded" }, { status: 529 });
      const data = isNeed(body) ? answers.need : second ? answers.over : answers.choice;
      return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn" });
    }
    return Response.json({ products: body.filters ? answers.under : answers.all });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const searches = (fetch: ReturnType<typeof stubServices>) =>
  fetch.mock.calls.filter(([url]) => String(url).includes("api.trychannel3.com")).length;

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
  vi.stubEnv("CHANNEL3_API_KEY", "c3-test-key");
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("shows up to three listings Haiku picked, with Channel3's names, prices and links", async () => {
  stubServices({
    need: { things: [{ words, query: "warm slippers easy to put on size 8" }] },
    under: [kohls, muji, ikea, avenue],
    all: [kohls, sheepskin],
    choice: {
      picks: [pick("prod_4Fd6sW"), pick("prod_madeUp1"), pick("prod_5Gn2cX"), pick("prod_4Fd6sW"), pick("prod_7Hq2kZ"), pick("prod_8Kp3rT")],
      aboveLimit: false,
    },
  });

  const result = await find(words, 5000);

  expect(result).toEqual({
    outcome: "options",
    options: [
      {
        id: "prod_4Fd6sW",
        name: "Warm Fiber Slippers",
        cents: 1990,
        shop: "muji.us",
        url: "https://www.muji.us/p/prod_4Fd6sW",
        imageUrl: "https://cdn.trychannel3.com/prod_4Fd6sW",
        what: pick("prod_4Fd6sW").what,
        why: pick("prod_4Fd6sW").why,
        watch: pick("prod_4Fd6sW").watch,
      },
      expect.objectContaining({ id: "prod_7Hq2kZ", name: kohls.title, cents: 2707 }),
      expect.objectContaining({ id: "prod_8Kp3rT", cents: 900 }),
    ],
    query: "warm slippers easy to put on size 8",
  });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^find outcome=options listings=3 searches=2 ms=\d+ checked=3 unloaded=0$/));
});

it("says nothing under the limit when the thing only exists above it", async () => {
  stubServices({
    need: { things: [{ words: "a tablet for video calls", query: "tablet for video calls with front camera" }] },
    under: [product("prod_1Cs4eB", "Universal Tablet Case", 20.89, "walmart.com")],
    all: [product("prod_6Tb8aQ", "10.1 inch Tablet with Front Camera", 149.99, "bestbuy.com")],
    choice: { picks: [], aboveLimit: true },
  });

  expect(await find("a tablet for video calls", 3000)).toEqual({
    outcome: "over limit",
    query: "tablet for video calls with front camera",
  });
});

it("says it couldn't find anything when nothing fits at any price", async () => {
  const fetch = stubServices({
    need: { things: [{ words: "a left-handed teapot for a cat", query: "left-handed teapot for a cat" }] },
    under: [],
    all: [],
  });

  expect(await find("a left-handed teapot for a cat", 5000)).toEqual({
    outcome: "nothing found",
    query: "left-handed teapot for a cat",
  });
  expect(searches(fetch)).toBe(2);
});

it("says too many for more than five things, and searches for nothing that isn't a product", async () => {
  const six = ["batteries", "a night light", "a phone charger", "a doormat", "a kettle", "a flashlight"];
  const list = stubServices({ need: { things: six.map((thing) => ({ words: thing, query: thing })) } });
  expect(await find(six.join(", "), 5000)).toEqual({ outcome: "too many" });
  expect(searches(list)).toBe(0);
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/^find outcome=too-many listings=0 searches=0 ms=\d+ checked=0 unloaded=0$/));

  const notAProduct = stubServices({ need: { things: [] } });
  expect(await find("what time is it in Ohio", 5000)).toEqual({ outcome: "nothing found" });
  expect(searches(notAProduct)).toBe(0);

  const blank = stubServices({ need: { things: [{ words: "something nice", query: " " }] } });
  expect(await find("something nice", 5000)).toEqual({ outcome: "nothing found", query: " " });
  expect(searches(blank)).toBe(0);
});

it("says it couldn't find anything when Haiku or Channel3 fails, and logs why", async () => {
  stubServices(() => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  });
  expect(await find(words, 5000)).toEqual({ outcome: "nothing found" });
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=nothing-found listings=0 searches=0 ms=\d+ checked=0 unloaded=0 reason=TimeoutError$/),
  );

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("anthropic")
        ? Response.json({
            content: [{ type: "text", text: '{"things":[{"words":"slippers","query":"slippers"}]}' }],
            stop_reason: "end_turn",
          })
        : Response.json({ error: "rate limited" }, { status: 429 }),
    ),
  );
  expect(await find(words, 5000)).toEqual({ outcome: "nothing found" });
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/reason=channel3 429$/));
});

type Thing = {
  words: string;
  query: string;
  photos?: number[];
  under?: unknown[];
  all?: unknown[];
  choice?: unknown;
  over?: unknown;
  fails?: boolean;
};

// Each thing's first pick call gets its choice, and a second one, on the listings over the limit, its over.
function pickAnswers() {
  const seen = new Set<string>();
  return (thing?: Thing) => {
    if (!thing || !seen.has(thing.words)) return thing && (seen.add(thing.words), thing.choice);
    return thing.over;
  };
}

// Each thing's searches and pick are answered by its own query and words. A photo Find also gets blank.
function stubBasket(things: Thing[], blank?: number[]) {
  const answer = pickAnswers();
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes("cdn.trychannel3.com")) return photoAnswer(url);
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      const data =
        isNeed(body)
          ? { things: things.map(({ words, query, photos }) => ({ words, query, photos })), ...(blank && { blank }) }
          : answer(things.find((thing) => body.messages[0].content[0].text.startsWith(`They asked: ${JSON.stringify(thing.words)}`)));
      return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn" });
    }
    const thing = things.find(({ query }) => query === body.query)!;
    if (thing.fails) return Response.json({ error: "rate limited" }, { status: 429 });
    return Response.json({ products: (body.filters ? thing.under : thing.all) ?? [] });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const aa24 = product("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 9.99, "amazon.com");
const aa8 = product("prod_1Dc8aA", "Duracell Coppertop AA Batteries, 8 Pack", 8.79, "target.com");
const plugLight = product("prod_6Nl2tL", "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack", 12.49, "target.com");
const anker = product("prod_2Ak5cH", "Anker USB-C Wall Charger with 6 ft Cable", 15.99, "amazon.com");
const tabletCase = product("prod_1Cs4eB", "Universal Tablet Case", 20.89, "walmart.com");
const tablet = product("prod_6Tb8aQ", "10.1 inch Tablet with Front Camera", 149.99, "bestbuy.com");

const batteries = { words: "AA batteries", query: "AA batteries", under: [aa24, aa8], all: [aa24], choice: { picks: [pick("prod_3Ba7aA"), pick("prod_1Dc8aA")], aboveLimit: false } };
const nightLight = { words: "a night light", query: "night light", under: [plugLight], all: [plugLight], choice: { picks: [pick("prod_6Nl2tL")], aboveLimit: false } };
const charger = { words: "a phone charger", query: "phone charger", under: [anker], all: [anker], choice: { picks: [pick("prod_2Ak5cH")], aboveLimit: false } };

it("searches every thing at once and shows a group of listings for each, under Rose's words", async () => {
  const fetch = stubBasket([batteries, nightLight, charger]);

  const result = await find("AA batteries, a night light and a phone charger", 5000);

  expect(result).toEqual({
    outcome: "basket",
    groups: [
      {
        thing: "AA batteries",
        options: [
          expect.objectContaining({ id: "prod_3Ba7aA", name: aa24.title, cents: 999, shop: "amazon.com" }),
          expect.objectContaining({ id: "prod_1Dc8aA", cents: 879, why: pick("prod_1Dc8aA").why }),
        ],
        query: "AA batteries",
      },
      { thing: "a night light", options: [expect.objectContaining({ id: "prod_6Nl2tL", cents: 1249 })], query: "night light" },
      { thing: "a phone charger", options: [expect.objectContaining({ id: "prod_2Ak5cH", cents: 1599 })], query: "phone charger" },
    ],
  });
  const calls = fetch.mock.calls.map(([url, init]) => ({ url: String(url), body: init.body && JSON.parse(String(init.body)) }));
  const lastSearch = calls.findLastIndex(({ url }) => url.includes("api.trychannel3.com"));
  const firstPick = calls.findIndex(({ url, body }) => url.includes("anthropic") && !isNeed(body));
  expect(searches(fetch)).toBe(6);
  expect(lastSearch).toBeLessThan(firstPick);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=basket things=3 shown=3 listings=4 searches=6 ms=\d+ checked=4 unloaded=0$/),
  );
});

it("still shows the things it found when some can't be shown, and says why for each", async () => {
  stubBasket([
    batteries,
    { words: "a tablet for video calls", query: "tablet for video calls", under: [tabletCase], all: [tablet], choice: { picks: [], aboveLimit: true } },
    { words: "a left-handed teapot for a cat", query: "left-handed teapot for a cat" },
    { words: "a phone charger", query: "phone charger", fails: true },
  ]);

  expect(await find("AA batteries, a tablet for video calls, a left-handed teapot for a cat and a phone charger", 3000)).toEqual({
    outcome: "basket",
    groups: [
      {
        thing: "AA batteries",
        options: [expect.objectContaining({ id: "prod_3Ba7aA" }), expect.objectContaining({ id: "prod_1Dc8aA" })],
        query: "AA batteries",
      },
      { thing: "a tablet for video calls", options: [], problem: "over limit", query: "tablet for video calls" },
      { thing: "a left-handed teapot for a cat", options: [], problem: "nothing found", query: "left-handed teapot for a cat" },
      { thing: "a phone charger", options: [], problem: "nothing found", query: "phone charger" },
    ],
  });
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=basket things=4 shown=1 listings=2 searches=8 ms=\d+ checked=3 unloaded=0 reason=channel3 429$/),
  );
});

it("says it couldn't find anything when no thing in the list has listings", async () => {
  stubBasket([
    { words: "a left-handed teapot for a cat", query: "left-handed teapot for a cat" },
    { words: "a tablet for video calls", query: "tablet for video calls", under: [tabletCase], all: [tablet], choice: { picks: [], aboveLimit: true } },
  ]);

  expect(await find("a left-handed teapot for a cat and a tablet for video calls", 3000)).toEqual({
    outcome: "nothing found",
    groups: [
      { thing: "a left-handed teapot for a cat", options: [], problem: "nothing found", query: "left-handed teapot for a cat" },
      { thing: "a tablet for video calls", options: [], problem: "over limit", query: "tablet for video calls" },
    ],
  });
});

const gone = (found: ReturnType<typeof product>) => ({ ...found, images: [{ url: "https://cdn.trychannel3.com/gone" }] });

it("never sends Haiku a listing whose photo it can't download, and judges one with no photo on its words", async () => {
  const basket = gone(product("prod_qYGxLFs", "AA Batteries", 6.74, "containerstore.com"));
  const fetch = stubServices({
    need: { things: [{ words: "AA batteries", query: "AA batteries" }] },
    under: [basket, { ...aa8, images: [] }, aa24],
    all: [aa24],
    choice: { picks: [pick("prod_qYGxLFs"), pick("prod_1Dc8aA"), pick("prod_3Ba7aA")], aboveLimit: false },
  });
  const sent = { searches: 0, checked: 0, unloaded: 0 };

  const result = await find("AA batteries", 5000, sent);

  expect(result).toEqual({
    outcome: "options",
    options: [
      expect.objectContaining({ id: "prod_1Dc8aA", imageUrl: undefined }),
      expect.objectContaining({ id: "prod_3Ba7aA", imageUrl: "https://cdn.trychannel3.com/prod_3Ba7aA" }),
    ],
    query: "AA batteries",
  });
  expect(JSON.stringify(result)).not.toContain('"photo"');
  const choose = fetch.mock.calls
    .filter(([url]) => String(url).includes("anthropic"))
    .map(([, init]) => JSON.parse(String(init.body)).messages[0].content)[1];
  expect(JSON.stringify(choose)).not.toContain("prod_qYGxLFs");
  expect(choose.map((block: { type: string; text?: string }) => block.text?.split(":")[0] ?? block.type)).toEqual([
    "They asked",
    "Listing prod_1Dc8aA",
    "Listing prod_3Ba7aA",
    "image",
    "Above their price limit, not to pick from",
  ]);
  expect(sent).toEqual({ searches: 2, checked: 1, unloaded: 1 });
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=options listings=2 searches=2 ms=\d+ checked=1 unloaded=1$/),
  );
});

it("says over limit, nothing found, or blanks one group, when every listing's photo fails", async () => {
  stubServices({
    need: { things: [{ words: "a tablet for video calls", query: "tablet for video calls" }] },
    under: [gone(tabletCase)],
    all: [tablet],
    choice: { picks: [pick("prod_1Cs4eB")], aboveLimit: true },
  });
  expect(await find("a tablet for video calls", 3000)).toEqual({ outcome: "over limit", query: "tablet for video calls" });

  const fetch = stubServices({
    need: { things: [{ words: "AA batteries", query: "AA batteries" }] },
    under: [gone(aa24)],
    all: [],
    choice: { picks: [pick("prod_3Ba7aA")], aboveLimit: false },
  });
  expect(await find("AA batteries", 5000)).toEqual({ outcome: "nothing found", query: "AA batteries" });
  expect(fetch.mock.calls.filter(([url]) => String(url).includes("anthropic"))).toHaveLength(1);
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/ checked=0 unloaded=1$/));

  stubBasket([{ ...nightLight, under: [gone(plugLight)], all: [] }, batteries]);
  expect(await find("a night light and AA batteries", 5000)).toEqual({
    outcome: "basket",
    groups: [
      { thing: "a night light", options: [], problem: "nothing found", query: "night light" },
      {
        thing: "AA batteries",
        options: [expect.objectContaining({ id: "prod_3Ba7aA" }), expect.objectContaining({ id: "prod_1Dc8aA" })],
        query: "AA batteries",
      },
    ],
  });
});

it("tallies every Channel3 call it sends, also ones that fail or time out", async () => {
  const basket = stubBasket([batteries, { words: "a phone charger", query: "phone charger", fails: true }]);
  const sent = { searches: 0, checked: 0, unloaded: 0 };
  await find("AA batteries and a phone charger", 5000, sent);
  expect(sent.searches).toBe(4);
  expect(searches(basket)).toBe(4);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (!url.includes("anthropic")) throw new DOMException("The operation timed out.", "TimeoutError");
      return Response.json({
        content: [{ type: "text", text: '{"things":[{"words":"slippers","query":"slippers"}]}' }],
        stop_reason: "end_turn",
      });
    }),
  );
  const timedOut = { searches: 0, checked: 0, unloaded: 0 };
  expect(await find(words, 5000, timedOut)).toEqual({ outcome: "nothing found" });
  expect(timedOut.searches).toBe(2);
});

// The first bytes of a JPEG, as the browser's shrink makes it.
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

const coin = product("prod_2Cr3eN", "Energizer CR2032 Lithium Coin Battery, 4 Pack", 6.49, "target.com");
const coinBig = product("prod_9Cr1eN", "Panasonic CR2032 3V Lithium Coin Cell, 10 Pack", 29.99, "amazon.com");

it("tallies the Channel3 calls a photo Find sends", async () => {
  const fetch = stubServices({
    need: { things: [{ words: "CR2032 coin battery", query: "CR2032 3V lithium coin battery", photos: [1] }], blank: [] },
    under: [coin],
    all: [coin, coinBig],
    choice: { picks: [pick("prod_2Cr3eN")], aboveLimit: false },
  });
  const sent = { searches: 0, checked: 0, unloaded: 0 };

  await findPhoto("", 2500, [jpeg], sent);

  expect(sent.searches).toBe(2);
  expect(searches(fetch)).toBe(2);
});

it("finds the one thing in Rose's photo under the AI's words, and sends the photo to the first call only", async () => {
  const fetch = stubServices({
    need: { things: [{ words: "CR2032 coin battery", query: "CR2032 3V lithium coin battery", photos: [1] }], blank: [] },
    under: [coin],
    all: [coin, coinBig],
    choice: { picks: [pick("prod_2Cr3eN")], aboveLimit: false },
  });

  expect(await findPhoto("", 2500, [jpeg])).toEqual({
    words: "CR2032 coin battery",
    result: {
      outcome: "options",
      options: [expect.objectContaining({ id: "prod_2Cr3eN", cents: 649 })],
      query: "CR2032 3V lithium coin battery",
    },
    photos: 1,
    blank: 0,
  });

  const calls = fetch.mock.calls
    .filter(([url]) => String(url).includes("anthropic"))
    .map(([, init]) => JSON.parse(String(init.body)).messages[0].content);
  expect(calls[0][1]).toMatchObject({ type: "image", source: { media_type: "image/jpeg", data: jpeg.toString("base64") } });
  expect(calls[1][0].text).toMatch(/^They asked: "CR2032 coin battery"/);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=options listings=1 searches=2 ms=\d+ checked=1 unloaded=0 photos=1 blank=0$/),
  );
});

const coinThing = {
  words: "CR2032 coin battery",
  query: "CR2032 coin battery",
  under: [coin],
  all: [coin],
  choice: { picks: [pick("prod_2Cr3eN")], aboveLimit: false },
};

it("finds the things in two photos as one basket, in photo order, with a list's things in its own order", async () => {
  stubBasket([
    { ...batteries, photos: [2] },
    { ...coinThing, photos: [1] },
    { ...nightLight, photos: [2] },
    { ...charger, photos: [2] },
  ], []);

  const found = await findPhoto("", 2500, [jpeg, jpeg]);

  expect(found.words).toBe("CR2032 coin battery, AA batteries, a night light, a phone charger");
  expect(found.result).toMatchObject({
    outcome: "basket",
    groups: [{ thing: "CR2032 coin battery" }, { thing: "AA batteries" }, { thing: "a night light" }, { thing: "a phone charger" }],
  });
  expect(found).toMatchObject({ photos: 2, blank: 0 });
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=basket things=4 shown=4 listings=5 searches=8 ms=\d+ checked=5 unloaded=0 photos=2 blank=0$/),
  );
});

it("counts a photo that showed nothing to buy, and still finds the things in the others", async () => {
  stubBasket([{ ...coinThing, photos: [1] }, { ...charger, photos: [3] }], [2]);

  const found = await findPhoto("", 2500, [jpeg, jpeg, jpeg]);

  expect(found.result).toMatchObject({ outcome: "basket", groups: [{ thing: "CR2032 coin battery" }, { thing: "a phone charger" }] });
  expect(found).toMatchObject({ photos: 3, blank: 1 });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/ photos=3 blank=1$/));
});

it("counts a blank photo once, and never one that a thing is in or that Rose didn't send", async () => {
  stubBasket([{ ...coinThing, photos: [1] }, { ...charger, photos: [3] }], [1, 2, 2, 3, 0, 4, 7]);

  expect(await findPhoto("", 2500, [jpeg, jpeg, jpeg])).toMatchObject({ photos: 3, blank: 1 });
});

it("says too many for photos of six things, and nothing in photo with Rose's words kept and no blank count", async () => {
  const six = ["batteries", "a night light", "a phone charger", "a doormat", "a kettle", "a flashlight"];
  const list = stubServices({ need: { things: six.map((thing) => ({ words: thing, query: thing, photos: [1] })), blank: [] } });
  expect(await findPhoto("", 5000, [jpeg])).toEqual({ words: six.join(", "), result: { outcome: "too many" }, photos: 1, blank: 0 });
  expect(searches(list)).toBe(0);

  const garden = stubServices({ need: { things: [], blank: [1, 2] } });
  expect(await findPhoto("size 8", 5000, [jpeg, jpeg])).toEqual({
    words: "size 8",
    result: { outcome: "nothing in photo" },
    photos: 2,
    blank: 0,
  });
  expect(searches(garden)).toBe(0);
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=nothing-in-photo listings=0 searches=0 ms=\d+ checked=0 unloaded=0 photos=2 blank=0$/),
  );
});

it("says it couldn't find anything when Haiku fails on a photo, keeps Rose's words, and logs why", async () => {
  stubServices(() => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  });

  expect(await findPhoto("size 8", 5000, [jpeg])).toEqual({
    words: "size 8",
    result: { outcome: "nothing found" },
    photos: 1,
    blank: 0,
  });
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=nothing-found listings=0 searches=0 ms=\d+ checked=0 unloaded=0 photos=1 blank=0 reason=TimeoutError$/),
  );
});

// Find another's own call answers with a query; it never reads Rose's words again (D99).
const isOther = (body: { output_config: { format: { schema: { required: string[] } } } }) =>
  body.output_config.format.schema.required[0] === "query";

type Again = Thing & { last: string; refused?: string[]; otherFails?: boolean };

// Each thing's other-words call answers with its query, and its searches and pick are answered as in stubBasket.
function stubAgain(things: Again[]) {
  const answer = pickAnswers();
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes("cdn.trychannel3.com")) return photoAnswer(url);
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      if (isOther(body)) {
        const thing = things.find(({ words }) => body.messages[0].content.startsWith(`They want: ${JSON.stringify(words)}`))!;
        if (thing.otherFails) return Response.json({ error: "overloaded" }, { status: 529 });
        return Response.json({ content: [{ type: "text", text: JSON.stringify({ query: thing.query }) }], stop_reason: "end_turn" });
      }
      const data = answer(things.find((thing) => body.messages[0].content[0].text.startsWith(`They asked: ${JSON.stringify(thing.words)}`)));
      return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn" });
    }
    const thing = things.find(({ query }) => query === body.query)!;
    return Response.json({ products: (body.filters ? thing.under : thing.all) ?? [] });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const anthropicBodies = (fetch: ReturnType<typeof stubAgain>) =>
  fetch.mock.calls.filter(([url]) => String(url).includes("anthropic")).map(([, init]) => JSON.parse(String(init.body)));

const oxo = product("prod_5Jo1xO", "OXO Good Grips Jar Opener with Base Pad", 9.99, "amazon.com");
const jarPads = product("prod_7Jp4dS", "Rubber Jar Gripper Pads, Set of 6", 7.49, "target.com");
const jar = {
  words: "something to grip jar lids",
  last: "jar lid grip",
  query: "jar opener",
  under: [oxo, jarPads],
  all: [oxo],
  choice: { picks: [pick("prod_5Jo1xO"), pick("prod_7Jp4dS")], aboveLimit: false },
};

it("searches Channel3 with Haiku's other words for the thing, and keeps them as the search's query", async () => {
  const fetch = stubAgain([jar]);
  const sent = { searches: 0, checked: 0, unloaded: 0 };

  const result = await findAgain(jar.words, [{ words: jar.words, query: jar.last, refused: [] }], 5000, sent);

  expect(result).toEqual({
    outcome: "options",
    options: [expect.objectContaining({ id: "prod_5Jo1xO", cents: 999 }), expect.objectContaining({ id: "prod_7Jp4dS" })],
    query: "jar opener",
  });
  const [other, chose] = anthropicBodies(fetch);
  expect(other.messages[0].content).toBe('They want: "something to grip jar lids"\nThe last query: "jar lid grip"');
  expect(chose.messages[0].content[0].text).toMatch(/^They asked: "something to grip jar lids"/);
  const queried = fetch.mock.calls
    .filter(([url]) => String(url).includes("api.trychannel3.com"))
    .map(([, init]) => JSON.parse(String(init.body)).query);
  expect(queried).toEqual(["jar opener", "jar opener"]);
  expect(sent.searches).toBe(2);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=options listings=2 searches=2 ms=\d+ checked=2 unloaded=0 again=1$/),
  );
});

it("never sends the pick call a listing Sam refused, under or above the limit", async () => {
  const fetch = stubAgain([
    {
      words,
      last: "warm slippers easy to put on size 8",
      query: "slip-on house slippers size 8",
      under: [kohls, muji, ikea],
      all: [kohls, avenue, sheepskin],
      choice: { picks: [pick("prod_7Hq2kZ"), pick("prod_8Kp3rT")], aboveLimit: false },
    },
  ]);

  const result = await findAgain(
    words,
    [{ words, query: "warm slippers easy to put on size 8", refused: ["prod_4Fd6sW", "prod_2Lm9vQ"] }],
    5000,
  );

  expect(result).toMatchObject({ outcome: "options", options: [{ id: "prod_7Hq2kZ" }, { id: "prod_8Kp3rT" }] });
  const [, chose] = anthropicBodies(fetch);
  const sentToPick = JSON.stringify(chose.messages[0].content);
  expect(sentToPick).not.toContain("prod_4Fd6sW");
  expect(sentToPick).not.toContain("Warm Fiber Slippers");
  expect(sentToPick).not.toContain("Sheepskin Moccasin Slippers");
  expect(sentToPick).toContain("Sara Slippers");
});

it("searches every thing again at once, and marks each group tried", async () => {
  const fetch = stubAgain([
    { ...batteries, last: "AA batteries", query: "AA alkaline batteries" },
    { ...nightLight, last: "night light", query: "plug-in night light" },
    { ...charger, last: "phone charger", query: "USB wall charger" },
  ]);
  const sent = { searches: 0, checked: 0, unloaded: 0 };

  const result = await findAgain(
    "AA batteries, a night light and a phone charger",
    [
      { words: "AA batteries", query: "AA batteries", refused: ["prod_9Xx1aA"] },
      { words: "a night light", query: "night light", refused: ["prod_9Xx1aA"] },
      { words: "a phone charger", query: "phone charger", refused: ["prod_9Xx1aA"] },
    ],
    5000,
    sent,
  );

  expect(result).toEqual({
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [expect.anything(), expect.anything()], query: "AA alkaline batteries", tried: true },
      { thing: "a night light", options: [expect.objectContaining({ id: "prod_6Nl2tL" })], query: "plug-in night light", tried: true },
      { thing: "a phone charger", options: [expect.objectContaining({ id: "prod_2Ak5cH" })], query: "USB wall charger", tried: true },
    ],
  });
  expect(anthropicBodies(fetch).filter(isOther)).toHaveLength(3);
  expect(sent.searches).toBe(6);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=basket things=3 shown=3 listings=4 searches=6 ms=\d+ checked=4 unloaded=0 again=1$/),
  );
});

it("blanks only the thing whose other-words call failed, with its last query kept, and logs why", async () => {
  stubAgain([
    { ...batteries, last: "AA batteries", query: "AA alkaline batteries" },
    { ...jar, otherFails: true },
  ]);

  const result = await findAgain(
    "AA batteries, something to grip jar lids",
    [
      { words: "AA batteries", query: "AA batteries", refused: [] },
      { words: jar.words, query: jar.last, refused: [] },
    ],
    5000,
  );

  expect(result).toEqual({
    outcome: "basket",
    groups: [
      { thing: "AA batteries", options: [expect.anything(), expect.anything()], query: "AA alkaline batteries", tried: true },
      { thing: jar.words, options: [], problem: "nothing found", query: "jar lid grip", tried: true },
    ],
  });
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/ again=1 reason=anthropic 529$/));
});

it("says nothing found with the last query kept when the one thing's call fails, or when nothing fits", async () => {
  stubAgain([{ ...jar, otherFails: true }]);
  expect(await findAgain(jar.words, [{ words: jar.words, query: jar.last, refused: [] }], 5000)).toEqual({
    outcome: "nothing found",
    query: "jar lid grip",
  });

  stubAgain([{ words: "a lamp for reading in bed", last: "reading lamp for bed", query: "bedside book light", under: [], all: [] }]);
  expect(
    await findAgain(
      "a lamp for reading in bed",
      [{ words: "a lamp for reading in bed", query: "reading lamp for bed", refused: [] }],
      2000,
    ),
  ).toEqual({ outcome: "nothing found", query: "bedside book light" });

  stubAgain([
    { ...jar, under: [], all: [] },
    { words: "a lamp for reading in bed", last: "reading lamp for bed", query: "bedside book light", under: [], all: [] },
  ]);
  expect(
    await findAgain(
      "something to grip jar lids, a lamp for reading in bed",
      [
        { words: jar.words, query: jar.last, refused: [] },
        { words: "a lamp for reading in bed", query: "reading lamp for bed", refused: [] },
      ],
      2000,
    ),
  ).toEqual({ outcome: "nothing found" });
});

type Rebought = Thing & { last: { id: string; name: string; cents: number; shop: string }; named?: unknown[] };

// Each thing's query searches and pick are answered as in stubBasket, and its search by last time's listing
// name with named.
function stubRebuy(things: Rebought[]) {
  const answer = pickAnswers();
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes("cdn.trychannel3.com")) return photoAnswer(url);
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      const data = answer(things.find((thing) => body.messages[0].content[0].text.startsWith(`They asked: ${JSON.stringify(thing.words)}`)));
      return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn" });
    }
    const named = things.find(({ last }) => last.name === body.query);
    if (named) return Response.json({ products: named.named ?? [] });
    const thing = things.find(({ query }) => query === body.query)!;
    if (thing.fails) return Response.json({ error: "rate limited" }, { status: 429 });
    return Response.json({ products: (body.filters ? thing.under : thing.all) ?? [] });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const energizer = (price: number, domain = "walmart.com") =>
  product("prod_4En8aA", "Energizer MAX AA Batteries, 8 Pack", price, domain);
const paidEnergizer = { id: "prod_4En8aA", name: "Energizer MAX AA Batteries, 8 Pack", cents: 899, shop: "walmart.com" };
const rebuyBatteries = {
  ...batteries,
  last: paidEnergizer,
  named: [energizer(9.49)],
  choice: { picks: [pick("prod_3Ba7aA"), pick("prod_4En8aA"), pick("prod_1Dc8aA")], aboveLimit: false },
};
const rebuyOf = ({ words, query, last }: Rebought) => ({ words, query, last });

it("searches last time's query, and last time's listing by its name at the same time, and shows that listing first", async () => {
  const fetch = stubRebuy([rebuyBatteries]);
  const sent = { searches: 0, checked: 0, unloaded: 0 };

  const result = await findRebuy("AA batteries", [rebuyOf(rebuyBatteries)], 2000, sent);

  expect(result).toEqual({
    outcome: "options",
    options: [
      expect.objectContaining({ id: "prod_4En8aA", cents: 949, shop: "walmart.com" }),
      expect.objectContaining({ id: "prod_3Ba7aA" }),
      expect.objectContaining({ id: "prod_1Dc8aA" }),
    ],
    query: "AA batteries",
    last: { id: "prod_4En8aA", cents: 899, shop: "walmart.com" },
  });
  const queried = fetch.mock.calls
    .filter(([url]) => String(url).includes("api.trychannel3.com"))
    .map(([, init]) => JSON.parse(String(init.body)));
  expect(queried.map(({ query }) => query)).toEqual(["AA batteries", "AA batteries", "Energizer MAX AA Batteries, 8 Pack"]);
  expect(queried[2].filters).toBeUndefined();
  const [chose] = anthropicBodies(fetch);
  expect(JSON.stringify(chose.messages[0].content)).toContain("Listing prod_4En8aA (they bought this one last time):");
  expect(sent.searches).toBe(3);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=options listings=3 searches=3 ms=\d+ checked=3 unloaded=0 rebuy=1 same=1\/1$/),
  );
});

it("keeps last time's listing's price today when it's over Sam's limit now, and never offers it as a pick", async () => {
  const fetch = stubRebuy([{ ...rebuyBatteries, under: [aa8], all: [aa24], choice: { picks: [pick("prod_1Dc8aA")], aboveLimit: false } }]);

  const result = await findRebuy("AA batteries", [rebuyOf(rebuyBatteries)], 900);

  expect(result).toEqual({
    outcome: "options",
    options: [expect.objectContaining({ id: "prod_1Dc8aA" })],
    query: "AA batteries",
    last: { id: "prod_4En8aA", cents: 899, shop: "walmart.com", nowCents: 949 },
  });
  const [chose] = anthropicBodies(fetch);
  expect(JSON.stringify(chose.messages[0].content)).not.toContain("prod_4En8aA");
  expect(chose.system).not.toContain("last time");
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/ rebuy=1 same=0\/1$/));
});

it("says nothing of last time's listing's price when no search has it, or the pick step leaves it out", async () => {
  stubRebuy([{ ...rebuyBatteries, named: [] }]);
  expect(await findRebuy("AA batteries", [rebuyOf(rebuyBatteries)], 2000)).toMatchObject({
    outcome: "options",
    last: { id: "prod_4En8aA", cents: 899, shop: "walmart.com" },
  });

  stubRebuy([{ ...rebuyBatteries, choice: { picks: [pick("prod_3Ba7aA")], aboveLimit: false } }]);
  const dropped = await findRebuy("AA batteries", [rebuyOf(rebuyBatteries)], 2000);
  expect(dropped).toEqual({
    outcome: "options",
    options: [expect.objectContaining({ id: "prod_3Ba7aA" })],
    query: "AA batteries",
    last: { id: "prod_4En8aA", cents: 899, shop: "walmart.com" },
  });
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/ rebuy=1 same=0\/1$/));
});

it("searches each paid thing at once, each group with its last listing, and blanks only a thing whose search fails", async () => {
  const paidAnker = { id: "prod_2Ak5cH", name: "Anker USB-C Wall Charger with 6 ft Cable", cents: 1599, shop: "amazon.com" };
  const rebuyCharger = { ...charger, last: paidAnker, named: [anker] };
  const sent = { searches: 0, checked: 0, unloaded: 0 };
  stubRebuy([rebuyBatteries, rebuyCharger]);

  const result = await findRebuy("AA batteries and a phone charger", [rebuyOf(rebuyBatteries), rebuyOf(rebuyCharger)], 2000, sent);

  expect(result).toEqual({
    outcome: "basket",
    groups: [
      {
        thing: "AA batteries",
        options: [expect.objectContaining({ id: "prod_4En8aA" }), expect.anything(), expect.anything()],
        query: "AA batteries",
        last: { id: "prod_4En8aA", cents: 899, shop: "walmart.com" },
      },
      {
        thing: "a phone charger",
        options: [expect.objectContaining({ id: "prod_2Ak5cH" })],
        query: "phone charger",
        last: { id: "prod_2Ak5cH", cents: 1599, shop: "amazon.com" },
      },
    ],
  });
  expect(sent.searches).toBe(6);
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^find outcome=basket things=2 shown=2 listings=4 searches=6 .* rebuy=1 same=2\/2$/));

  stubRebuy([rebuyBatteries, { ...rebuyCharger, fails: true }]);
  expect(await findRebuy("AA batteries and a phone charger", [rebuyOf(rebuyBatteries), rebuyOf(rebuyCharger)], 2000)).toEqual({
    outcome: "basket",
    groups: [
      expect.objectContaining({ thing: "AA batteries", last: { id: "prod_4En8aA", cents: 899, shop: "walmart.com" } }),
      { thing: "a phone charger", options: [], problem: "nothing found", query: "phone charger" },
    ],
  });
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/ rebuy=1 same=1\/2 reason=channel3 429$/));

  stubRebuy([
    { ...rebuyBatteries, under: [], all: [], named: [] },
    { ...rebuyCharger, under: [], all: [], named: [] },
  ]);
  expect(await findRebuy("AA batteries and a phone charger", [rebuyOf(rebuyBatteries), rebuyOf(rebuyCharger)], 2000)).toMatchObject({
    outcome: "nothing found",
    groups: [{ thing: "AA batteries", problem: "nothing found" }, { thing: "a phone charger", problem: "nothing found" }],
  });
});

const caneTip = product("prod_3Ct7tP", "Replacement Rubber Cane Tips, 2 Pack", 8.99, "amazon.com");
const fourPoint = product("prod_9Fp4cN", "Four Point Cane", 20.24, "lowes.com");
const quadCane = product("prod_2Sq8aQ", "Small Base Aluminum Quad Cane", 23.89, "staples.com");
const walgreensCane = product("prod_6Wq3sB", "Walgreens Quad Cane Small Base", 24.99, "walgreens.com");
const largeBase = product("prod_8Hc5qL", "Hugo Quad Cane, Large Base", 44.99, "walmart.com");
const stick = "a walking stick that stands up by itself";
const caneSearch = { need: { things: [{ words: stick, query: "self-standing walking stick" }] }, under: [caneTip] };

it("shows up to 3 listings over Sam's limit, cheapest first, when none under it fits and one above does", async () => {
  const fetch = stubServices({
    ...caneSearch,
    all: [caneTip, walgreensCane, largeBase, fourPoint, quadCane],
    choice: { picks: [], aboveLimit: true },
    over: { picks: [pick("prod_6Wq3sB"), pick("prod_9Fp4cN"), pick("prod_2Sq8aQ")], aboveLimit: false },
  });
  const sent = { searches: 0, checked: 0, unloaded: 0 };

  const result = await find(stick, 2000, sent);

  expect(result).toEqual({
    outcome: "over limit",
    options: [
      expect.objectContaining({ id: "prod_9Fp4cN", name: "Four Point Cane", cents: 2024, shop: "lowes.com" }),
      expect.objectContaining({ id: "prod_2Sq8aQ", cents: 2389, shop: "staples.com", why: pick("prod_2Sq8aQ").why }),
      expect.objectContaining({ id: "prod_6Wq3sB", cents: 2499, shop: "walgreens.com" }),
    ],
    query: "self-standing walking stick",
  });
  const [, first, second] = anthropicBodies(fetch);
  expect(JSON.stringify(first.messages[0].content.at(-1).text)).toContain("Hugo Quad Cane, Large Base");
  expect(second.system).toBe(first.system);
  expect(second.messages[0].content.map((block: { type: string; text?: string }) => block.text?.split(":")[0] ?? block.type)).toEqual([
    "They asked",
    "Listing prod_9Fp4cN",
    "image",
    "Listing prod_2Sq8aQ",
    "image",
    "Listing prod_6Wq3sB",
    "image",
    "Above their price limit, not to pick from",
  ]);
  expect(second.messages[0].content.at(-1).text).toBe("Above their price limit, not to pick from:\n[]");
  expect(sent).toEqual({ searches: 2, checked: 4, unloaded: 0 });
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=over-limit listings=3 searches=2 ms=\d+ checked=4 unloaded=0$/),
  );
});

it("sends the second pick call only the 5 cheapest listings up to double the limit, without what Sam refused", async () => {
  const canes = [2999, 2123, 3950, 2601, 2275, 3399, 2788].map((cents, index) =>
    product(`prod_${index}Qc${index}cN`, `Quad Cane ${index}`, cents / 100, "walmart.com"),
  );
  const fetch = stubAgain([
    {
      words: stick,
      last: "self-standing walking stick",
      query: "quad cane that stands on its own",
      under: [caneTip],
      all: [...canes, largeBase],
      choice: { picks: [], aboveLimit: true },
      over: { picks: [pick("prod_1Qc1cN")], aboveLimit: false },
    },
  ]);

  const result = await findAgain(stick, [{ words: stick, query: "self-standing walking stick", refused: ["prod_4Qc4cN"] }], 2000);

  expect(result).toMatchObject({ outcome: "over limit", options: [{ id: "prod_1Qc1cN", cents: 2123 }] });
  const [, , second] = anthropicBodies(fetch);
  const sentToPick = second.messages[0].content.flatMap((block: { text?: string }) => block.text?.match(/^Listing (\w+)/)?.[1] ?? []);
  expect(sentToPick).toEqual(["prod_1Qc1cN", "prod_3Qc3cN", "prod_6Qc6cN", "prod_0Qc0cN", "prod_5Qc5cN"]);
});
