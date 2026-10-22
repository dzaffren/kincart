const API = "https://api-m.sandbox.paypal.com";

type Money = { currency_code: string; value: string };
export type PaypalOrder = {
  purchase_units: {
    items: { name: string; quantity: string; unit_amount: Money }[];
    amount: Money & { breakdown: { item_total: Money } };
  }[];
};

// PayPal's own copy of an order, so a test checks what PayPal kept rather than what KinCart sent.
export async function paypalOrder(id: string): Promise<PaypalOrder> {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const token = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const { access_token } = await token.json();
  const order = await fetch(`${API}/v2/checkout/orders/${id}`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!order.ok) throw new Error(`order ${id}: HTTP ${order.status}`);
  return order.json();
}
