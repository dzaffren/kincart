import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../../../../scripts/migrate.mjs";
import { POST } from "./route";

const rose = "rose-link-4f9c2a7e";

function linkFromPhone(token: string) {
  const request = new NextRequest(`http://localhost:3000/r/${token}/link`, { method: "POST" });
  return POST(request, { params: Promise.resolve({ token }) });
}

function stubSetupToken(answer: () => Response) {
  const fetch = vi.fn(async (url: string) =>
    url.endsWith("/v1/oauth2/token") ? new Response('{"access_token":"A21AA-sandbox"}') : answer(),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeAll(async () => {
  await migrate("up");
});

beforeEach(() => {
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

it("sends the new tab to PayPal with a GET, keeping the setup token in Rose's cookie", async () => {
  const approve = "https://www.sandbox.paypal.com/agreements/approve?approval_session_id=4RV72937BH429471C";
  const fetch = stubSetupToken(
    () =>
      new Response(
        JSON.stringify({ id: "4RV72937BH429471C", links: [{ rel: "approve", href: approve }] }),
        { status: 201 },
      ),
  );

  const response = await linkFromPhone(rose);

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(approve);
  expect(response.headers.get("set-cookie")).toMatch(
    /^setup_token=4RV72937BH429471C; Path=\/r\/rose-link-4f9c2a7e; .*Max-Age=3600; Secure; HttpOnly; SameSite=lax$/,
  );
  const calls = fetch.mock.calls as unknown as [string, RequestInit][];
  const [, init] = calls.find(([url]) => url.endsWith("/v3/vault/setup-tokens"))!;
  const { experience_context } = JSON.parse(String(init.body)).payment_source.paypal;
  expect(experience_context.return_url).toBe(`http://localhost:3000/r/${rose}/linked`);
  expect(experience_context.cancel_url).toBe(`http://localhost:3000/r/${rose}?cancelled=1`);
});

it("sends the new tab back to Rose's page, not linked, when PayPal won't start", async () => {
  stubSetupToken(() => new Response('{"name":"INTERNAL_SERVER_ERROR"}', { status: 500 }));

  const response = await linkFromPhone(rose);

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`http://localhost:3000/r/${rose}?cancelled=1`);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(console.log).toHaveBeenCalledWith("paypal link status=failed reason=INTERNAL_SERVER_ERROR");
});

it("answers 404 to anyone but Rose, without calling PayPal", async () => {
  const fetch = stubSetupToken(() => new Response("{}"));

  expect((await linkFromPhone("sam-link-b81d5e30")).status).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
