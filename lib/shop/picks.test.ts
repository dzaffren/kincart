import { readFileSync } from "node:fs";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { find, findRebuy } from "./find";

// Real Channel3 products and photos, saved once (D90, D94). wrong and right map each listing's id to
// what its photo shows. Channel3 answers every search with under or all, as the real search would.
type Ask = {
  words: string;
  limitCents: number;
  wrong: Record<string, string>;
  right: Record<string, string>;
  under: { id: string; title: string; images: { url: string }[] }[];
  all: unknown[];
};

const asks: Ask[] = JSON.parse(readFileSync(new URL("./picks/asks.json", import.meta.url), "utf8"));

const realFetch = globalThis.fetch;

// Channel3 and its photo host answer from the saved set. Only Haiku is called for real.
function stubChannel3(ask: Ask) {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.startsWith("https://api.trychannel3.com/")) {
      return Response.json({ products: JSON.parse(String(init?.body)).filters ? ask.under : ask.all });
    }
    if (url.startsWith("https://cdn.trychannel3.com/")) {
      const { id } = ask.under.find((product) => product.images[0].url === url)!;
      const photo = readFileSync(new URL(`./picks/photos/${id}.webp`, import.meta.url));
      return new Response(new Uint8Array(photo), { headers: { "content-type": "image/webp" } });
    }
    return realFetch(url, init);
  });
}

beforeAll(() => {
  expect(process.env.ANTHROPIC_API_KEY, "set ANTHROPIC_API_KEY").toBeTruthy();
});

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const ask of asks) {
  const wrong = Object.keys(ask.wrong);
  it(`never shows ${[...new Set(Object.values(ask.wrong))].join(", ")} for "${ask.words}", in 3 of 3 runs`, { timeout: 60_000 }, async () => {
    stubChannel3(ask);

    const runs = await Promise.all([1, 2, 3].map(() => find(ask.words, ask.limitCents)));

    runs.forEach((run, index) => {
      const shown = run.outcome === "options" ? run.options.map((option) => option.id) : [];
      const named = shown.map((id) => `${id} (${ask.wrong[id] ?? ask.right[id] ?? "unlabelled"})`).join(", ");
      expect(shown.filter((id) => wrong.includes(id)), `run ${index + 1} showed ${named || run.outcome}`).toEqual([]);
      expect(shown.some((id) => id in ask.right), `run ${index + 1} showed ${named || run.outcome}`).toBe(true);
    });
  });
}

// Ask again labels last time's listing for the pick call (D104), and a wrong one stays out all the same (D89).
const [batteries] = asks;
const rebuy = (id: string, cents: number, shop: string) => [
  { words: batteries.words, query: batteries.words, last: { id, name: batteries.under.find((listing) => listing.id === id)!.title, cents, shop } },
];

it(`never shows ${batteries.wrong.qYGxLFs}, sold as "AA Batteries", when Rose bought it last time, in 3 of 3 runs`, { timeout: 60_000 }, async () => {
  stubChannel3(batteries);

  const runs = await Promise.all([1, 2, 3].map(() => findRebuy(batteries.words, rebuy("qYGxLFs", 674, "containerstore.com"), 5000)));

  runs.forEach((run, index) => {
    const shown = run.outcome === "options" ? run.options.map((option) => option.id) : [];
    expect(shown, `run ${index + 1} showed ${shown.join(", ") || run.outcome}`).not.toContain("qYGxLFs");
  });
});

it(`shows the ${batteries.right.VISeFk2} that Rose bought last time first, in 3 of 3 runs`, { timeout: 60_000 }, async () => {
  stubChannel3(batteries);

  const runs = await Promise.all([1, 2, 3].map(() => findRebuy(batteries.words, rebuy("VISeFk2", 743, "walmart.com"), 5000)));

  runs.forEach((run, index) => {
    const shown = run.outcome === "options" ? run.options.map((option) => option.id) : [];
    expect(shown[0], `run ${index + 1} showed ${shown.join(", ") || run.outcome}`).toBe("VISeFk2");
  });
});
