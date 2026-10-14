import pg from "pg";
import type { Group, Option } from "../lib/shop/find";

export async function sql(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows;
  } finally {
    await client.end();
  }
}

export async function reset(paypal: string | null, search?: { words: string; options?: Option[]; groups?: Group[] }) {
  await sql("TRUNCATE purchase_requests");
  await sql("DELETE FROM paypal_vault");
  await sql("DELETE FROM rose_search");
  await sql("DELETE FROM price_limit");
  await sql("DELETE FROM total_limit");
  await sql("DELETE FROM push_subscriptions");
  await sql("DELETE FROM households WHERE id <> 1");
  if (paypal) await sql("INSERT INTO paypal_vault (payment_token) VALUES ($1)", [paypal]);
  if (search) {
    await sql("INSERT INTO rose_search (words, outcome, listings, groups) VALUES ($1, $2, $3, $4)", [
      search.words,
      search.groups ? "basket" : "options",
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
