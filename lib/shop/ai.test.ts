import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { choose, readNeed } from "./ai";
import type { Found } from "./search";

const words = "warm slippers that are easy to put on, size 8";

const kohls: Found = {
  id: "prod_7Hq2kZ",
  name: "Warm House Shoes Unisex Comfy Fuzzy Slip-on House Slippers",
  cents: 2707,
  shop: "kohls.com",
  url: "https://www.kohls.com/product/prd-7120871/warm-house-shoes.jsp",
  details: "Fuzzy slip-on house slippers with a soft upper and a non-slip sole.\nSizes: 6, 8, 10",
};

const reply = (data: unknown, stop = "end_turn") =>
  Response.json({ content: [{ type: "text", text: JSON.stringify(data) }], stop_reason: stop });

function stubHaiku(answer: () => Response) {
  const fetch = vi.fn(async () => answer());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function sent(fetch: ReturnType<typeof stubHaiku>) {
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  return { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("asks Haiku whether Rose's words are one product, and for a search query", async () => {
  const fetch = stubHaiku(() => reply({ kind: "product", query: "warm slippers easy to put on size 8" }));

  expect(await readNeed(words)).toEqual({ kind: "product", query: "warm slippers easy to put on size 8" });

  const { url, headers, body } = sent(fetch);
  expect(url).toBe("https://api.anthropic.com/v1/messages");
  expect(headers["x-api-key"]).toBe("sk-ant-test-key");
  expect(headers["anthropic-version"]).toBe("2023-06-01");
  expect(body.model).toBe("claude-haiku-5-5");
  expect(body.messages).toEqual([{ role: "user", content: words }]);
  expect(body.output_config.effort).toBe("low");
  expect(body.output_config.format.type).toBe("json_schema");
});

it("gives Haiku the listings under the limit by id, and only the names above it", async () => {
  const pick = {
    id: "prod_7Hq2kZ",
    what: "A fuzzy slip-on house slipper with a soft upper and a non-slip sole.",
    why: "It is simple to step into, and size 8 is listed.",
    watch: "It is unisex, so check the size chart against your usual size.",
  };
  const fetch = stubHaiku(() => reply({ picks: [pick], aboveLimit: false }));

  expect(await choose(words, [kohls], [{ ...kohls, id: "prod_2Lm9vQ", name: "Sheepskin Moccasin Slippers" }])).toEqual({
    picks: [pick],
    aboveLimit: false,
  });

  const message = sent(fetch).body.messages[0].content;
  expect(message).toContain(words);
  expect(message).toContain('"id":"prod_7Hq2kZ"');
  expect(message).toContain("Sizes: 6, 8, 10");
  expect(message).toContain("Sheepskin Moccasin Slippers");
  expect(message).not.toContain("prod_2Lm9vQ");
  expect(message).not.toContain("27.07");
});

it("throws when Haiku fails or its answer is cut off", async () => {
  stubHaiku(() => Response.json({ type: "error", error: { type: "overloaded_error" } }, { status: 529 }));
  await expect(readNeed(words)).rejects.toThrow("anthropic 529");

  stubHaiku(() => reply({ kind: "product" }, "max_tokens"));
  await expect(readNeed(words)).rejects.toThrow("anthropic max_tokens");
});
