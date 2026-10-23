import pg from "pg";
import type { Group, Option, Search } from "../lib/shop/find";
import { addressOf, keyOf } from "../lib/shop/limits";

export async function sql(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows;
  } finally {
    await client.end();
  }
}

// A search is options, or a basket with groups, unless it names its outcome, such as "over limit".
export async function reset(
  paypal: string | null,
  search?: { words: string; outcome?: Search["outcome"]; options?: Option[]; groups?: Group[] },
) {
  await sql("TRUNCATE purchase_requests");
  await sql("DELETE FROM paypal_vault");
  await sql("DELETE FROM rose_search");
  await sql("DELETE FROM price_limit");
  await sql("DELETE FROM total_limit");
  await sql("DELETE FROM push_subscriptions");
  await sql("DELETE FROM households WHERE id <> 1");
  await sql("DELETE FROM address_uses");
  await sql("DELETE FROM usage_days");
  if (paypal) await sql("INSERT INTO paypal_vault (payment_token) VALUES ($1)", [paypal]);
  if (search) {
    await sql("INSERT INTO rose_search (words, outcome, listings, groups) VALUES ($1, $2, $3, $4)", [
      search.words,
      search.outcome ?? (search.groups ? "basket" : "options"),
      JSON.stringify(search.options ?? []),
      JSON.stringify(search.groups ?? []),
    ]);
  }
}

export const listing = (id: string, name: string, cents: number, shop: string): Option => ({
  id,
  name,
  cents,
  shop,
  url: `https://www.${shop}/`,
  what: `${name}.`,
  why: "It is what Rose asked for.",
  watch: "Check the pack before you buy.",
});

// The newest household gets a one-listing search, so its Rose asks at a fixed price.
export async function searchFor(words: string, option: Option) {
  const [{ id }] = await sql("SELECT max(id) AS id FROM households");
  await sql("INSERT INTO rose_search (id, words, outcome, listings) VALUES ($1, $2, 'options', $3)", [
    id,
    words,
    JSON.stringify([option]),
  ]);
}

// An address's uses in place of any it had: `count` of them, the oldest `hours` ago and the rest a minute apart.
export async function usedFrom(address: string, kind: "find" | "household", count: number, hours: number) {
  await sql(
    `INSERT INTO address_uses (kind, address, used_at)
     VALUES ($1, $2, ARRAY(SELECT now() - make_interval(secs => $4 * 3600) + n * interval '1 minute' FROM generate_series(0, $3 - 1) n))
     ON CONFLICT (kind, address) DO UPDATE SET used_at = EXCLUDED.used_at`,
    [kind, keyOf(addressOf(address)), count, hours],
  );
}

// Today's UTC row of counts, as Finds and stops before this test would have left it.
export async function usageToday(finds: number, searches: number, stoppedFinds: number, stoppedHouseholds: number) {
  await sql("INSERT INTO usage_days VALUES ((now() AT TIME ZONE 'UTC')::date, $1, $2, $3, $4)", [
    finds,
    searches,
    stoppedFinds,
    stoppedHouseholds,
  ]);
}
