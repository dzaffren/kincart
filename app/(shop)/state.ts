import type { PurchaseRequest } from "../../lib/shop/requests";
import type { RoseState } from "./RoseView";
import type { SamState } from "./SamView";
import type { Receipt } from "./ui";

type RoseParams = { cancelled?: boolean; pickMissing?: boolean; askAgain?: boolean };

export function roseState(vault: string | null, request: PurchaseRequest | null, params: RoseParams): RoseState {
  if (!vault) return { kind: "not linked", cancelled: params.cancelled ?? false };

  const pick: RoseState = { kind: "pick", error: params.pickMissing ?? false };
  if (!request) return pick;
  switch (request.status) {
    case "waiting":
    case "paying":
      return { kind: "waiting", item: request.item, askedAt: request.askedAt };
    case "paid":
      return params.askAgain || params.pickMissing ? pick : { kind: "paid", receipt: receiptOf(request) };
    case "declined":
      return { ...pick, outcome: { kind: "declined", item: request.item } };
    case "failed":
      return { ...pick, outcome: { kind: "failed", item: request.item } };
  }
}

export function samState(request: PurchaseRequest | null): SamState {
  if (!request) return { kind: "nothing" };
  switch (request.status) {
    case "waiting":
    case "paying":
      return { kind: "request", item: request.item, askedAt: request.askedAt, busy: request.status === "paying" };
    case "paid":
      return { kind: "paid", receipt: receiptOf(request) };
    case "failed":
      return { kind: "failed", item: request.item };
    case "declined":
      return { kind: "nothing", declined: request.item };
  }
}

function receiptOf(request: PurchaseRequest): Receipt {
  return { item: request.item, paidAt: request.answeredAt ?? request.askedAt, transactionId: request.captureId ?? "" };
}
