import { Client } from "pg";
import type { Group, Option, Search } from "./find";
import { things, type Item } from "./items";
import type { Person } from "./people";

export type RequestStatus = "waiting" | "paying" | "paid" | "declined" | "failed";

export type Source = { shop: string; url: string; reason: string };

// thing is what Rose called it, such as "a night light"; name is the listing's own.
export type Line = Item & Source & { thing: string };

export type PurchaseRequest = {
  id: number;
  item: Item;
  found: Source | null;
  status: RequestStatus;
  askedAt: Date;
  answeredAt: Date | null;
  orderId: string | null;
  captureId: string | null;
  failureReason: string | null;
  lines: Line[] | null;
  leftOut: string[] | null;
};

export type Outcome =
  | { state: "paid"; orderId: string; captureId: string }
  | { state: "refused"; reason: string };

type Row = {
  id: string;
  item_id: string;
  item_name: string;
  amount_cents: number;
  status: RequestStatus;
  asked_at: Date;
  answered_at: Date | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  failure_reason: string | null;
  shop: string | null;
  listing_url: string | null;
  reason: string | null;
  lines: Line[] | null;
  left_out: string[] | null;
};

export type Subscription = { endpoint: string; p256dh: string; auth: string };

export type SavedSearch = {
  words: string;
  outcome: Search["outcome"] | "retry";
  options: Option[];
  groups: Group[];
  searchedAt: Date;
};

const DEFAULT_LIMIT_CENTS = 5000;

export async function getVault(): Promise<string | null> {
  const rows = await query<{ payment_token: string }>("SELECT payment_token FROM paypal_vault WHERE id = 1");
  return rows[0]?.payment_token ?? null;
}

export async function saveVault(paymentToken: string): Promise<void> {
  await query(
    `INSERT INTO paypal_vault (id, payment_token) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET payment_token = EXCLUDED.payment_token, linked_at = now()`,
    [paymentToken],
  );
}

export async function latest(): Promise<PurchaseRequest | null> {
  const rows = await query<Row>("SELECT * FROM purchase_requests ORDER BY id DESC LIMIT 1");
  return rows[0] ? toRequest(rows[0]) : null;
}

// A second ask while one is open hits purchase_requests_one_open and is dropped.
export async function ask(item: Item, source?: Source, lines?: Line[]): Promise<boolean> {
  const rows = await query(
    `INSERT INTO purchase_requests (item_id, item_name, amount_cents, shop, listing_url, reason, lines)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      item.id,
      item.name,
      item.cents,
      source?.shop ?? null,
      source?.url ?? null,
      source?.reason ?? null,
      lines ? JSON.stringify(lines) : null,
    ],
  );
  return rows.length === 1;
}

export async function getSearch(): Promise<SavedSearch | null> {
  const rows = await query<{
    words: string;
    outcome: SavedSearch["outcome"];
    listings: Option[];
    groups: Group[];
    searched_at: Date;
  }>("SELECT words, outcome, listings, groups, searched_at FROM rose_search WHERE id = 1");
  const row = rows[0];
  return row
    ? { words: row.words, outcome: row.outcome, options: row.listings, groups: row.groups, searchedAt: row.searched_at }
    : null;
}

export async function saveSearch(words: string, result: Search | { outcome: "retry" }): Promise<void> {
  await query(
    `INSERT INTO rose_search (id, words, outcome, listings, groups) VALUES (1, $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
     SET words = EXCLUDED.words, outcome = EXCLUDED.outcome, listings = EXCLUDED.listings, groups = EXCLUDED.groups,
         searched_at = now()`,
    [
      words,
      result.outcome,
      JSON.stringify(result.outcome === "options" ? result.options : []),
      JSON.stringify(result.outcome === "basket" ? result.groups : []),
    ],
  );
}

export async function clearSearch(): Promise<void> {
  await query("DELETE FROM rose_search");
}

export async function getLimit(): Promise<number> {
  const rows = await query<{ cents: number }>("SELECT cents FROM price_limit WHERE id = 1");
  return rows[0]?.cents ?? DEFAULT_LIMIT_CENTS;
}

export async function setLimit(cents: number): Promise<void> {
  await query(
    `INSERT INTO price_limit (id, cents) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET cents = EXCLUDED.cents, set_at = now()`,
    [cents],
  );
}

export async function decline(id: number): Promise<PurchaseRequest | null> {
  const rows = await query<Row>(
    `UPDATE purchase_requests SET status = 'declined', answered_at = now()
     WHERE id = $1 AND status = 'waiting' RETURNING *`,
    [id],
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export function keep(lines: Line[], ticked: string[]): { lines: Line[]; leftOut: string[]; cents: number } | null {
  const kept = lines.filter((line) => ticked.includes(line.id));
  if (!kept.length) return null;
  return {
    lines: kept,
    leftOut: lines.filter((line) => !kept.includes(line)).map((line) => line.thing),
    cents: kept.reduce((sum, line) => sum + line.cents, 0),
  };
}

// A basket is claimed for its ticked lines only, at their stored prices; with none ticked it stays waiting.
export async function claim(id: number, ticked: string[] = []): Promise<PurchaseRequest | null> {
  const [open] = await query<Pick<Row, "lines">>(
    "SELECT lines FROM purchase_requests WHERE id = $1 AND status = 'waiting'",
    [id],
  );
  if (!open) return null;
  const basket = open.lines && keep(open.lines, ticked);
  if (open.lines && !basket) return null;

  const rows = await query<Row>(
    `UPDATE purchase_requests
     SET status = 'paying', answered_at = now(),
         lines = COALESCE($2, lines), left_out = $3, amount_cents = COALESCE($4, amount_cents),
         item_name = COALESCE($5, item_name)
     WHERE id = $1 AND status = 'waiting' RETURNING *`,
    [
      id,
      basket ? JSON.stringify(basket.lines) : null,
      basket?.leftOut.length ? JSON.stringify(basket.leftOut) : null,
      basket?.cents ?? null,
      basket ? things(basket.lines.length) : null,
    ],
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function record(id: number, outcome: Outcome): Promise<boolean> {
  const rows =
    outcome.state === "paid"
      ? await query(
          `UPDATE purchase_requests SET status = 'paid', paypal_order_id = $2, paypal_capture_id = $3
           WHERE id = $1 AND status = 'paying' RETURNING id`,
          [id, outcome.orderId, outcome.captureId],
        )
      : await query(
          `UPDATE purchase_requests SET status = 'failed', failure_reason = $2
           WHERE id = $1 AND status = 'paying' RETURNING id`,
          [id, outcome.reason],
        );
  return rows.length === 1;
}

export async function stuck(): Promise<PurchaseRequest | null> {
  const rows = await query<Row>(
    `SELECT * FROM purchase_requests
     WHERE status = 'paying' AND answered_at < now() - interval '15 seconds'
     ORDER BY id LIMIT 1`,
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function saveSubscription(person: Person, subscription: Subscription): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (person, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET person = EXCLUDED.person, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [person, subscription.endpoint, subscription.p256dh, subscription.auth],
  );
}

export async function subscriptionsFor(person: Person): Promise<Subscription[]> {
  return query<Subscription>("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE person = $1 ORDER BY id", [
    person,
  ]);
}

export async function forgetSubscription(endpoint: string): Promise<void> {
  await query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
}

async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end().catch(() => {});
  }
}

function toRequest(row: Row): PurchaseRequest {
  return {
    id: Number(row.id),
    item: { id: row.item_id, name: row.item_name, cents: row.amount_cents },
    found: row.shop && row.listing_url && row.reason ? { shop: row.shop, url: row.listing_url, reason: row.reason } : null,
    status: row.status,
    askedAt: row.asked_at,
    answeredAt: row.answered_at,
    orderId: row.paypal_order_id,
    captureId: row.paypal_capture_id,
    failureReason: row.failure_reason,
    lines: row.lines,
    leftOut: row.left_out,
  };
}
