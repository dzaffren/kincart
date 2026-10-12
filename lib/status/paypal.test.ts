import { afterEach, expect, it, vi } from "vitest";
import { checkPaypal } from "./paypal";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("asks the sandbox for a token with Basic auth and reports connected on 200", async () => {
  const fetch = vi.fn(async () => new Response('{"access_token":"A21AA"}', { status: 200 }));
  vi.stubGlobal("fetch", fetch);

  expect(await checkPaypal("sandbox-client-id", "sandbox-secret")).toEqual({ state: "connected" });

  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
  expect(init.method).toBe("POST");
  expect(init.body).toBe("grant_type=client_credentials");
  const expected = `Basic ${Buffer.from("sandbox-client-id:sandbox-secret").toString("base64")}`;
  expect((init.headers as Record<string, string>).Authorization).toBe(expected);
});

it("says not configured when the client ID or secret is missing", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);

  expect(await checkPaypal("", "sandbox-secret")).toEqual({ state: "not configured" });
  expect(await checkPaypal("sandbox-client-id", "")).toEqual({ state: "not configured" });
  expect(fetch).not.toHaveBeenCalled();
});

it("says keys rejected when PayPal answers 401", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"invalid_client"}', { status: 401 })));

  expect(await checkPaypal("sandbox-client-id", "wrong-secret")).toEqual({ state: "keys rejected" });
});

it("says not reachable when PayPal answers 500", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

  expect(await checkPaypal("sandbox-client-id", "sandbox-secret")).toEqual({
    state: "not reachable",
    reason: "HTTP 500",
  });
});

it("says not reachable when the token request times out", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    }),
  );

  expect(await checkPaypal("sandbox-client-id", "sandbox-secret")).toEqual({
    state: "not reachable",
    reason: "TimeoutError",
  });
});
