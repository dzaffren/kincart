import pg from "pg";
import { beforeAll, beforeEach, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { hashOf, linksIn, newLink, whoIs } from "./people";
import { startHousehold } from "./requests";

const links = { rose: "rose-link-4f9c2a7e", sam: "sam-link-b81d5e30" };

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    "TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions; DELETE FROM households WHERE id <> 1",
  );
  await client.end();
});

it("knows the links in the env as household 1's Rose and Sam", async () => {
  expect(await whoIs("rose-link-4f9c2a7e", links)).toEqual({ household: 1, person: "rose" });
  expect(await whoIs("sam-link-b81d5e30", links)).toEqual({ household: 1, person: "sam" });
});

it("knows a started household's Rose and Sam by their links, which it keeps only as hashes", async () => {
  const [rose, sam] = [newLink(), newLink()];
  expect(rose).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(sam).not.toBe(rose);
  const household = await startHousehold(hashOf(rose), hashOf(sam));

  expect(await whoIs(rose, links)).toEqual({ household, person: "rose" });
  expect(await whoIs(sam, links)).toEqual({ household, person: "sam" });
  expect(hashOf(rose)).toMatch(/^[0-9a-f]{64}$/);
  expect(hashOf(rose)).not.toContain(rose);
});

it("knows nobody by a wrong, cut-off or empty link", async () => {
  const rose = newLink();
  await startHousehold(hashOf(rose), hashOf(newLink()));

  expect(await whoIs("rose-link-4f9c2a7f", links)).toBeNull();
  expect(await whoIs("rose-link-4f9c", links)).toBeNull();
  expect(await whoIs(rose.slice(0, -1), links)).toBeNull();
  expect(await whoIs("", links)).toBeNull();
});

it("knows nobody by the env's links when they aren't set", async () => {
  expect(await whoIs("", { rose: "", sam: "" })).toBeNull();
  expect(await whoIs("rose-link-4f9c2a7e", { rose: undefined, sam: undefined })).toBeNull();
});

it("brings back one household's two links from this browser's cookie, and nothing else", async () => {
  const [rose, sam] = [newLink(), newLink()];
  await startHousehold(hashOf(rose), hashOf(sam));
  const [otherRose, otherSam] = [newLink(), newLink()];
  await startHousehold(hashOf(otherRose), hashOf(otherSam));

  expect(await linksIn(`${rose}.${sam}`)).toEqual({ rose, sam });
  expect(await linksIn(`${sam}.${rose}`)).toBeNull();
  expect(await linksIn(`${rose}.${otherSam}`)).toBeNull();
  expect(await linksIn(`${rose}.${newLink()}`)).toBeNull();
  expect(await linksIn(`${rose}.${sam}.${otherSam}`)).toBeNull();
  expect(await linksIn("")).toBeNull();
  expect(await linksIn(undefined)).toBeNull();
});
