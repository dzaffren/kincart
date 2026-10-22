import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { searchListings, withPhotos, type Found } from "./search";

const slippers = {
  id: "prod_7Hq2kZ",
  title: "Warm House Shoes Unisex Comfy Fuzzy Slip-on House Slippers",
  description: "Fuzzy slip-on house slippers with a soft upper and a non-slip sole.",
  images: [{ url: "https://cdn.trychannel3.com/cf161813-ad1c-4512-a648-0583bd913dfe" }],
  offers: [
    {
      url: "https://www.kohls.com/product/prd-7120871/warm-house-shoes.jsp",
      domain: "kohls.com",
      price: { price: 27.07, compare_at_price: 28.49, currency: "USD" },
      availability: "InStock",
    },
  ],
  variants: { options: [{ name: "Size", values: [{ label: "6" }, { label: "8" }, { label: "10" }] }] },
  structured_attributes: { "closure-type": ["Slip-on"], "footwear-material": ["Textile", "Microfiber"] },
};

const soldOut = {
  ...slippers,
  id: "prod_9Xw1pL",
  offers: [{ ...slippers.offers[0], availability: "OutOfStock" }],
};

const free = {
  ...slippers,
  id: "prod_0Fr3eE",
  offers: [{ ...slippers.offers[0], price: { price: 0, currency: "USD" } }],
};

const underACent = {
  ...slippers,
  id: "prod_1Hc5tP",
  offers: [{ ...slippers.offers[0], price: { price: 0.004, currency: "USD" } }],
};

const inPounds = {
  ...slippers,
  id: "prod_3Rt8mN",
  offers: [{ ...slippers.offers[0], price: { price: 21.5, currency: "GBP" } }],
};

function stubChannel3(answer: () => Response) {
  const fetch = vi.fn(async () => answer());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  vi.stubEnv("CHANNEL3_API_KEY", "c3-test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("searches Channel3 under the limit and keeps in-stock US-dollar listings that cost something", async () => {
  const fetch = stubChannel3(() =>
    Response.json({ products: [slippers, soldOut, inPounds, free, underACent], next_page_token: null }),
  );

  expect(await searchListings("warm slippers easy to put on size 8", 5000)).toEqual([
    {
      id: "prod_7Hq2kZ",
      name: "Warm House Shoes Unisex Comfy Fuzzy Slip-on House Slippers",
      cents: 2707,
      shop: "kohls.com",
      url: "https://www.kohls.com/product/prd-7120871/warm-house-shoes.jsp",
      imageUrl: "https://cdn.trychannel3.com/cf161813-ad1c-4512-a648-0583bd913dfe",
      details: expect.stringContaining("Sizes: 6, 8, 10"),
    },
  ]);

  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://api.trychannel3.com/v1/search");
  expect((init.headers as Record<string, string>)["x-api-key"]).toBe("c3-test-key");
  expect(JSON.parse(String(init.body))).toEqual({
    query: "warm slippers easy to put on size 8",
    limit: 10,
    filters: { price: { max_price: 50 } },
  });
});

it("searches with no price filter when there is no limit", async () => {
  const fetch = stubChannel3(() => Response.json({ products: [] }));

  expect(await searchListings("tablet for video calls")).toEqual([]);
  const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(String(init.body))).toEqual({ query: "tablet for video calls", limit: 10 });
});

it("throws when Channel3 refuses, so the caller can say it couldn't find anything", async () => {
  stubChannel3(() => Response.json({ error: "rate limited" }, { status: 429 }));

  await expect(searchListings("warm slippers")).rejects.toThrow("channel3 429");
});

const found = (id: string, imageUrl?: string): Found => ({
  id,
  name: "Duracell Coppertop AA Batteries, 8 Pack",
  cents: 879,
  shop: "target.com",
  url: `https://www.target.com/p/${id}`,
  imageUrl,
  details: "Long-lasting AA alkaline batteries.",
});

const photoOf = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#e8e8e8" } }).webp().toBuffer();

const photo = (body: BodyInit, type = "image/webp", status = 200) =>
  new Response(body, { status, headers: { "content-type": type } });

it("downloads each listing's photo from Channel3's photo host and shrinks it to 512 px, with no key sent", async () => {
  const big = await photoOf(2048, 1536);
  const fetch = stubChannel3(() => photo(new Uint8Array(big), "image/jpeg"));
  const timeout = vi.spyOn(AbortSignal, "timeout");

  const [kept] = await withPhotos([found("prod_1Dc8aA", "https://cdn.trychannel3.com/a1b2c3")]);

  expect(kept).toEqual({ ...found("prod_1Dc8aA", "https://cdn.trychannel3.com/a1b2c3"), photo: { mediaType: "image/webp", data: expect.any(String) } });
  expect(await sharp(Buffer.from(kept.photo!.data, "base64")).metadata()).toMatchObject({ format: "webp", width: 512, height: 384 });
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://cdn.trychannel3.com/a1b2c3");
  expect(init.redirect).toBe("error");
  expect(timeout).toHaveBeenCalledWith(3000);
  expect(init.signal).toBe(timeout.mock.results[0].value);
  expect(init.headers).toBeUndefined();
});

it("keeps a small photo at its own size", async () => {
  const small = await photoOf(300, 200);
  stubChannel3(() => photo(new Uint8Array(small)));

  const [kept] = await withPhotos([found("prod_1Dc8aA", "https://cdn.trychannel3.com/a1b2c3")]);

  expect(await sharp(Buffer.from(kept.photo!.data, "base64")).metadata()).toMatchObject({ width: 300, height: 200 });
});

it("passes a listing with no photo on, with no download", async () => {
  const fetch = stubChannel3(() => photo(""));

  expect(await withPhotos([found("prod_1Dc8aA")])).toEqual([found("prod_1Dc8aA")]);
  expect(fetch).not.toHaveBeenCalled();
});

it("drops a listing whose photo is missing, slow, moved, elsewhere, not a photo, broken or too big", async () => {
  // Noise doesn't compress, so this is a real photo over 1 MB that only the size check can drop.
  const noise = await sharp(randomBytes(700 * 700 * 3), { raw: { width: 700, height: 700, channels: 3 } }).png().toBuffer();
  expect(noise.length).toBeGreaterThan(1024 * 1024);
  const answers: Record<string, () => Response> = {
    gone: () => photo("Not found", "text/plain", 404),
    slow: () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    },
    moved: () => {
      throw new TypeError("fetch failed: redirect mode is set to error");
    },
    page: () => photo("<!doctype html><title>Sign in</title>", "text/html"),
    broken: () => photo(new Uint8Array(Buffer.from("524946462400000057454250565038", "hex"))),
    huge: () => photo(new Uint8Array(noise), "image/png"),
  };
  const fetch = vi.fn(async (url: string) => answers[url.split("/").pop()!]());
  vi.stubGlobal("fetch", fetch);

  const listings = [
    ...Object.keys(answers).map((name) => found(`prod_${name}`, `https://cdn.trychannel3.com/${name}`)),
    found("prod_other", "https://images.example.com/gone"),
    found("prod_lookalike", "https://cdn.trychannel3.com.example.com/slow"),
    found("prod_http", "http://cdn.trychannel3.com/gone"),
  ];
  expect(await withPhotos(listings)).toEqual([]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(Object.keys(answers).map((name) => `https://cdn.trychannel3.com/${name}`));
});
