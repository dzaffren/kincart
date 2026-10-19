import { expect, it } from "vitest";
import { addressOf, keyOf, minutesUntil } from "./limits";

it("counts the first address Vercel forwards", () => {
  expect(addressOf("203.0.113.7")).toBe("203.0.113.7");
  expect(addressOf("203.0.113.7, 10.0.0.2")).toBe("203.0.113.7");
  expect(addressOf("::ffff:203.0.113.7")).toBe("203.0.113.7");
  expect(addressOf(null)).toBe("");
});

it("counts an IPv6 address by its first 64 bits, however it is written", () => {
  const home = addressOf("2001:db8:85a3:12::8a2e:370:7334");
  expect(addressOf("2001:0db8:85a3:0012:0000:0000:0000:0001")).toBe(home);
  expect(addressOf("2001:DB8:85A3:12:ffff::1")).toBe(home);
  expect(addressOf("2001:db8:85a3:13::1")).not.toBe(home);
  expect(addressOf("2001:db8::1")).toBe(addressOf("2001:db8:0:0:1::"));
});

it("never says to wait more than 24 hours, whatever the page address says", () => {
  const now = Date.UTC(2026, 9, 19, 12);
  expect(minutesUntil(now + 3 * 60 * 60_000, now)).toBe(180);
  expect(minutesUntil(Infinity, now)).toBe(24 * 60);
  expect(minutesUntil(Number.MAX_SAFE_INTEGER, now)).toBe(24 * 60);
  expect(minutesUntil(NaN, now)).toBeNaN();
});

it("keeps only an HMAC of the address, which changes with the key", () => {
  const key = keyOf("203.0.113.7", "first-key");
  expect(key).toMatch(/^[0-9a-f]{64}$/);
  expect(key).not.toContain("203");
  expect(keyOf("203.0.113.7", "first-key")).toBe(key);
  expect(keyOf("198.51.100.24", "first-key")).not.toBe(key);
  expect(keyOf("203.0.113.7", "second-key")).not.toBe(key);
  expect(() => keyOf("203.0.113.7", "")).toThrow("no ADDRESS_KEY");
});
