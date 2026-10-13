import { expect, it } from "vitest";
import { ITEMS } from "../../lib/shop/items";
import type { PurchaseRequest, RequestStatus, SavedSearch } from "../../lib/shop/requests";
import { notifyState, roseState, samState, type NotifyEnv } from "./state";

const [glasses, pills, batteries] = ITEMS;
const askedAt = new Date("2026-10-20T10:15:00Z");
const answeredAt = new Date("2026-10-20T10:16:00Z");

function request(status: RequestStatus, item = glasses): PurchaseRequest {
  return {
    id: 12,
    item,
    found: null,
    status,
    askedAt,
    answeredAt: status === "waiting" ? null : answeredAt,
    orderId: status === "paid" ? "3BP30887MC6972056" : null,
    captureId: status === "paid" ? "7BM91101S1572292D" : null,
    failureReason: status === "failed" ? "PERMISSION_DENIED" : null,
  };
}

const vault = "1j970427g9944212v";
const receipt = { item: glasses, paidAt: answeredAt, transactionId: "7BM91101S1572292D" };

it("asks Rose to link PayPal until it's saved, and says so after a cancel", () => {
  expect(roseState(null, null, {})).toEqual({ kind: "not linked", cancelled: false });
  expect(roseState(null, null, { cancelled: true })).toEqual({ kind: "not linked", cancelled: true });
});

it("shows Rose the items once linked, with the error after an empty ask", () => {
  expect(roseState(vault, null, {})).toEqual({ kind: "pick", error: false });
  expect(roseState(vault, null, { pickMissing: true })).toEqual({ kind: "pick", error: true });
});

it("shows Rose a waiting request, including while it's being paid", () => {
  expect(roseState(vault, request("waiting"), {})).toEqual({ kind: "waiting", item: glasses, askedAt });
  expect(roseState(vault, request("paying"), {})).toEqual({ kind: "waiting", item: glasses, askedAt });
});

it("shows Rose the receipt until Rose asks for something else", () => {
  expect(roseState(vault, request("paid"), {})).toEqual({ kind: "paid", receipt });
  expect(roseState(vault, request("paid"), { askAgain: true })).toEqual({ kind: "pick", error: false });
  expect(roseState(vault, request("paid"), { pickMissing: true })).toEqual({ kind: "pick", error: true });
});

it("shows Rose the items under Sam's no or a failed payment", () => {
  expect(roseState(vault, request("declined", batteries), {})).toEqual({
    kind: "pick",
    error: false,
    outcome: { kind: "declined", item: batteries },
  });
  expect(roseState(vault, request("failed", pills), {})).toEqual({
    kind: "pick",
    error: false,
    outcome: { kind: "failed", item: pills },
  });
});

it("shows Sam nothing, a request, the payment in progress, or the outcome", () => {
  expect(samState(null)).toEqual({ kind: "nothing" });
  expect(samState(request("waiting"))).toEqual({ kind: "request", item: glasses, askedAt, busy: false });
  expect(samState(request("paying"))).toEqual({ kind: "request", item: glasses, askedAt, busy: true });
  expect(samState(request("paid"))).toEqual({ kind: "paid", receipt });
  expect(samState(request("failed", pills))).toEqual({ kind: "failed", item: pills });
  expect(samState(request("declined", batteries))).toEqual({ kind: "nothing", declined: batteries });
});

const strap = {
  id: "prod_9Wz4hY",
  name: "Adjustable Wide Slippers with Hook-and-Loop Strap",
  cents: 3250,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B0C7WIDE21",
  what: "Wide slippers that open across the top and close with a strap.",
  why: "You open them right up to put them on, then press the strap shut.",
  watch: "They're a wide fit, so they may feel loose on a narrow foot.",
};
const words = "warm slippers that are easy to put on, size 8";
const searchedAt = new Date("2026-10-20T10:20:00Z");
const saved = (outcome: SavedSearch["outcome"], options = outcome === "options" ? [strap] : []): SavedSearch => ({
  words,
  outcome,
  options,
  searchedAt,
});
const on = (search: SavedSearch | null = null, limitCents = 5000) => ({ saved: search, limitCents });

it("shows Rose the request box with Sam's limit once search is on, and the error after an empty Find", () => {
  expect(roseState(vault, null, {}, on())).toEqual({ kind: "ask", limitCents: 5000 });
  expect(roseState(vault, null, { emptyFind: true }, on(null, 3000))).toEqual({
    kind: "ask",
    limitCents: 3000,
    problem: "empty",
  });
});

it("shows Rose the current search's options, with the error after Ask Sam without a pick", () => {
  expect(roseState(vault, null, {}, on(saved("options")))).toEqual({
    kind: "options",
    limitCents: 5000,
    words,
    listings: [strap],
    error: false,
  });
  expect(roseState(vault, null, { pickMissing: true }, on(saved("options")))).toMatchObject({ error: true });
});

it("keeps Rose's words in the box when a search found nothing, too much, a list, or Rose tries again", () => {
  expect(roseState(vault, null, {}, on(saved("nothing found")))).toEqual({
    kind: "ask",
    limitCents: 5000,
    words,
    problem: "nothing found",
  });
  expect(roseState(vault, null, {}, on(saved("over limit")))).toMatchObject({ problem: "over limit", words });
  expect(roseState(vault, null, {}, on(saved("several")))).toMatchObject({ problem: "several", words });
  expect(roseState(vault, null, {}, on(saved("retry")))).toEqual({ kind: "ask", limitCents: 5000, words });
});

it("shows a search newer than the paid request instead of the receipt, and not an older one", () => {
  const paid = request("paid");
  expect(roseState(vault, paid, {}, on(saved("options")))).toMatchObject({ kind: "options" });
  expect(roseState(vault, paid, {}, on({ ...saved("options"), searchedAt: new Date("2026-10-20T10:00:00Z") }))).toEqual({
    kind: "paid",
    receipt,
  });
  expect(roseState(vault, paid, { askAgain: true }, on())).toEqual({ kind: "ask", limitCents: 5000 });
});

it("shows Rose the box under Sam's no, and the shop while waiting", () => {
  expect(roseState(vault, request("declined", batteries), {}, on())).toEqual({
    kind: "ask",
    limitCents: 5000,
    outcome: { kind: "declined", item: batteries },
  });
  const waiting = { ...request("waiting", strap), found: { shop: strap.shop, url: strap.url, reason: strap.why } };
  expect(roseState(vault, waiting, {}, on())).toEqual({
    kind: "waiting",
    item: strap,
    askedAt,
    shop: "amazon.com",
  });
});

it("shows Sam where a found item comes from and why it fits", () => {
  const found = { shop: strap.shop, url: strap.url, reason: strap.why };
  expect(samState({ ...request("waiting", strap), found })).toEqual({
    kind: "request",
    item: strap,
    askedAt,
    busy: false,
    found,
  });
});

const android: NotifyEnv = {
  hasServiceWorker: true,
  hasPushManager: true,
  isIPhone: false,
  standalone: false,
  permission: "default",
  subscribed: false,
};

it("offers notifications on a phone that can take them, and says when they're on or blocked", () => {
  expect(notifyState(android)).toEqual({ kind: "off" });
  expect(notifyState({ ...android, permission: "granted", subscribed: true })).toEqual({ kind: "on" });
  expect(notifyState({ ...android, permission: "denied" })).toEqual({ kind: "blocked" });
});

it("offers them again when the phone holds no subscription, even with permission still granted", () => {
  expect(notifyState({ ...android, permission: "granted" })).toEqual({ kind: "off" });
});

it("sends an iPhone in Safari to the Home Screen first, and turns them on from there", () => {
  const safari: NotifyEnv = { ...android, hasPushManager: false, isIPhone: true };
  expect(notifyState(safari)).toEqual({ kind: "home screen first" });

  const homeScreen: NotifyEnv = { ...safari, hasPushManager: true, standalone: true };
  expect(notifyState(homeScreen)).toEqual({ kind: "off" });
  expect(notifyState({ ...homeScreen, permission: "granted", subscribed: true })).toEqual({ kind: "on" });
});

it("says a browser without web push can't show them, including iOS 15 from the Home Screen", () => {
  expect(notifyState({ ...android, isIPhone: true, standalone: true, hasPushManager: false })).toEqual({
    kind: "not supported",
  });
  expect(notifyState({ ...android, hasServiceWorker: false, hasPushManager: false })).toEqual({ kind: "not supported" });
  expect(notifyState({ ...android, hasPushManager: false })).toEqual({ kind: "not supported" });
});
