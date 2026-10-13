import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { charge, createPaymentToken, createSetupToken } from "./paypal";

const glasses = { id: "glasses", name: "Reading glasses, +2.00", cents: 1899 };

type Call = [string, RequestInit];

function stubPaypal(answer: () => Response | Promise<Response>) {
  const fetch = vi.fn(async (url: string) => {
    if (url.endsWith("/v1/oauth2/token")) return new Response('{"access_token":"A21AA-sandbox"}');
    return answer();
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function apiCall(fetch: ReturnType<typeof stubPaypal>): Call {
  return fetch.mock.calls.find(([url]) => !String(url).endsWith("/v1/oauth2/token")) as unknown as Call;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv("PAYPAL_CLIENT_ID", "sandbox-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "sandbox-secret");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("creates a setup token and hands back its approve link", async () => {
  const fetch = stubPaypal(() =>
    json({
      id: "4RV72937BH429471C",
      status: "PAYER_ACTION_REQUIRED",
      links: [
        { rel: "self", href: "https://api.sandbox.paypal.com/v3/vault/setup-tokens/4RV72937BH429471C" },
        { rel: "approve", href: "https://www.sandbox.paypal.com/agreements/approve?approval_session_id=4RV72937BH429471C" },
      ],
    }),
  );

  expect(await createSetupToken("https://kincart.vercel.app/r/abc/linked", "https://kincart.vercel.app/r/abc?cancelled=1")).toEqual({
    id: "4RV72937BH429471C",
    approveUrl: "https://www.sandbox.paypal.com/agreements/approve?approval_session_id=4RV72937BH429471C",
  });

  const [url, init] = apiCall(fetch);
  expect(url).toBe("https://api-m.sandbox.paypal.com/v3/vault/setup-tokens");
  expect((init.headers as Record<string, string>).Authorization).toBe("Bearer A21AA-sandbox");
  const context = JSON.parse(String(init.body)).payment_source.paypal.experience_context;
  expect(context.return_url).toBe("https://kincart.vercel.app/r/abc/linked");
  expect(context.cancel_url).toBe("https://kincart.vercel.app/r/abc?cancelled=1");
});

it("turns an approved setup token into a vault id", async () => {
  const fetch = stubPaypal(() => json({ id: "1j970427g9944212v", customer: { id: "yyxuSVyPfI" } }));

  expect(await createPaymentToken("4RV72937BH429471C")).toBe("1j970427g9944212v");

  const [url, init] = apiCall(fetch);
  expect(url).toBe("https://api-m.sandbox.paypal.com/v3/vault/payment-tokens");
  expect(JSON.parse(String(init.body))).toEqual({
    payment_source: { token: { id: "4RV72937BH429471C", type: "SETUP_TOKEN" } },
  });
});

it("throws when PayPal won't make the vault id, so the caller can show 'not linked'", async () => {
  stubPaypal(() => json({ name: "UNPROCESSABLE_ENTITY", details: [{ issue: "SETUP_TOKEN_NOT_APPROVED" }] }, 422));

  await expect(createPaymentToken("4RV72937BH429471C")).rejects.toThrow("SETUP_TOKEN_NOT_APPROVED");
});

it("charges the saved PayPal once per request id and reports the capture", async () => {
  const fetch = stubPaypal(() =>
    json(
      {
        id: "3BP30887MC6972056",
        status: "COMPLETED",
        purchase_units: [{ payments: { captures: [{ id: "7BM91101S1572292D", status: "COMPLETED" }] } }],
      },
      201,
    ),
  );

  expect(await charge("1j970427g9944212v", glasses, 12)).toEqual({
    state: "paid",
    orderId: "3BP30887MC6972056",
    captureId: "7BM91101S1572292D",
  });

  const [url, init] = apiCall(fetch);
  expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
  expect((init.headers as Record<string, string>)["PayPal-Request-Id"]).toBe("purchase-12");
  const body = JSON.parse(String(init.body));
  expect(body.intent).toBe("CAPTURE");
  expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "18.99" });
  expect(body.payment_source).toEqual({ paypal: { vault_id: "1j970427g9944212v" } });
});

it("reports refused when PayPal says no, with PayPal's reason", async () => {
  stubPaypal(() => json({ name: "NOT_AUTHORIZED", details: [{ issue: "PERMISSION_DENIED" }] }, 403));

  expect(await charge("e2e-not-a-real-token", glasses, 13)).toEqual({ state: "refused", reason: "PERMISSION_DENIED" });
});

it("reports refused when the order comes back with a declined capture", async () => {
  stubPaypal(() =>
    json(
      {
        id: "5KD18823TL0094410",
        status: "COMPLETED",
        purchase_units: [{ payments: { captures: [{ id: "0FX27706EE2380221", status: "DECLINED" }] } }],
      },
      201,
    ),
  );

  expect(await charge("1j970427g9944212v", glasses, 14)).toEqual({ state: "refused", reason: "capture DECLINED" });
});

it("reports unknown when PayPal fails or doesn't answer, since the money may have moved", async () => {
  stubPaypal(() => new Response("", { status: 500 }));
  expect(await charge("1j970427g9944212v", glasses, 15)).toEqual({ state: "unknown", reason: "HTTP 500" });

  stubPaypal(() => {
    throw new DOMException("The operation timed out.", "TimeoutError");
  });
  expect(await charge("1j970427g9944212v", glasses, 15)).toEqual({ state: "unknown", reason: "TimeoutError" });
});

it("reports refused when the keys are rejected, since no order was sent", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"invalid_client"}', { status: 401 })));

  expect(await charge("1j970427g9944212v", glasses, 16)).toEqual({ state: "refused", reason: "token HTTP 401" });
});
