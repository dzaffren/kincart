import { Client } from "pg";
import type { Counts } from "../status/usage";
import type { Group, Last, Option, Search } from "./find";
import { things, type Item } from "./items";
import type { Use } from "./limits";
import { reasonOf } from "./paypal";
import type { Person } from "./people";

export type RequestStatus = "waiting" | "paying" | "paid" | "declined" | "failed";

// watch and imageUrl are missing on asks made before Sam saw them.
export type Source = { shop: string; url: string; reason: string; watch?: string; imageUrl?: string };

// thing is what Rose called it, such as "a night light"; name is the listing's own.
export type Line = Item & Source & { thing: string };

// Each pick's thing, the query that found it and its listing id, so Find another can search the thing
// again without it after a No or an untick (D100).
export type PickQuery = { id: string; thing: string; query: string };

export type PurchaseRequest = {
  id: number;
  household: number;
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
  queries: PickQuery[] | null;
};

export type Outcome =
  | { state: "paid"; orderId: string; captureId: string }
  | { state: "refused"; reason: string };

type Row = {
  id: string;
  household_id: string;
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
  watch: string | null;
  image_url: string | null;
  lines: Line[] | null;
  left_out: string[] | null;
  queries: PickQuery[] | null;
};

export type Subscription = { endpoint: string; p256dh: string; auth: string };

export type SavedSearch = {
  words: string;
  outcome: Search["outcome"] | "retry";
  options: Option[];
  groups: Group[];
  fromPhoto: boolean;
  photos: number;
  blankPhotos: number;
  // query is a one-thing search's shop query; a basket keeps one in each group. tried: Find another ran it.
  query: string | null;
  tried: boolean;
  // Sam's Find another ran it, not Rose's (D116).
  bySam: boolean;
  // A one-thing rebuy's listing from last time; a basket keeps one in each group (D107).
  last: Last | null;
  searchedAt: Date;
};

const DEFAULT_LIMIT_CENTS = 5000;

// A new household has no saved PayPal: Rose links one, or Skip copies household 1's (D58).
export async function startHousehold(roseHash: string, samHash: string): Promise<number> {
  const rows = await query<{ id: string }>("INSERT INTO households (rose_hash, sam_hash) VALUES ($1, $2) RETURNING id", [
    roseHash,
    samHash,
  ]);
  return Number(rows[0].id);
}

export async function findHousehold(hash: string): Promise<{ household: number; person: Person } | null> {
  const rows = await query<{ id: string; rose: boolean }>(
    "SELECT id, rose_hash = $1 AS rose FROM households WHERE rose_hash = $1 OR sam_hash = $1",
    [hash],
  );
  return rows[0] ? { household: Number(rows[0].id), person: rows[0].rose ? "rose" : "sam" } : null;
}

// The one-row tables' id is the household's id (D46).
export async function getVault(household: number): Promise<string | null> {
  const rows = await query<{ payment_token: string }>("SELECT payment_token FROM paypal_vault WHERE id = $1", [
    household,
  ]);
  return rows[0]?.payment_token ?? null;
}

export async function saveVault(household: number, paymentToken: string): Promise<void> {
  await query(
    `INSERT INTO paypal_vault (id, payment_token) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET payment_token = EXCLUDED.payment_token, linked_at = now()`,
    [household, paymentToken],
  );
}

// Skip gives a household a copy of household 1's saved PayPal (D58), and never replaces one it linked.
export async function copyDemoVault(household: number): Promise<boolean> {
  const rows = await query(
    `INSERT INTO paypal_vault (id, payment_token)
     SELECT $1, payment_token FROM paypal_vault WHERE id = 1
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [household],
  );
  return rows.length > 0;
}

export async function latest(household: number): Promise<PurchaseRequest | null> {
  const rows = await query<Row>("SELECT * FROM purchase_requests WHERE household_id = $1 ORDER BY id DESC LIMIT 1", [
    household,
  ]);
  return rows[0] ? toRequest(rows[0]) : null;
}

// The 3 newest asks Sam paid for that came from a search, newest first. Asks that paid for the same
// listings count once, as the newest of them (D102). claim() left only the paid lines in a basket.
export async function boughtBefore(household: number): Promise<PurchaseRequest[]> {
  const rows = await query<Row>(
    `SELECT * FROM (
       SELECT DISTINCT ON (paid) * FROM (
         SELECT *, COALESCE((SELECT string_agg(l->>'id', ',' ORDER BY l->>'id') FROM jsonb_array_elements(lines) l), item_id) AS paid
         FROM purchase_requests
         WHERE household_id = $1 AND status = 'paid' AND (shop IS NOT NULL OR lines IS NOT NULL)
       ) asks
       ORDER BY paid, id DESC
     ) newest
     ORDER BY id DESC LIMIT 3`,
    [household],
  );
  return rows.map(toRequest);
}

export async function paidAsk(household: number, id: number): Promise<PurchaseRequest | null> {
  if (!Number.isSafeInteger(id)) return null;
  const rows = await query<Row>(
    "SELECT * FROM purchase_requests WHERE id = $1 AND household_id = $2 AND status = 'paid'",
    [id, household],
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

// A second ask while one is open hits purchase_requests_one_open_per_household and is dropped.
export async function ask(
  household: number,
  item: Item,
  source?: Source,
  lines?: Line[],
  queries?: PickQuery[],
): Promise<boolean> {
  const rows = await query(
    `INSERT INTO purchase_requests (household_id, item_id, item_name, amount_cents, shop, listing_url, reason, lines, watch, image_url, queries)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      household,
      item.id,
      item.name,
      item.cents,
      source?.shop ?? null,
      source?.url ?? null,
      source?.reason ?? null,
      lines ? JSON.stringify(lines) : null,
      source?.watch ?? null,
      source?.imageUrl ?? null,
      queries ? JSON.stringify(queries) : null,
    ],
  );
  return rows.length === 1;
}

export async function getSearch(household: number): Promise<SavedSearch | null> {
  const rows = await query<{
    words: string;
    outcome: SavedSearch["outcome"];
    listings: Option[];
    groups: Group[];
    from_photo: boolean;
    photos: number;
    blank_photos: number;
    query: string | null;
    tried: boolean;
    by_sam: boolean;
    last: Last | null;
    searched_at: Date;
  }>(
    "SELECT words, outcome, listings, groups, from_photo, photos, blank_photos, query, tried, by_sam, last, searched_at FROM rose_search WHERE id = $1",
    [household],
  );
  const row = rows[0];
  return row
    ? {
        words: row.words,
        outcome: row.outcome,
        options: row.listings,
        groups: row.groups,
        fromPhoto: row.from_photo,
        photos: row.photos,
        blankPhotos: row.blank_photos,
        query: row.query,
        tried: row.tried,
        bySam: row.by_sam,
        last: row.last,
        searchedAt: row.searched_at,
      }
    : null;
}

// photos: how many photos Find read, when words are the AI's words for them (D67). blank: how
// many of them showed nothing to buy (D72). from_photo stays, so the code from before still reads it.
// tried: Find another ran this search, so it offers no second one (D97).
export async function saveSearch(
  household: number,
  words: string,
  result: Search | { outcome: "retry" },
  photos = 0,
  blank = 0,
  tried = false,
  bySam = false,
): Promise<void> {
  await query(
    `INSERT INTO rose_search (id, words, outcome, listings, groups, from_photo, photos, blank_photos, query, tried, last, by_sam)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE
     SET words = EXCLUDED.words, outcome = EXCLUDED.outcome, listings = EXCLUDED.listings, groups = EXCLUDED.groups,
         from_photo = EXCLUDED.from_photo, photos = EXCLUDED.photos, blank_photos = EXCLUDED.blank_photos,
         query = EXCLUDED.query, tried = EXCLUDED.tried, last = EXCLUDED.last, by_sam = EXCLUDED.by_sam, searched_at = now()`,
    [
      household,
      words,
      result.outcome,
      JSON.stringify(("options" in result && result.options) || []),
      JSON.stringify("groups" in result ? result.groups : []),
      photos > 0,
      photos,
      blank,
      ("query" in result && result.query) || null,
      tried,
      "last" in result && result.last ? JSON.stringify(result.last) : null,
      bySam,
    ],
  );
}

export async function clearSearch(household: number): Promise<void> {
  await query("DELETE FROM rose_search WHERE id = $1", [household]);
}

// Takes one of the address's `most` places in the last 24 hours, or none when they're all taken. One upsert
// locks the row and checks the count, so two at once can't both take the last place (D76). Returns null when
// a place was free, or else when the oldest use turns 24 hours old. Addresses idle for a day go first.
export async function takeUse(kind: Use, address: string, most: number): Promise<Date | null> {
  await query("DELETE FROM address_uses WHERE used_at[cardinality(used_at)] <= now() - interval '24 hours'");
  const taken = await query(
    `INSERT INTO address_uses AS u (kind, address, used_at) VALUES ($1, $2, ARRAY[now()])
     ON CONFLICT (kind, address) DO UPDATE
     SET used_at = ARRAY(SELECT t FROM unnest(u.used_at) t WHERE t > now() - interval '24 hours') || now()
     WHERE cardinality(ARRAY(SELECT t FROM unnest(u.used_at) t WHERE t > now() - interval '24 hours')) < $3
     RETURNING kind`,
    [kind, address, most],
  );
  if (taken.length) return null;
  const [{ until }] = await query<{ until: Date }>(
    `SELECT min(t) + interval '24 hours' AS until FROM address_uses, unnest(used_at) t
     WHERE kind = $1 AND address = $2 AND t > now() - interval '24 hours'`,
    [kind, address],
  );
  return until;
}

// Adds to today's UTC row for /status (D80). A count that can't be written only logs, so it never stops a
// Find or a Try KinCart (D81).
export async function countUse(use: Partial<Counts>): Promise<void> {
  const { finds = 0, searches = 0, stoppedFinds = 0, stoppedHouseholds = 0 } = use;
  await query(
    `INSERT INTO usage_days AS u (day, finds, searches, stopped_finds, stopped_households)
     VALUES ((now() AT TIME ZONE 'UTC')::date, $1, $2, $3, $4)
     ON CONFLICT (day) DO UPDATE SET
       finds = u.finds + EXCLUDED.finds,
       searches = u.searches + EXCLUDED.searches,
       stopped_finds = u.stopped_finds + EXCLUDED.stopped_finds,
       stopped_households = u.stopped_households + EXCLUDED.stopped_households`,
    [finds, searches, stoppedFinds, stoppedHouseholds],
  ).catch((error) => console.log(`usage status=failed reason=${reasonOf(error)}`));
}

export async function getLimit(household: number): Promise<number> {
  const rows = await query<{ cents: number }>("SELECT cents FROM price_limit WHERE id = $1", [household]);
  return rows[0]?.cents ?? DEFAULT_LIMIT_CENTS;
}

export async function setLimit(household: number, cents: number): Promise<void> {
  await query(
    `INSERT INTO price_limit (id, cents) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET cents = EXCLUDED.cents, set_at = now()`,
    [household, cents],
  );
}

// No row means no total limit.
export async function getTotal(household: number): Promise<number | null> {
  const rows = await query<{ cents: number }>("SELECT cents FROM total_limit WHERE id = $1", [household]);
  return rows[0]?.cents ?? null;
}

export async function setTotal(household: number, cents: number | null): Promise<void> {
  if (cents === null) {
    await query("DELETE FROM total_limit WHERE id = $1", [household]);
    return;
  }
  await query(
    `INSERT INTO total_limit (id, cents) VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET cents = EXCLUDED.cents, set_at = now()`,
    [household, cents],
  );
}

export async function decline(household: number, id: number): Promise<PurchaseRequest | null> {
  const rows = await query<Row>(
    `UPDATE purchase_requests SET status = 'declined', answered_at = now()
     WHERE id = $1 AND household_id = $2 AND status = 'waiting' RETURNING *`,
    [id, household],
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
export async function claim(household: number, id: number, ticked: string[] = []): Promise<PurchaseRequest | null> {
  const [open] = await query<Pick<Row, "lines">>(
    "SELECT lines FROM purchase_requests WHERE id = $1 AND household_id = $2 AND status = 'waiting'",
    [id, household],
  );
  if (!open) return null;
  const basket = open.lines && keep(open.lines, ticked);
  if (open.lines && !basket) return null;

  const rows = await query<Row>(
    `UPDATE purchase_requests
     SET status = 'paying', answered_at = now(),
         lines = COALESCE($2, lines), left_out = $3, amount_cents = COALESCE($4, amount_cents),
         item_name = COALESCE($5, item_name)
     WHERE id = $1 AND household_id = $6 AND status = 'waiting' RETURNING *`,
    [
      id,
      basket ? JSON.stringify(basket.lines) : null,
      basket?.leftOut.length ? JSON.stringify(basket.leftOut) : null,
      basket?.cents ?? null,
      basket ? things(basket.lines.length) : null,
      household,
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

export async function stuck(household: number): Promise<PurchaseRequest | null> {
  const rows = await query<Row>(
    `SELECT * FROM purchase_requests
     WHERE household_id = $1 AND status = 'paying' AND answered_at < now() - interval '15 seconds'
     ORDER BY id LIMIT 1`,
    [household],
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function saveSubscription(household: number, person: Person, subscription: Subscription): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (household_id, person, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
     SET household_id = EXCLUDED.household_id, person = EXCLUDED.person, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [household, person, subscription.endpoint, subscription.p256dh, subscription.auth],
  );
}

export async function subscriptionsFor(household: number, person: Person): Promise<Subscription[]> {
  return query<Subscription>(
    "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE household_id = $1 AND person = $2 ORDER BY id",
    [household, person],
  );
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
    household: Number(row.household_id),
    item: { id: row.item_id, name: row.item_name, cents: row.amount_cents },
    found:
      row.shop && row.listing_url && row.reason
        ? {
            shop: row.shop,
            url: row.listing_url,
            reason: row.reason,
            ...(row.watch && { watch: row.watch }),
            ...(row.image_url && { imageUrl: row.image_url }),
          }
        : null,
    status: row.status,
    askedAt: row.asked_at,
    answeredAt: row.answered_at,
    orderId: row.paypal_order_id,
    captureId: row.paypal_capture_id,
    failureReason: row.failure_reason,
    lines: row.lines,
    leftOut: row.left_out,
    queries: row.queries,
  };
}
