import { Client } from "pg";
import type { Item } from "./items";

export type RequestStatus = "waiting" | "paying" | "paid" | "declined" | "failed";

export type PurchaseRequest = {
  id: number;
  item: Item;
  status: RequestStatus;
  askedAt: Date;
  answeredAt: Date | null;
  orderId: string | null;
  captureId: string | null;
  failureReason: string | null;
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
};

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
export async function ask(item: Item): Promise<void> {
  await query(
    `INSERT INTO purchase_requests (item_id, item_name, amount_cents) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [item.id, item.name, item.cents],
  );
}

export async function decline(id: number): Promise<boolean> {
  const rows = await query(
    `UPDATE purchase_requests SET status = 'declined', answered_at = now()
     WHERE id = $1 AND status = 'waiting' RETURNING id`,
    [id],
  );
  return rows.length === 1;
}

export async function claim(id: number): Promise<PurchaseRequest | null> {
  const rows = await query<Row>(
    `UPDATE purchase_requests SET status = 'paying', answered_at = now()
     WHERE id = $1 AND status = 'waiting' RETURNING *`,
    [id],
  );
  return rows[0] ? toRequest(rows[0]) : null;
}

export async function record(id: number, outcome: Outcome): Promise<void> {
  if (outcome.state === "paid") {
    await query(
      `UPDATE purchase_requests SET status = 'paid', paypal_order_id = $2, paypal_capture_id = $3
       WHERE id = $1 AND status = 'paying'`,
      [id, outcome.orderId, outcome.captureId],
    );
  } else {
    await query(
      `UPDATE purchase_requests SET status = 'failed', failure_reason = $2
       WHERE id = $1 AND status = 'paying'`,
      [id, outcome.reason],
    );
  }
}

export async function stuck(): Promise<PurchaseRequest | null> {
  const rows = await query<Row>(
    `SELECT * FROM purchase_requests
     WHERE status = 'paying' AND answered_at < now() - interval '15 seconds'
     ORDER BY id LIMIT 1`,
  );
  return rows[0] ? toRequest(rows[0]) : null;
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
    status: row.status,
    askedAt: row.asked_at,
    answeredAt: row.answered_at,
    orderId: row.paypal_order_id,
    captureId: row.paypal_capture_id,
    failureReason: row.failure_reason,
  };
}
