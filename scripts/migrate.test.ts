import { readFile } from "node:fs/promises";
import pg from "pg";
import { expect, it } from "vitest";
import { migrate } from "./migrate.mjs";

const url = process.env.DATABASE_URL;

async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

async function ask<T>(text: string, params: unknown[]): Promise<T> {
  return (await sql<T>(text, params))[0];
}

async function clear() {
  await sql(
    "TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions; DELETE FROM address_uses; DELETE FROM usage_days",
  );
}

// migrate("down") undoes only the newest file, so this runs older down files by hand.
async function downFile(file: string) {
  await sql(await readFile(new URL(`../db/migrations/${file}`, import.meta.url), "utf8"));
}

// Steps back past 0012, 0011, 0010, 0009 and 0008 to the households migration.
async function downToHouseholds() {
  await migrate("down", url);
  for (const file of [
    "0011_find_limits.down.sql",
    "0010_photo_ask_several.down.sql",
    "0009_photo_ask.down.sql",
    "0008_clearer_pages.down.sql",
    "0007_households.down.sql",
  ]) {
    await downFile(file);
  }
}

async function tableExists(name: string) {
  return (await ask<{ name: string | null }>("SELECT to_regclass($1) AS name", [`public.${name}`])).name !== null;
}

async function columnExists(table: string, column: string) {
  const row = await ask<{ found: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2) AS found",
    [table, column],
  );
  return row.found;
}

it("migrates up, back down, and up again", async () => {
  await migrate("up", url);
  for (const table of [
    "status_checks",
    "paypal_vault",
    "purchase_requests",
    "rose_search",
    "price_limit",
    "push_subscriptions",
    "total_limit",
    "households",
    "address_uses",
    "usage_days",
  ]) {
    expect(await tableExists(table)).toBe(true);
  }
  expect(await columnExists("purchase_requests", "listing_url")).toBe(true);
  expect(await columnExists("purchase_requests", "lines")).toBe(true);
  expect(await columnExists("rose_search", "groups")).toBe(true);
  expect(await columnExists("purchase_requests", "household_id")).toBe(true);
  expect(await columnExists("push_subscriptions", "household_id")).toBe(true);
  expect(await columnExists("purchase_requests", "watch")).toBe(true);
  expect(await columnExists("purchase_requests", "image_url")).toBe(true);
  expect(await columnExists("rose_search", "from_photo")).toBe(true);
  expect(await columnExists("rose_search", "photos")).toBe(true);
  expect(await columnExists("rose_search", "blank_photos")).toBe(true);

  await migrate("down", url);
  expect(await tableExists("usage_days")).toBe(false);
  expect(await tableExists("address_uses")).toBe(true);

  await downFile("0011_find_limits.down.sql");
  expect(await tableExists("address_uses")).toBe(false);
  expect(await columnExists("rose_search", "photos")).toBe(true);

  await downFile("0010_photo_ask_several.down.sql");
  expect(await columnExists("rose_search", "photos")).toBe(false);
  expect(await columnExists("rose_search", "blank_photos")).toBe(false);
  expect(await columnExists("rose_search", "from_photo")).toBe(true);

  await migrate("up", url);
  expect(await columnExists("rose_search", "photos")).toBe(true);
  expect(await columnExists("rose_search", "blank_photos")).toBe(true);
  expect(await tableExists("address_uses")).toBe(true);
  expect(await tableExists("usage_days")).toBe(true);
});

it("reruns with a photo search that saw nothing to buy, and goes back down to nothing found", async () => {
  await migrate("up", url);
  await clear();
  await sql("INSERT INTO rose_search (id, words, outcome, from_photo) VALUES (1, '', 'nothing in photo', true)");

  await expect(migrate("up", url)).resolves.toBeDefined();

  await migrate("down", url);
  await downFile("0011_find_limits.down.sql");
  await downFile("0010_photo_ask_several.down.sql");
  await downFile("0009_photo_ask.down.sql");
  expect(await sql("SELECT outcome FROM rose_search")).toEqual([{ outcome: "nothing found" }]);
  await expect(sql("UPDATE rose_search SET outcome = 'nothing in photo'")).rejects.toThrow(/rose_search_outcome_check/);

  await migrate("up", url);
  await clear();
});

it("keeps the rows from before as household 1's, reruns with two households' asks, and goes back to household 1 alone", async () => {
  await migrate("up", url);
  await clear();
  await downToHouseholds();
  await sql("INSERT INTO paypal_vault (payment_token) VALUES ('1j970427g9944212v')");
  await sql("INSERT INTO price_limit (cents) VALUES (3000)");
  await sql("INSERT INTO purchase_requests (item_id, item_name, amount_cents, status) VALUES ('aa', 'AA batteries', 999, 'paid')");
  await sql(
    "INSERT INTO push_subscriptions (person, endpoint, p256dh, auth) VALUES ('sam', 'https://fcm.googleapis.com/fcm/send/sam-phone', 'key', 'auth')",
  );

  await migrate("up", url);
  expect(await sql("SELECT household_id FROM purchase_requests")).toEqual([{ household_id: "1" }]);
  expect(await sql("SELECT household_id FROM push_subscriptions")).toEqual([{ household_id: "1" }]);
  expect(await sql("SELECT id, cents FROM price_limit")).toEqual([{ id: "1", cents: 3000 }]);

  await sql("INSERT INTO households (id, rose_hash, sam_hash) VALUES (2, 'rose-hash-2', 'sam-hash-2')");
  await sql("INSERT INTO price_limit (id, cents) VALUES (2, 2000)");
  await sql(
    "INSERT INTO purchase_requests (household_id, item_id, item_name, amount_cents) VALUES (1, 'light', 'Night light', 1249), (2, 'charger', 'Phone charger', 2499)",
  );
  await expect(migrate("up", url)).resolves.toBeDefined();

  await downToHouseholds();
  expect(await sql("SELECT item_id FROM purchase_requests ORDER BY id")).toEqual([{ item_id: "aa" }, { item_id: "light" }]);
  expect(await sql("SELECT id FROM price_limit")).toEqual([{ id: 1 }]);
  await expect(sql("INSERT INTO price_limit (id, cents) VALUES (2, 900)")).rejects.toThrow(/price_limit_id_check/);
  expect(
    await sql("INSERT INTO purchase_requests (item_id, item_name, amount_cents) VALUES ('pills', 'Pills', 799) ON CONFLICT DO NOTHING RETURNING id"),
  ).toEqual([]);

  await migrate("up", url);
  await clear();
  expect(await sql("SELECT id FROM households")).toEqual([{ id: "1" }]);
});
