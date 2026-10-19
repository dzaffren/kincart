import { createHmac } from "node:crypto";
import { isIPv6 } from "node:net";

// Each network address gets this many in any 24 hours (find-limits O1).
export const FINDS_A_DAY = 20;
export const HOUSEHOLDS_A_DAY = 5;

export type Use = "find" | "household";

// Vercel writes x-forwarded-for and drops any value the client sent (find-limits O9). One network gets a
// whole IPv6 /64, so an IPv6 address counts by its first 64 bits (D75).
export function addressOf(forwardedFor: string | null): string {
  const first = (forwardedFor ?? "").split(",")[0].trim().toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(first);
  if (mapped) return mapped[1];
  if (!isIPv6(first)) return first;
  const [head, tail] = first.split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const groups = tail === undefined ? front : [...front, ...Array(8 - front.length - back.length).fill("0"), ...back];
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}

// Whole minutes from now until a stopped address's oldest use turns 24 hours old, rounded up. The time comes
// from the page address, so a hand-made one still says 24 hours at most.
export function minutesUntil(until: number, now = Date.now()): number {
  return Math.min(Math.ceil((until - now) / 60_000), 24 * 60);
}

// Only an HMAC of the address reaches the table, so a leaked table holds no addresses (D74).
export function keyOf(address: string, key = process.env.ADDRESS_KEY): string {
  if (!key) throw new Error("no ADDRESS_KEY");
  return createHmac("sha256", key).update(address).digest("hex");
}
