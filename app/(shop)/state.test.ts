import { expect, it } from "vitest";
import { ITEMS } from "../../lib/shop/items";
import type { PurchaseRequest, RequestStatus } from "../../lib/shop/requests";
import { roseState, samState } from "./state";

const [glasses, pills, batteries] = ITEMS;
const askedAt = new Date("2026-10-20T10:15:00Z");
const answeredAt = new Date("2026-10-20T10:16:00Z");

function request(status: RequestStatus, item = glasses): PurchaseRequest {
  return {
    id: 12,
    item,
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
