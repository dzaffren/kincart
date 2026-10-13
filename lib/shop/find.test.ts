import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { find } from "./find";

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

type Answers = { need: unknown; under?: unknown[]; all?: unknown[]; choice?: unknown };

function stubServices(answers: Answers | (() => never)) {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (typeof answers === "function") return answers();
    const body = JSON.parse(String(init.body));
    if (url.includes("anthropic")) {
      const data = body.max_tokens === 200 ? answers.need : answers.choice;
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
    need: { kind: "product", query: "warm slippers easy to put on size 8" },
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
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^find outcome=options listings=3 ms=\d+$/));
});

it("says nothing under the limit when the thing only exists above it", async () => {
  stubServices({
    need: { kind: "product", query: "tablet for video calls with front camera" },
    under: [product("prod_1Cs4eB", "Universal Tablet Case", 20.89, "walmart.com")],
    all: [product("prod_6Tb8aQ", "10.1 inch Tablet with Front Camera", 149.99, "bestbuy.com")],
    choice: { picks: [], aboveLimit: true },
  });

  expect(await find("a tablet for video calls", 3000)).toEqual({ outcome: "over limit" });
});

it("says it couldn't find anything when nothing fits at any price", async () => {
  const fetch = stubServices({
    need: { kind: "product", query: "left-handed teapot for a cat" },
    under: [],
    all: [],
  });

  expect(await find("a left-handed teapot for a cat", 5000)).toEqual({ outcome: "nothing found" });
  expect(searches(fetch)).toBe(2);
});

it("asks for one thing at a time for a list, and searches for nothing that isn't a product", async () => {
  const list = stubServices({ need: { kind: "list", query: "milk bread eggs" } });
  expect(await find("milk, bread and eggs", 5000)).toEqual({ outcome: "several" });
  expect(searches(list)).toBe(0);

  const notAProduct = stubServices({ need: { kind: "not a product", query: "time in Ohio" } });
  expect(await find("what time is it in Ohio", 5000)).toEqual({ outcome: "nothing found" });
  expect(searches(notAProduct)).toBe(0);
});

it("says it couldn't find anything when Haiku or Channel3 fails, and logs why", async () => {
  stubServices(() => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  });
  expect(await find(words, 5000)).toEqual({ outcome: "nothing found" });
  expect(console.log).toHaveBeenLastCalledWith(
    expect.stringMatching(/^find outcome=nothing-found listings=0 ms=\d+ reason=TimeoutError$/),
  );

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("anthropic")
        ? Response.json({ content: [{ type: "text", text: '{"kind":"product","query":"slippers"}' }], stop_reason: "end_turn" })
        : Response.json({ error: "rate limited" }, { status: 429 }),
    ),
  );
  expect(await find(words, 5000)).toEqual({ outcome: "nothing found" });
  expect(console.log).toHaveBeenLastCalledWith(expect.stringMatching(/reason=channel3 429$/));
});
