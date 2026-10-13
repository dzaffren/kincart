import pg from "pg";
import { expect, it } from "vitest";
import { migrate } from "./migrate.mjs";

const url = process.env.DATABASE_URL;

async function tableExists(name: string) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT to_regclass($1) AS name", [`public.${name}`]);
    return rows[0].name !== null;
  } finally {
    await client.end();
  }
}

it("migrates up, back down, and up again", async () => {
  await migrate("up", url);
  expect(await tableExists("status_checks")).toBe(true);
  expect(await tableExists("paypal_vault")).toBe(true);
  expect(await tableExists("purchase_requests")).toBe(true);

  await migrate("down", url);
  expect(await tableExists("paypal_vault")).toBe(false);
  expect(await tableExists("purchase_requests")).toBe(false);
  expect(await tableExists("status_checks")).toBe(true);

  await migrate("up", url);
  expect(await tableExists("paypal_vault")).toBe(true);
  expect(await tableExists("purchase_requests")).toBe(true);
});
