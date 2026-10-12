export type PaypalResult =
  | { state: "connected" }
  | { state: "not configured" }
  | { state: "keys rejected" }
  | { state: "not reachable"; reason: string };

const TOKEN_URL = "https://api-m.sandbox.paypal.com/v1/oauth2/token";

export async function checkPaypal(
  clientId = process.env.PAYPAL_CLIENT_ID,
  clientSecret = process.env.PAYPAL_CLIENT_SECRET,
): Promise<PaypalResult> {
  if (!clientId || !clientSecret) return { state: "not configured" };

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) return { state: "connected" };
    if (response.status === 401) return { state: "keys rejected" };
    return { state: "not reachable", reason: `HTTP ${response.status}` };
  } catch (error) {
    return { state: "not reachable", reason: error instanceof Error ? error.name : String(error) };
  }
}
