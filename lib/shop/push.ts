import webpush from "web-push";
import type { Person } from "./people";
import { reasonOf } from "./paypal";
import { forgetSubscription, subscriptionsFor, type Subscription } from "./requests";

export type Ping = { title: string; body: string };

// Our server POSTs to whatever endpoint a link holder saves, so only these push services are trusted.
// Matched on the raw string, host in plain letters, digits, dots and hyphens: web-push sends with Node's
// older URL parser, which reads a host like "attacker.example{.fcm.googleapis.com" as attacker.example.
const PUSH_SERVICE =
  /^https:\/\/([a-z0-9-]+\.)*(googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//;
const BASE64URL = /^[A-Za-z0-9_-]+=*$/;

export function pushOn(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export function publicKey(): string {
  return process.env.VAPID_PUBLIC_KEY ?? "";
}

export function parseSubscription(json: unknown): Subscription | null {
  const { endpoint, keys } = (json ?? {}) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const { p256dh, auth } = keys ?? {};
  if (typeof endpoint !== "string" || !PUSH_SERVICE.test(endpoint)) return null;
  if (typeof p256dh !== "string" || !BASE64URL.test(p256dh)) return null;
  if (typeof auth !== "string" || !BASE64URL.test(auth)) return null;
  return { endpoint, p256dh, auth };
}

export async function notify(person: Person, ping: Ping): Promise<void> {
  if (!pushOn()) return;
  try {
    const phones = await subscriptionsFor(person);
    const results = await Promise.all(phones.map((phone) => send(phone, ping)));
    const count = (result: Sent) => results.filter((each) => each === result).length;
    console.log(
      `push to=${person} phones=${phones.length} sent=${count("sent")} gone=${count("gone")} failed=${count("failed")}`,
    );
  } catch (error) {
    console.log(`push to=${person} status=failed reason=${reasonOf(error)}`);
  }
}

type Sent = "sent" | "gone" | "failed";

async function send(phone: Subscription, { title, body }: Ping): Promise<Sent> {
  try {
    await webpush.sendNotification(
      { endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } },
      JSON.stringify({ title, body }),
      {
        TTL: 3600,
        urgency: "high",
        timeout: 5000,
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT ?? "",
          publicKey: publicKey(),
          privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
        },
      },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status !== 404 && status !== 410) return "failed";
    await forgetSubscription(phone.endpoint);
    return "gone";
  }
}
