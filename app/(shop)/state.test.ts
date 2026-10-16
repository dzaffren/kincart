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
    household: 1,
    item,
    found: null,
    status,
    askedAt,
    answeredAt: status === "waiting" ? null : answeredAt,
    orderId: status === "paid" ? "3BP30887MC6972056" : null,
    captureId: status === "paid" ? "7BM91101S1572292D" : null,
    failureReason: status === "failed" ? "PERMISSION_DENIED" : null,
    lines: null,
    leftOut: null,
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
  groups: [],
  fromPhoto: false,
  photos: 0,
  blankPhotos: 0,
  searchedAt,
});
const on = (search: SavedSearch | null = null, limitCents = 5000, totalCents: number | null = null) => ({
  saved: search,
  limitCents,
  totalCents,
});

it("shows Rose the request box with Sam's limit once search is on, and the error after an empty Find", () => {
  expect(roseState(vault, null, {}, on())).toEqual({ kind: "ask", limitCents: 5000 });
  expect(roseState(vault, null, { emptyFind: true }, on(null, 3000))).toEqual({
    kind: "ask",
    limitCents: 3000,
    problem: "empty",
  });
});

it("tells Rose once that PayPal is linked, on the return from PayPal", () => {
  expect(roseState(vault, null, { linked: true }, on())).toEqual({ kind: "ask", linked: true, limitCents: 5000 });
  expect(roseState(vault, null, {}, on())).not.toHaveProperty("linked", true);
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

it("names Sam's total limit on Rose's box, options and groups once Sam sets one", () => {
  const groups = [{ thing: "AA batteries", options: [strap] }];

  expect(roseState(vault, null, {}, on(null, 5000, 4000))).toEqual({ kind: "ask", limitCents: 5000, totalCents: 4000 });
  expect(roseState(vault, null, {}, on(saved("options"), 5000, 4000))).toMatchObject({
    kind: "options",
    totalCents: 4000,
  });
  expect(roseState(vault, null, {}, on({ ...saved("basket"), groups }, 5000, 4000))).toMatchObject({
    kind: "basket",
    totalCents: 4000,
  });
  expect(roseState(vault, null, {}, on(null, 5000, null))).toEqual({ kind: "ask", limitCents: 5000 });
});

it("keeps Rose's picks and names their sum after Ask Sam went over the total limit", () => {
  const charger = { ...strap, id: "prod_7Bk2wC", cents: 2499 };
  const lamp = { ...strap, id: "prod_5Lp8dK", cents: 4499 };
  const groups = [
    { thing: "AA batteries", options: [{ ...strap, id: "prod_3Ba7aA", cents: 999 }] },
    { thing: "a night light", options: [{ ...strap, id: "prod_6Nl2tL", cents: 1249 }] },
    { thing: "a phone charger", options: [charger] },
  ];
  const basket = on({ ...saved("basket"), groups }, 5000, 4000);
  const over = ["prod_3Ba7aA", "prod_6Nl2tL", "prod_7Bk2wC"];

  expect(roseState(vault, null, { over }, basket)).toMatchObject({ kind: "basket", picked: over, overCents: 4747 });
  expect(roseState(vault, null, { over: [...over, "prod_madeUp1"] }, basket)).toMatchObject({
    picked: over,
    overCents: 4747,
  });
  expect(roseState(vault, null, { over: ["prod_3Ba7aA", "", "prod_7Bk2wC"] }, on({ ...saved("basket"), groups }, 5000, 3000))).toMatchObject({
    picked: ["prod_3Ba7aA", "", "prod_7Bk2wC"],
    overCents: 3498,
  });
  const shared = [groups[0], { thing: "batteries for the remote", options: groups[0].options }, groups[2]];
  expect(
    roseState(vault, null, { over: ["prod_3Ba7aA", "prod_3Ba7aA", "prod_7Bk2wC"] }, on({ ...saved("basket"), groups: shared }, 5000, 3000)),
  ).toMatchObject({ picked: ["prod_3Ba7aA", "prod_3Ba7aA", "prod_7Bk2wC"], overCents: 3498 });
  expect(roseState(vault, null, { over }, on({ ...saved("basket"), groups }, 5000, 5000))).toEqual(
    roseState(vault, null, {}, on({ ...saved("basket"), groups }, 5000, 5000)),
  );
  expect(roseState(vault, null, { over: ["prod_5Lp8dK"] }, on({ ...saved("options"), options: [strap, lamp] }, 5000, 4000))).toMatchObject({
    kind: "options",
    picked: "prod_5Lp8dK",
    overCents: 4499,
  });
});

it("keeps Rose's words in the box when a search found nothing, too much, too many things, or Rose tries again", () => {
  expect(roseState(vault, null, {}, on(saved("nothing found")))).toEqual({
    kind: "ask",
    limitCents: 5000,
    words,
    problem: "nothing found",
  });
  expect(roseState(vault, null, {}, on(saved("over limit")))).toMatchObject({ problem: "over limit", words });
  expect(roseState(vault, null, {}, on(saved("too many")))).toMatchObject({ problem: "too many", words });
  expect(roseState(vault, null, {}, on(saved("retry")))).toEqual({ kind: "ask", limitCents: 5000, words });
});

it("marks options and groups found from Rose's photo, and only those", () => {
  const groups = [{ thing: "AA batteries", options: [strap] }];

  expect(roseState(vault, null, {}, on({ ...saved("options"), fromPhoto: true }))).toMatchObject({
    kind: "options",
    fromPhoto: true,
  });
  expect(roseState(vault, null, {}, on({ ...saved("basket"), groups, fromPhoto: true }))).toMatchObject({
    kind: "basket",
    fromPhoto: true,
  });
  expect(roseState(vault, null, {}, on(saved("options")))).toMatchObject({ kind: "options", fromPhoto: undefined });
});

it("says how many photos Find read and how many showed nothing, on options, groups and the ask screen", () => {
  const groups = [{ thing: "CR2032 coin battery", options: [strap] }];
  const fromPhotos = { fromPhoto: true, photos: 3, blankPhotos: 1 };

  expect(roseState(vault, null, {}, on({ ...saved("options"), ...fromPhotos }))).toMatchObject({
    kind: "options",
    ...fromPhotos,
  });
  expect(roseState(vault, null, {}, on({ ...saved("basket"), groups, ...fromPhotos }))).toMatchObject({
    kind: "basket",
    ...fromPhotos,
  });
  expect(roseState(vault, null, {}, on({ ...saved("nothing in photo"), words: "", fromPhoto: true, photos: 2 }))).toEqual({
    kind: "ask",
    limitCents: 5000,
    words: "",
    photos: 2,
    problem: "nothing in photo",
  });
  expect(roseState(vault, null, {}, on(saved("options")))).toMatchObject({ photos: undefined, blankPhotos: undefined });
});

it("tells Rose a photo showed nothing to buy, or a file wasn't a photo, and keeps Rose's words in the box", () => {
  expect(roseState(vault, null, {}, on({ ...saved("nothing in photo"), words: "size 8", fromPhoto: true }))).toEqual({
    kind: "ask",
    limitCents: 5000,
    words: "size 8",
    problem: "nothing in photo",
  });
  expect(roseState(vault, null, { notPhoto: true }, on())).toEqual({
    kind: "ask",
    limitCents: 5000,
    problem: "not a photo",
  });
  expect(roseState(vault, null, {}, on({ ...saved("retry"), words: "CR2032 coin battery" }))).toEqual({
    kind: "ask",
    limitCents: 5000,
    words: "CR2032 coin battery",
  });
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

const aa = {
  id: "prod_3Ba7aA",
  name: "Amazon Basics 24-Pack AA Alkaline Batteries",
  cents: 999,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B00MNV8E0C",
  reason: "Enough for the remotes and clocks for a long while.",
  thing: "AA batteries",
};
const light = {
  id: "prod_6Nl2tL",
  name: "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack",
  cents: 1249,
  shop: "target.com",
  url: "https://www.target.com/p/A-81532901",
  reason: "They come on by themselves when it gets dark.",
  thing: "a night light",
};
const basket = { id: "basket", name: "2 things", cents: 2248 };
const asked = (status: RequestStatus): PurchaseRequest => ({ ...request(status, basket), lines: [aa, light] });
const trimmed = (status: RequestStatus): PurchaseRequest => ({
  ...request(status, { id: "basket", name: "1 thing", cents: 999 }),
  lines: [aa],
  leftOut: ["a night light"],
});
const trimmedReceipt = {
  item: { id: "basket", name: "1 thing", cents: 999 },
  paidAt: answeredAt,
  transactionId: "7BM91101S1572292D",
  lines: [aa],
  leftOut: ["a night light"],
};

it("shows Rose a group of listings for each thing, with the error after Ask Sam without a pick", () => {
  const groups = [
    { thing: "AA batteries", options: [strap] },
    { thing: "a left-handed teapot for a cat", options: [], problem: "nothing found" as const },
  ];
  const search = { ...saved("basket"), words: "AA batteries and a left-handed teapot for a cat", groups };

  expect(roseState(vault, null, {}, on(search))).toEqual({
    kind: "basket",
    limitCents: 5000,
    words: "AA batteries and a left-handed teapot for a cat",
    groups,
    error: false,
  });
  expect(roseState(vault, null, { pickMissing: true }, on(search))).toMatchObject({ kind: "basket", error: true });
});

it("shows Rose a basket's lines while waiting, on the receipt and under Sam's no", () => {
  expect(roseState(vault, asked("waiting"), {}, on())).toEqual({ kind: "waiting", item: basket, askedAt, lines: [aa, light] });
  expect(roseState(vault, asked("declined"), {}, on())).toEqual({
    kind: "ask",
    limitCents: 5000,
    outcome: { kind: "declined", item: basket, lines: [aa, light] },
  });
  expect(roseState(vault, trimmed("paid"), {}, on())).toEqual({ kind: "paid", receipt: trimmedReceipt });
});

it("puts what Sam left out back in Rose's box when Rose asks for something else", () => {
  expect(roseState(vault, trimmed("paid"), { askAgain: true }, on())).toEqual({
    kind: "ask",
    limitCents: 5000,
    words: "a night light",
  });
  expect(roseState(vault, asked("paid"), { askAgain: true }, on())).toEqual({ kind: "ask", limitCents: 5000 });
});

it("shows Sam a basket's lines to tick, the paid lines, or the outcome", () => {
  expect(samState(asked("waiting"))).toEqual({ kind: "request", item: basket, askedAt, busy: false, lines: [aa, light] });
  expect(samState(trimmed("paying"))).toMatchObject({ kind: "request", busy: true, lines: [aa] });
  expect(samState(trimmed("paid"))).toEqual({ kind: "paid", receipt: trimmedReceipt });
  expect(samState(trimmed("failed"))).toEqual({ kind: "failed", item: trimmedReceipt.item, lines: [aa] });
  expect(samState(asked("declined"))).toEqual({ kind: "nothing", declined: basket, lines: [aa, light] });
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
