import type { PurchaseRequest, SavedSearch } from "../../lib/shop/requests";
import type { NotifyState } from "./Notify";
import type { RoseState } from "./RoseView";
import type { SamState } from "./SamView";
import type { Receipt } from "./ui";

type RoseParams = { cancelled?: boolean; pickMissing?: boolean; askAgain?: boolean; emptyFind?: boolean };

type SearchOn = { saved: SavedSearch | null; limitCents: number };

export function roseState(
  vault: string | null,
  request: PurchaseRequest | null,
  params: RoseParams,
  search?: SearchOn,
): RoseState {
  if (!vault) return { kind: "not linked", cancelled: params.cancelled ?? false };
  if (!search) return fixedListState(request, params);

  if (request?.status === "waiting" || request?.status === "paying") {
    return { kind: "waiting", item: request.item, askedAt: request.askedAt, shop: request.found?.shop };
  }

  const current = search.saved && (!request || search.saved.searchedAt > request.askedAt) ? search.saved : null;
  const { limitCents } = search;
  if (current?.outcome === "options") {
    return { kind: "options", limitCents, words: current.words, listings: current.options, error: params.pickMissing ?? false };
  }
  if (request?.status === "paid" && !current && !params.askAgain && !params.emptyFind) {
    return { kind: "paid", receipt: receiptOf(request) };
  }
  const outcome =
    !current && (request?.status === "declined" || request?.status === "failed")
      ? { kind: request.status, item: request.item }
      : undefined;
  const problem = params.emptyFind
    ? "empty"
    : current?.outcome === "retry"
      ? undefined
      : current?.outcome;
  return { kind: "ask", limitCents, words: current?.words, outcome, problem };
}

function fixedListState(request: PurchaseRequest | null, params: RoseParams): RoseState {
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
      return {
        kind: "request",
        item: request.item,
        askedAt: request.askedAt,
        busy: request.status === "paying",
        found: request.found ?? undefined,
      };
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

export type NotifyEnv = {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  isIPhone: boolean;
  standalone: boolean;
  permission: "default" | "granted" | "denied";
  subscribed: boolean;
};

// iPhone gives web push only to a page opened from the Home Screen.
export function notifyState(env: NotifyEnv): NotifyState {
  if (env.isIPhone && !env.standalone) return { kind: "home screen first" };
  if (!env.hasServiceWorker || !env.hasPushManager) return { kind: "not supported" };
  if (env.permission === "denied") return { kind: "blocked" };
  if (env.permission === "granted" && env.subscribed) return { kind: "on" };
  return { kind: "off" };
}
