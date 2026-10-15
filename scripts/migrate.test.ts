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
    "TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions",
  );
}

// migrate("down") undoes only the newest file, so this steps back past 0008 to the households migration.
async function downToHouseholds() {
  await migrate("down", url);
  await sql(await readFile(new URL("../db/migrations/0007_households.down.sql", import.meta.url), "utf8"));
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

  await migrate("down", url);
  expect(await columnExists("purchase_requests", "watch")).toBe(false);
  expect(await columnExists("purchase_requests", "image_url")).toBe(false);
  expect(await tableExists("households")).toBe(true);

  await migrate("up", url);
  expect(await columnExists("purchase_requests", "watch")).toBe(true);
  expect(await columnExists("purchase_requests", "image_url")).toBe(true);
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
