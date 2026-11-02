import { expect, test, type Page, type Request } from "@playwright/test";
import { listing, reset, searchFor } from "./db";

const savedPaypal = process.env.PAYPAL_E2E_VAULT_ID ?? "";

const heading = (page: Page) => page.getByRole("heading", { level: 1 });

// Chrome's DevTools give a page a fake passkey device that matches a face or fingerprint at once.
async function passkeyDevice(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

// The server action call that carries the phone's signed answer, as the page sent it.
const signedAnswer = (request: Request) =>
  request.method() === "POST" && !!request.headers()["next-action"] && !!request.postData()?.includes("authenticatorData");

test("a Make new links answer sent again changes nothing, and Sam's own OK still pays", async ({ page, context }) => {
  // One real sandbox payment.
  test.setTimeout(90_000);
  expect(savedPaypal, "set PAYPAL_E2E_VAULT_ID").toBeTruthy();
  await reset(savedPaypal);

  await page.goto("/");
  await page.getByRole("button", { name: "Try KinCart" }).click();
  await expect(page.getByText("Your Rose and Sam are ready.")).toBeVisible();
  const samLink = (await page.getByRole("link", { name: "Be Sam" }).getAttribute("href"))!;

  const sam = await context.newPage();
  await passkeyDevice(sam);
  await sam.goto(samLink);
  await sam.getByRole("button", { name: "Turn on" }).click();
  await expect(sam.getByText("Turned on. Your next OK asks for your face or fingerprint.")).toBeVisible();

  // Make new links with Sam's face. The page then moves to Sam's new link, and the passkey stays on.
  await sam.getByRole("button", { name: "Make new links" }).click();
  const sent = sam.waitForRequest(signedAnswer);
  await sam.getByRole("button", { name: "Make new links" }).click();
  const made = await sent;
  await expect(sam.getByText("New links made.", { exact: false })).toBeVisible();
  const newSam = new URL(sam.url()).pathname;
  expect(newSam).not.toBe(samLink);
  const newRose = new URL((await sam.getByText(/\/r\//).textContent())!).pathname;

  // Someone with Sam's new link and that one answer sends it again, with the challenge it signed as the cookie.
  const body = made.postData()!.replaceAll(samLink.slice("/h/".length), newSam.slice("/h/".length));
  const answer = /"clientDataJSON":"([^"]+)"/.exec(body)![1];
  const { challenge } = JSON.parse(Buffer.from(answer, "base64url").toString());
  const { hostname, origin } = new URL(made.url());
  await context.addCookies([{ name: "passkey_challenge", value: challenge, domain: hostname, path: newSam }]);
  await sam.request.post(`${origin}${newSam}`, {
    headers: { "next-action": made.headers()["next-action"], "content-type": made.headers()["content-type"], accept: "text/x-component" },
    data: body,
    maxRedirects: 0,
  });
  expect((await sam.request.get(newSam)).status()).toBe(200);
  await sam.reload();
  await expect(sam.getByRole("button", { name: "Turn off" })).toBeVisible();

  const rose = await context.newPage();
  await rose.goto(newRose);
  await rose.getByRole("button", { name: "Skip: use the demo PayPal" }).click();
  await expect(heading(rose)).toHaveText("What do you need?");
  await searchFor("AA batteries", listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 1299, "amazon.com"));
  await rose.reload();
  await rose.getByRole("radio").first().check();
  await rose.getByRole("button", { name: "Ask Sam" }).click();
  await expect(heading(rose)).toHaveText("Waiting for Sam");

  await sam.reload();
  await sam.getByRole("button", { name: "OK, pay $12.99" }).click();
  await expect(heading(sam)).toHaveText("Paid from Rose's PayPal", { timeout: 20_000 });
  await expect(heading(rose)).toHaveText("Sam said OK. It's paid.", { timeout: 10_000 });
});
