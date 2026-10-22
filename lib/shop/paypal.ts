import type { Item } from "./items";

export type ChargeResult =
  | { state: "paid"; orderId: string; captureId: string }
  | { state: "refused"; reason: string }
  | { state: "unknown"; reason: string };

export type DemoLogin = { email: string; password: string };

const API = "https://api-m.sandbox.paypal.com";

// The sandbox buyer that Rose's link screen shows to judges (D59, D62).
export function demoLogin(): DemoLogin | undefined {
  const email = process.env.PAYPAL_DEMO_EMAIL;
  const password = process.env.PAYPAL_DEMO_PASSWORD;
  return email && password ? { email, password } : undefined;
}

export async function createSetupToken(returnUrl: string, cancelUrl: string): Promise<{ id: string; approveUrl: string }> {
  const body = await call("/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        description: "KinCart: pay when your helper says OK",
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        experience_context: {
          brand_name: "KinCart",
          shipping_preference: "NO_SHIPPING",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  });
  const approve = body.links?.find((link: { rel: string }) => link.rel === "approve");
  if (!body.id || !approve) throw new Error("setup token has no approve link");
  return { id: body.id, approveUrl: approve.href };
}

export async function createPaymentToken(setupTokenId: string): Promise<string> {
  const body = await call("/v3/vault/payment-tokens", {
    payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } },
  });
  if (!body.id) throw new Error("payment token has no id");
  return body.id;
}

// lines are a basket's ticked things, or the item itself. The amount is their sum, so PayPal's
// item total always matches it (D86). PayPal cuts a name past 127 characters itself (D87).
export async function charge(vaultId: string, item: Item, requestKey: string, lines: Item[] = [item]): Promise<ChargeResult> {
  const cents = lines.reduce((sum, line) => sum + line.cents, 0);
  let token: string;
  try {
    token = await accessToken();
  } catch (error) {
    return { state: "refused", reason: `token ${reasonOf(error)}` };
  }

  let response: Response;
  try {
    response = await fetch(`${API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestKey,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: item.name,
            items: lines.map((line) => ({ name: line.name, quantity: "1", unit_amount: usd(line.cents) })),
            amount: { ...usd(cents), breakdown: { item_total: usd(cents) } },
          },
        ],
        payment_source: { paypal: { vault_id: vaultId } },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return { state: "unknown", reason: reasonOf(error) };
  }

  if (response.status >= 500) return { state: "unknown", reason: `HTTP ${response.status}` };
  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (response.ok) return { state: "unknown", reason: reasonOf(error) };
    body = {};
  }
  if (!response.ok) return { state: "refused", reason: issueOf(body) ?? `HTTP ${response.status}` };

  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];
  if (capture?.status !== "COMPLETED") return { state: "refused", reason: `capture ${capture?.status ?? "missing"}` };
  return { state: "paid", orderId: body.id, captureId: capture.id };
}

async function call(path: string, payload: unknown) {
  const token = await accessToken();
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(issueOf(body) ?? `HTTP ${response.status}`);
  return body;
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("not configured");
  const response = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).access_token;
}

function usd(cents: number) {
  return { currency_code: "USD", value: (cents / 100).toFixed(2) };
}

function issueOf(body: { name?: string; details?: { issue?: string }[] }): string | undefined {
  return body.details?.[0]?.issue ?? body.name;
}

export function reasonOf(error: unknown): string {
  return error instanceof Error ? (error.name === "Error" ? error.message : error.name) : String(error);
}
