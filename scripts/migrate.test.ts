import pg from "pg";
import { expect, it } from "vitest";
import { migrate } from "./migrate.mjs";

const url = process.env.DATABASE_URL;

async function statusChecksExists() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT to_regclass('public.status_checks') AS name");
    return rows[0].name !== null;
  } finally {
    await client.end();
  }
}

it("migrates up, back down, and up again", async () => {
  await migrate("up", url);
  expect(await statusChecksExists()).toBe(true);

  await migrate("down", url);
  expect(await statusChecksExists()).toBe(false);

  await migrate("up", url);
  expect(await statusChecksExists()).toBe(true);
});
