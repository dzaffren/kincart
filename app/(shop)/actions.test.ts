import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { ITEMS } from "../../lib/shop/items";
import { ask, latest, saveVault } from "../../lib/shop/requests";
import { answer, askSam, startLink } from "./actions";

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
  await client.query("TRUNCATE purchase_requests; DELETE FROM paypal_vault");
  await client.end();
  await saveVault("1j970427g9944212v");
  vi.stubEnv("ROSE_LINK_TOKEN", rose);
  vi.stubEnv("SAM_LINK_TOKEN", sam);
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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
