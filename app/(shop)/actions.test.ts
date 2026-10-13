import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "../../lib/shop/items";
import { ask, getLimit, getSearch, latest, saveSearch, saveVault } from "../../lib/shop/requests";
import { answer, askSam, find, setLimit, startLink, tryAgain } from "./actions";

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
  await client.query("TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit");
  await client.end();
  await saveVault("1j970427g9944212v");
  vi.stubEnv("ROSE_LINK_TOKEN", rose);
  vi.stubEnv("SAM_LINK_TOKEN", sam);
  vi.stubGlobal("fetch", vi.fn());
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ content: [{ type: "text", text: '{"kind":"list","query":"milk bread eggs"}' }], stop_reason: "end_turn" }),
    ),
  );

  expect(await redirectOf(find(rose, form({ words: "  milk, bread and eggs " })))).toBe(`/r/${rose}`);
  expect(await getSearch()).toMatchObject({ words: "milk, bread and eggs", outcome: "several" });

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
