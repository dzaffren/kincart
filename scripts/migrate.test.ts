import pg from "pg";
import { expect, it } from "vitest";
import { migrate } from "./migrate.mjs";

const url = process.env.DATABASE_URL;

async function ask<T>(text: string, params: unknown[]): Promise<T> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(text, params)).rows[0] as T;
  } finally {
    await client.end();
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
  ]) {
    expect(await tableExists(table)).toBe(true);
  }
  expect(await columnExists("purchase_requests", "listing_url")).toBe(true);
  expect(await columnExists("purchase_requests", "lines")).toBe(true);
  expect(await columnExists("rose_search", "groups")).toBe(true);

  await migrate("down", url);
  expect(await tableExists("total_limit")).toBe(false);
  expect(await tableExists("price_limit")).toBe(true);
  expect(await columnExists("purchase_requests", "lines")).toBe(true);
  expect(await columnExists("rose_search", "groups")).toBe(true);

  await migrate("up", url);
  expect(await tableExists("total_limit")).toBe(true);
});
