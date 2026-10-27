import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import type { AddressInfo, Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { keyOf, serve } from "./fake-apis.mjs";

const slippers = { query: "warm slippers easy to put on size 8", limit: 10, filters: { price: { max_price: 50 } } };
const products = { products: [{ id: "prod_7Hq2kZ", title: "Warm House Shoes Unisex Comfy Fuzzy Slip-on House Slippers" }] };

const pick = (photo: string) => ({
  model: "claude-haiku-5-5",
  max_tokens: 4000,
  system: "Pick the listings that are what Rose asked for.",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "prod_7Hq2kZ: Warm House Shoes" },
        { type: "image", source: { type: "base64", media_type: "image/webp", data: photo } },
      ],
    },
  ],
});

let dir = "";
let server: Server;
let base = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fake-apis-"));
  server = serve(dir);
  await new Promise<void>((done) => server.listen(0, "localhost", done));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  server.close();
  await rm(dir, { recursive: true });
  vi.restoreAllMocks();
});

const post = (path: string, body: object) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

it("answers a Channel3 search from its recorded reply", async () => {
  await writeFile(join(dir, `channel3-${keyOf("channel3", slippers)}.json`), JSON.stringify({ request: slippers, reply: products }));

  const response = await post("/v1/search", slippers);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(products);
});

it("answers 500 to a call with no recording, names it in the log, and saves nothing", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await post("/v1/search", { query: "hearing aid batteries", limit: 10 });
  expect(response.status).toBe(500);
  expect(log).toHaveBeenCalledWith(expect.stringContaining("no recording: channel3 hearing aid batteries"));
  expect(await readdir(dir)).toEqual([]);
});

it("matches a Claude call on its text, whatever the photo's bytes", async () => {
  expect(keyOf("anthropic", pick("UklGRiQAAABXRUJQ"))).toBe(keyOf("anthropic", pick("UklGRjwAAABXRUJQ")));
  expect(keyOf("anthropic", pick("x"))).not.toBe(keyOf("anthropic", { ...pick("x"), system: "Pick one." }));
  expect(keyOf("anthropic", pick("x"))).not.toBe(keyOf("channel3", pick("x")));

  const reply = { content: [{ type: "text", text: '{"picks":["prod_7Hq2kZ"]}' }], stop_reason: "end_turn" };
  await writeFile(join(dir, `anthropic-${keyOf("anthropic", pick("old"))}.json`), JSON.stringify({ reply }));
  const response = await post("/v1/messages", pick("new"));
  expect(await response.json()).toEqual(reply);
});
