import { Client } from "pg";
import { reasonOf } from "./database";

// Channel3's free tier is about 1,000 searches a month (find-limits O6). From 800, /status shows the month in red.
export const SEARCHES_A_MONTH = 1000;
export const SEARCHES_RED = 800;

export type Counts = { finds: number; searches: number; stoppedFinds: number; stoppedHouseholds: number };

export type UsageResult =
  | { state: "ok"; today: Counts; month: Counts }
  | { state: "not configured" }
  | { state: "not reachable"; reason: string };

type Row = Record<`${"finds" | "searches" | "stopped_finds" | "stopped_households"}_${"today" | "month"}`, number>;

// Today's row, and every row from the 1st of the UTC month (D78, D80).
const SUMS = `
  SELECT
    coalesce(sum(finds) FILTER (WHERE day = today), 0)::int AS finds_today,
    coalesce(sum(searches) FILTER (WHERE day = today), 0)::int AS searches_today,
    coalesce(sum(stopped_finds) FILTER (WHERE day = today), 0)::int AS stopped_finds_today,
    coalesce(sum(stopped_households) FILTER (WHERE day = today), 0)::int AS stopped_households_today,
    coalesce(sum(finds), 0)::int AS finds_month,
    coalesce(sum(searches), 0)::int AS searches_month,
    coalesce(sum(stopped_finds), 0)::int AS stopped_finds_month,
    coalesce(sum(stopped_households), 0)::int AS stopped_households_month
  FROM usage_days, (SELECT (now() AT TIME ZONE 'UTC')::date AS today) t
  WHERE day >= date_trunc('month', today::timestamp)::date`;

export async function readUsage(url = process.env.DATABASE_URL): Promise<UsageResult> {
  if (!url) return { state: "not configured" };

  let client: Client | undefined;
  try {
    client = new Client({
      connectionString: url,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
    });
    await client.connect();
    const {
      rows: [row],
    } = await client.query<Row>(SUMS);
    return { state: "ok", today: countsOf(row, "today"), month: countsOf(row, "month") };
  } catch (error) {
    return { state: "not reachable", reason: reasonOf(error) };
  } finally {
    await client?.end().catch(() => {});
  }
}

function countsOf(row: Row, period: "today" | "month"): Counts {
  return {
    finds: row[`finds_${period}`],
    searches: row[`searches_${period}`],
    stoppedFinds: row[`stopped_finds_${period}`],
    stoppedHouseholds: row[`stopped_households_${period}`],
  };
}
