import { NextRequest } from "next/server";
import pg from "pg";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../../../../scripts/migrate.mjs";
import { getVault } from "../../../../../lib/shop/requests";
import { GET } from "./route";

const rose = "rose-link-4f9c2a7e";

function returnFromPaypal(token: string, cookie?: string) {
  const request = new NextRequest(`http://localhost:3000/r/${token}/linked?approval_session_id=4RV72937BH429471C`, {
    headers: cookie ? { cookie } : {},
  });
  return GET(request, { params: Promise.resolve({ token }) });
}

function stubPaymentToken(answer: () => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith("/v1/oauth2/token") ? new Response('{"access_token":"A21AA-sandbox"}') : answer(),
    ),
  );
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DELETE FROM paypal_vault");
  await client.end();
  vi.stubEnv("ROSE_LINK_TOKEN", rose);
  vi.stubEnv("SAM_LINK_TOKEN", "sam-link-b81d5e30");
  vi.stubEnv("PAYPAL_CLIENT_ID", "sandbox-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "sandbox-secret");
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("saves Rose's PayPal from the setup token cookie and sends Rose back", async () => {
  stubPaymentToken(() => new Response('{"id":"1j970427g9944212v"}', { status: 201 }));

  const response = await returnFromPaypal(rose, "setup_token=4RV72937BH429471C");

  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(`http://localhost:3000/r/${rose}`);
  expect(response.headers.get("set-cookie")).toMatch(/^setup_token=; Path=\/r\/rose-link-4f9c2a7e; .*Max-Age=0/);
  expect(await getVault()).toBe("1j970427g9944212v");
});

it("says not linked when PayPal won't turn the setup token into a saved PayPal", async () => {
  stubPaymentToken(() => new Response('{"details":[{"issue":"SETUP_TOKEN_NOT_APPROVED"}]}', { status: 422 }));

  const response = await returnFromPaypal(rose, "setup_token=4RV72937BH429471C");

  expect(response.headers.get("location")).toBe(`http://localhost:3000/r/${rose}?cancelled=1`);
  expect(await getVault()).toBeNull();
});

it("says not linked when the cookie is gone, without calling PayPal", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);

  const response = await returnFromPaypal(rose);

  expect(response.headers.get("location")).toBe(`http://localhost:3000/r/${rose}?cancelled=1`);
  expect(fetch).not.toHaveBeenCalled();
});

it("answers 404 to anyone but Rose", async () => {
  expect((await returnFromPaypal("sam-link-b81d5e30", "setup_token=4RV72937BH429471C")).status).toBe(404);
});
