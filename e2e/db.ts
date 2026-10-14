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
