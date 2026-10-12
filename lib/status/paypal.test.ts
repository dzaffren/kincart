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
