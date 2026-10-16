import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { choose, readNeed, readPhoto } from "./ai";
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

it("asks Haiku for each thing in Rose's own words, with a search query for each", async () => {
  const things = [
    { words: "AA batteries", query: "AA batteries" },
    { words: "a night light", query: "night light" },
  ];
  const fetch = stubHaiku(() => reply({ things }));

  expect(await readNeed("AA batteries and a night light")).toEqual({ things });

  const { body } = sent(fetch);
  expect(body.messages).toEqual([{ role: "user", content: "AA batteries and a night light" }]);
  expect(body.system).toContain("their own words");
  expect(body.output_config.format.schema.required).toEqual(["things"]);
  expect(body.max_tokens).toBe(2000);
});

// The first bytes of a JPEG, as the browser's shrink makes it.
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

const second = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x18, 0x45, 0x78, 0x69, 0x66]);

const image = (data: Buffer) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: data.toString("base64") } });

it("sends Haiku each of Rose's photos under its number, then what Rose typed, with a prompt of its own", async () => {
  const need = {
    things: [
      { words: "CR2032 coin battery", query: "CR2032 coin battery", photos: [1] },
      { words: "grey slip-on slippers, size 8", query: "grey slip-on slippers size 8", photos: [2] },
    ],
    blank: [],
  };
  const fetch = stubHaiku(() => reply(need));

  expect(await readPhoto("size 8", [jpeg, second])).toEqual(need);

  const { body } = sent(fetch);
  expect(body.messages).toEqual([
    {
      role: "user",
      content: [
        { type: "text", text: "Photo 1:" },
        image(jpeg),
        { type: "text", text: "Photo 2:" },
        image(second),
        { type: "text", text: "They typed: size 8" },
      ],
    },
  ]);
  expect(body.system).toContain("labelled Photo 1, Photo 2");
  expect(body.system).toContain("written shopping list");
  expect(body.system).toContain("In blank");
  expect(body.system).not.toContain("their own words");
  expect(body.model).toBe("claude-haiku-5-5");
  expect(body.output_config.effort).toBe("low");
  const schema = body.output_config.format.schema;
  expect(schema.required).toEqual(["things", "blank"]);
  expect(schema.properties.things.items.required).toEqual(["words", "query", "photos"]);
  expect(schema.properties.things.items.properties.photos).toEqual({ type: "array", items: { type: "integer" } });
  expect(schema.properties.blank).toEqual({ type: "array", items: { type: "integer" } });
  expect(body.max_tokens).toBe(2000);
});

it("tells Haiku that Rose typed nothing with a photo alone", async () => {
  const fetch = stubHaiku(() => reply({ things: [], blank: [1] }));

  expect(await readPhoto("", [jpeg])).toEqual({ things: [], blank: [1] });

  expect(sent(fetch).body.messages[0].content).toEqual([
    { type: "text", text: "Photo 1:" },
    image(jpeg),
    { type: "text", text: "They typed nothing." },
  ]);
});

it("calls Haiku 5.5 with low effort and a fixed answer shape", async () => {
  const fetch = stubHaiku(() => reply({ things: [{ words, query: "warm slippers easy to put on size 8" }] }));

  await readNeed(words);

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

  expect(sent(fetch).body.max_tokens).toBe(4000);
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

  stubHaiku(() => reply({ things: [] }, "max_tokens"));
  await expect(readNeed(words)).rejects.toThrow("anthropic max_tokens");
});
