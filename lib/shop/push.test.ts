import pg from "pg";
import webpush from "web-push";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { notify, parseSubscription } from "./push";
import { saveSubscription, startHousehold, subscriptionsFor } from "./requests";

vi.mock("web-push", () => ({ default: { sendNotification: vi.fn() } }));

const send = vi.mocked(webpush.sendNotification);
const owner = 1;

const keys = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};
const phone = (endpoint: string) => ({ endpoint, ...keys });
const samAndroid = phone("https://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4:APA91bH7");
const samFirefox = phone("https://updates.push.services.mozilla.com/wpush/v2/gAAAAABn3xQ");
const samTablet = phone("https://fcm.googleapis.com/fcm/send/eR2mP7sTnB1:APA91bG4");
const roseIphone = phone("https://web.push.apple.com/QGuQyavXutnMH8Ig");

const asked = {
  title: "Rose would like something",
  body: "Reading glasses, +2.00, $18.99. Tap to see it and say OK or No.",
};

const pushed = { statusCode: 201, body: "", headers: {} };
const refusedWith = (statusCode: number) => Object.assign(new Error("Received unexpected response code"), { statusCode });

beforeAll(async () => {
  await migrate("up");
});

beforeEach(async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(
    "TRUNCATE purchase_requests; DELETE FROM paypal_vault; DELETE FROM rose_search; DELETE FROM price_limit; DELETE FROM total_limit; DELETE FROM push_subscriptions; DELETE FROM households WHERE id <> 1",
  );
  await client.end();
  vi.stubEnv("VAPID_PUBLIC_KEY", "vapid-test-public-key");
  vi.stubEnv("VAPID_PRIVATE_KEY", "vapid-test-private-key");
  vi.stubEnv("VAPID_SUBJECT", "https://kincart.vercel.app");
  vi.spyOn(console, "log").mockImplementation(() => {});
  send.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("sends one encrypted push to each of Sam's phones and none to Rose's", async () => {
  await saveSubscription(owner, "sam", samAndroid);
  await saveSubscription(owner, "sam", samFirefox);
  await saveSubscription(owner, "rose", roseIphone);
  send.mockResolvedValue(pushed);

  await notify(owner, "sam", asked);

  expect(send).toHaveBeenCalledTimes(2);
  expect(send).toHaveBeenCalledWith({ endpoint: samAndroid.endpoint, keys }, JSON.stringify(asked), {
    TTL: 3600,
    urgency: "high",
    timeout: 5000,
    vapidDetails: {
      subject: "https://kincart.vercel.app",
      publicKey: "vapid-test-public-key",
      privateKey: "vapid-test-private-key",
    },
  });
  expect(send.mock.calls.map(([subscription]) => subscription.endpoint)).toEqual([
    samAndroid.endpoint,
    samFirefox.endpoint,
  ]);
  expect(console.log).toHaveBeenCalledWith("push household=1 to=sam phones=2 sent=2 gone=0 failed=0");
});

it("sends only to the phones of the household it's for", async () => {
  const ben = await startHousehold("rose-hash-ben", "sam-hash-ben");
  await saveSubscription(owner, "sam", samAndroid);
  await saveSubscription(ben, "sam", samTablet);
  send.mockResolvedValue(pushed);

  await notify(ben, "sam", asked);

  expect(send.mock.calls.map(([subscription]) => subscription.endpoint)).toEqual([samTablet.endpoint]);
  expect(console.log).toHaveBeenCalledWith(`push household=${ben} to=sam phones=1 sent=1 gone=0 failed=0`);
});

it("forgets a phone its push service says is gone, keeps one that failed, and still sends to the rest", async () => {
  await saveSubscription(owner, "sam", samAndroid);
  await saveSubscription(owner, "sam", samFirefox);
  await saveSubscription(owner, "sam", samTablet);
  send.mockImplementation(async ({ endpoint }) => {
    if (endpoint === samAndroid.endpoint) throw refusedWith(410);
    if (endpoint === samFirefox.endpoint) throw refusedWith(500);
    return pushed;
  });

  await expect(notify(owner, "sam", asked)).resolves.toBeUndefined();

  expect(send).toHaveBeenCalledTimes(3);
  expect(await subscriptionsFor(owner, "sam")).toEqual([samFirefox, samTablet]);
  expect(console.log).toHaveBeenCalledWith("push to=sam host=updates.push.services.mozilla.com status=failed reason=500");
  expect(console.log).toHaveBeenCalledWith("push household=1 to=sam phones=3 sent=1 gone=1 failed=1");
});

it("forgets a phone on a 404 too", async () => {
  await saveSubscription(owner, "rose", roseIphone);
  send.mockRejectedValue(refusedWith(404));

  await notify(owner, "rose", asked);

  expect(await subscriptionsFor(owner, "rose")).toEqual([]);
  expect(console.log).toHaveBeenCalledWith("push household=1 to=rose phones=1 sent=0 gone=1 failed=0");
});

it("sends and reads nothing unless all three VAPID variables are set", async () => {
  await saveSubscription(owner, "sam", samAndroid);

  for (const name of ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]) {
    const value = process.env[name];
    vi.stubEnv(name, "");
    await notify(owner, "sam", asked);
    vi.stubEnv(name, value);
  }

  expect(send).not.toHaveBeenCalled();
  expect(console.log).not.toHaveBeenCalled();
});

it("never throws, even when the database can't be reached", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://postgres@127.0.0.1:1/none");

  await expect(notify(owner, "sam", asked)).resolves.toBeUndefined();

  expect(send).not.toHaveBeenCalled();
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^push household=1 to=sam status=failed reason=\S+/));
});

it("trusts a subscription only from a known push service, over https, with well-formed keys", () => {
  for (const endpoint of [
    samAndroid.endpoint,
    samFirefox.endpoint,
    roseIphone.endpoint,
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB",
  ]) {
    expect(parseSubscription({ endpoint, expirationTime: null, keys })).toEqual({ endpoint, ...keys });
  }

  for (const json of [
    { endpoint: "http://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4", keys },
    { endpoint: "https://attacker.example/fcm.googleapis.com", keys },
    { endpoint: "https://fcm.googleapis.com.attacker.example/send", keys },
    { endpoint: "https://notgoogleapis.com/fcm/send", keys },
    { endpoint: "https://169.254.169.254/latest/meta-data", keys },
    // web-push sends with Node's older URL parser, which ends these hosts at attacker.example.
    { endpoint: "https://attacker.example{.fcm.googleapis.com/send", keys },
    { endpoint: "https://attacker.example%2e.fcm.googleapis.com/send", keys },
    { endpoint: "https://fcm.googleapis.com:8443/fcm/send/dX9k2Lq0wE4", keys },
    { endpoint: "not a url", keys },
    { endpoint: samAndroid.endpoint, keys: { p256dh: "not base64url!", auth: keys.auth } },
    { endpoint: samAndroid.endpoint, keys: { p256dh: keys.p256dh, auth: "" } },
    { endpoint: samAndroid.endpoint, keys: { p256dh: keys.p256dh } },
    { endpoint: samAndroid.endpoint },
    { keys },
    null,
    "https://fcm.googleapis.com/fcm/send/dX9k2Lq0wE4",
  ]) {
    expect(parseSubscription(json)).toBeNull();
  }
});
