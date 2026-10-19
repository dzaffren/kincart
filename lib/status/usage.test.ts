import pg from "pg";
import { beforeAll, beforeEach, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { readUsage } from "./usage";

const url = process.env.DATABASE_URL;

async function sql<T>(text: string): Promise<T[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(text)).rows as T[];
  } finally {
    await client.end();
  }
}

const today = "(now() AT TIME ZONE 'UTC')::date";
const firstOfMonth = `date_trunc('month', ${today}::timestamp)::date`;

beforeAll(async () => {
  await migrate("up", url);
});

beforeEach(async () => {
  await sql("DELETE FROM usage_days");
});

it("sums today's row for today, and every row from the 1st of the UTC month for this month", async () => {
  await sql(`INSERT INTO usage_days VALUES (${today}, 38, 214, 4, 1), (${firstOfMonth} - 1, 410, 900, 31, 7)`);
  await sql(`INSERT INTO usage_days SELECT ${firstOfMonth}, 58, 326, 5, 1 WHERE ${firstOfMonth} <> ${today}`);
  const [{ first }] = await sql<{ first: boolean }>(`SELECT ${firstOfMonth} = ${today} AS first`);

  const usage = await readUsage(url);

  const todays = { finds: 38, searches: 214, stoppedFinds: 4, stoppedHouseholds: 1 };
  const month = first ? todays : { finds: 96, searches: 540, stoppedFinds: 9, stoppedHouseholds: 2 };
  expect(usage).toEqual({ state: "ok", today: todays, month });
});

it("starts a new UTC day and month from 0, whatever last month counted", async () => {
  await sql(`INSERT INTO usage_days VALUES (${firstOfMonth} - 1, 12, 410, 3, 1)`);

  const zero = { finds: 0, searches: 0, stoppedFinds: 0, stoppedHouseholds: 0 };
  expect(await readUsage(url)).toEqual({ state: "ok", today: zero, month: zero });
});

it("says not configured when there is no DATABASE_URL", async () => {
  expect(await readUsage("")).toEqual({ state: "not configured" });
});

it("says not reachable when the database refuses connections", async () => {
  expect(await readUsage("postgres://u:p@127.0.0.1:1/x")).toEqual({ state: "not reachable", reason: "ECONNREFUSED" });
});
