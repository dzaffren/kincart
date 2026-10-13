import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { searchListings } from "./search";

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
});

it("searches Channel3 under the limit and keeps in-stock US-dollar listings", async () => {
  const fetch = stubChannel3(() => Response.json({ products: [slippers, soldOut, inPounds], next_page_token: null }));

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
