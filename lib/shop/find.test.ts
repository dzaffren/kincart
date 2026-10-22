import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { find, findPhoto } from "./find";

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

type Answers = { need: unknown; under?: unknown[]; all?: unknown[]; choice?: unknown };

function stubServices(answers: Answers | (() => never)) {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (typeof answers === "function") return answers();
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      const data = isNeed(body) ? answers.need : answers.choice;
      return Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: "end_turn" });
    }
    return Response.json({ products: body.filters ? answers.under : answers.all });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const searches = (fetch: ReturnType<typeof stubServices>) =>
  fetch.mock.calls.filter(([url]) => String(url).includes("trychannel3")).length;

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
  });
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^find outcome=options listings=3 searches=2 ms=\d+$/));
});

it("says nothing under the limit when the thing only exists above it", async () => {
  stubServices({
    need: { things: [{ words: "a tablet for video calls", query: "tablet for video calls with front camera" }] },
    under: [product("prod_1Cs4eB", "Universal Tablet Case", 20.89, "walmart.com")],
    all: [product("prod_6Tb8aQ", "10.1 inch Tablet with Front Camera", 149.99, "bestbuy.com")],
    choice: { picks: [], aboveLimit: true },
  });

  expect(await find("a tablet for video calls", 3000)).toEqual({ outcome: "over limit" });
});

it("says it couldn't find anything when nothing fits at any price", async () => {
  const fetch = stubServices({
    need: { things: [{ words: "a left-handed teapot for a cat", query: "left-handed teapot for a cat" }] },
    under: [],
    all: [],
  });

  expect(await find("a left-handed teapot for a cat", 5000)).toEqual({ outcome: "nothing found" });
  expect(searches(fetch)).toBe(2);
});

it("says too many for more than five things, and searches for nothing that isn't a product", async () => {
  const six = ["batteries", "a night light", "a phone charger", "a doormat", "a kettle", "a flashlight"];
  const list = stubServices({ need: { things: six.map((thing) => ({ words: thing, query: thing })) } });
  expect(await find(six.join(", "), 5000)).toEqual({ outcome: "too many" });
  expect(searches(list)).toBe(0);
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/^find outcome=too-many listings=0 searches=0 ms=\d+$/));

  const notAProduct = stubServices({ need: { things: [] } });
  expect(await find("what time is it in Ohio", 5000)).toEqual({ outcome: "nothing found" });
  expect(searches(notAProduct)).toBe(0);

  const blank = stubServices({ need: { things: [{ words: "something nice", query: " " }] } });
  expect(await find("something nice", 5000)).toEqual({ outcome: "nothing found" });
  expect(searches(blank)).toBe(0);
});

it("says it couldn't find anything when Haiku or Channel3 fails, and logs why", async () => {
  stubServices(() => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  });
  expect(await find(words, 5000)).toEqual({ outcome: "nothing found" });
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=nothing-found listings=0 searches=0 ms=\d+ reason=TimeoutError$/),
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
  fails?: boolean;
};

// Each thing's searches and pick are answered by its own query and words. A photo Find also gets blank.
function stubBasket(things: Thing[], blank?: number[]) {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      const data =
        isNeed(body)
          ? { things: things.map(({ words, query, photos }) => ({ words, query, photos })), ...(blank && { blank }) }
          : things.find((thing) => body.messages[0].content[0].text.startsWith(`They asked: ${JSON.stringify(thing.words)}`))
              ?.choice;
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
      },
      { thing: "a night light", options: [expect.objectContaining({ id: "prod_6Nl2tL", cents: 1249 })] },
      { thing: "a phone charger", options: [expect.objectContaining({ id: "prod_2Ak5cH", cents: 1599 })] },
    ],
  });
  const calls = fetch.mock.calls.map(([url, init]) => ({ url: String(url), body: JSON.parse(String(init.body)) }));
  const lastSearch = calls.findLastIndex(({ url }) => url.includes("trychannel3"));
  const firstPick = calls.findIndex(({ url, body }) => url.includes("anthropic") && !isNeed(body));
  expect(searches(fetch)).toBe(6);
  expect(lastSearch).toBeLessThan(firstPick);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=basket things=3 shown=3 listings=4 searches=6 ms=\d+$/),
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
      { thing: "AA batteries", options: [expect.objectContaining({ id: "prod_3Ba7aA" }), expect.objectContaining({ id: "prod_1Dc8aA" })] },
      { thing: "a tablet for video calls", options: [], problem: "over limit" },
      { thing: "a left-handed teapot for a cat", options: [], problem: "nothing found" },
      { thing: "a phone charger", options: [], problem: "nothing found" },
    ],
  });
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=basket things=4 shown=1 listings=2 searches=8 ms=\d+ reason=channel3 429$/),
  );
});

it("says it couldn't find anything when no thing in the list has listings", async () => {
  stubBasket([
    { words: "a left-handed teapot for a cat", query: "left-handed teapot for a cat" },
    { words: "a tablet for video calls", query: "tablet for video calls", under: [tabletCase], all: [tablet], choice: { picks: [], aboveLimit: true } },
  ]);

  expect(await find("a left-handed teapot for a cat and a tablet for video calls", 3000)).toEqual({
    outcome: "nothing found",
  });
});

it("tallies every Channel3 call it sends, also ones that fail or time out", async () => {
  const basket = stubBasket([batteries, { words: "a phone charger", query: "phone charger", fails: true }]);
  const sent = { searches: 0 };
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
  const timedOut = { searches: 0 };
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
  const sent = { searches: 0 };

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
    result: { outcome: "options", options: [expect.objectContaining({ id: "prod_2Cr3eN", cents: 649 })] },
    photos: 1,
    blank: 0,
  });

  const calls = fetch.mock.calls
    .filter(([url]) => String(url).includes("anthropic"))
    .map(([, init]) => JSON.parse(String(init.body)).messages[0].content);
  expect(calls[0][1]).toMatchObject({ type: "image", source: { media_type: "image/jpeg", data: jpeg.toString("base64") } });
  expect(calls[1][0].text).toMatch(/^They asked: "CR2032 coin battery"/);
  expect(console.log).toHaveBeenCalledWith(
    expect.stringMatching(/^find outcome=options listings=1 searches=2 ms=\d+ photos=1 blank=0$/),
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
    expect.stringMatching(/^find outcome=basket things=4 shown=4 listings=5 searches=8 ms=\d+ photos=2 blank=0$/),
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
    expect.stringMatching(/^find outcome=nothing-in-photo listings=0 searches=0 ms=\d+ photos=2 blank=0$/),
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
    expect.stringMatching(/^find outcome=nothing-found listings=0 searches=0 ms=\d+ photos=1 blank=0 reason=TimeoutError$/),
  );
});
