import type { Again, Group, Last, Option, Rebuy } from "../../lib/shop/find";
import type { PurchaseRequest, SavedSearch } from "../../lib/shop/requests";
import type { NotifyState } from "./Notify";
import type { Bought, RoseState } from "./RoseView";
import type { SamState } from "./SamView";
import { listed, type Receipt } from "./ui";

type RoseParams = {
  cancelled?: boolean;
  linked?: boolean;
  pickMissing?: boolean;
  askAgain?: boolean;
  emptyFind?: boolean;
  notPhoto?: boolean;
  // Minutes until a Find stopped for the day works again (D77).
  limitWait?: number;
  over?: string[];
  // Rose's picks in a basket's other groups, back from a group's Find another.
  picked?: string[];
};

// bought are Sam's newest paid asks, for Bought before on the ask screen (D102).
type SearchOn = { saved: SavedSearch | null; limitCents: number; totalCents: number | null; bought?: PurchaseRequest[] };

// What Find another searches. group is the index of a basket's group that it searches alone.
export type AgainOf = { words: string; things: Again[]; group?: number };

export function roseState(
  vault: string | null,
  request: PurchaseRequest | null,
  params: RoseParams,
  search?: SearchOn,
): RoseState {
  if (!vault) return { kind: "not linked", cancelled: params.cancelled ?? false };
  if (!search) return fixedListState(request, params);

  if (request?.status === "waiting" || request?.status === "paying") {
    return {
      kind: "waiting",
      item: request.item,
      askedAt: request.askedAt,
      shop: request.found?.shop,
      lines: request.lines ?? undefined,
    };
  }

  const current = currentOf(search.saved, request);
  const { limitCents } = search;
  const totalCents = search.totalCents ?? undefined;
  const tried = current?.tried || undefined;
  const stopped = params.limitWait !== undefined && params.limitWait > 0;
  // A search that found nothing under Sam's limit shows the listings over it that fit (D110).
  if (current?.outcome === "options" || (current?.outcome === "over limit" && current.options.length)) {
    const over = overOf([current.options.find(({ id }) => id === params.over?.[0])], totalCents);
    return {
      kind: "options",
      limitCents,
      totalCents,
      words: current.words,
      fromPhoto: current.fromPhoto || undefined,
      photos: current.photos || undefined,
      blankPhotos: current.blankPhotos || undefined,
      listings: current.options,
      error: params.pickMissing ?? false,
      picked: over?.ids[0] ?? lastPick(current.last, current.options),
      overCents: over?.cents,
      tried,
      last: current.last ?? undefined,
      overLimit: current.outcome === "over limit" || undefined,
      ...(stopped && { waitMinutes: params.limitWait }),
    };
  }
  if (current?.outcome === "basket") {
    const over = overOf(
      current.groups.map(({ options }, index) => options.find(({ id }) => id === params.over?.[index])),
      totalCents,
    );
    return {
      kind: "basket",
      limitCents,
      totalCents,
      words: current.words,
      fromPhoto: current.fromPhoto || undefined,
      photos: current.photos || undefined,
      blankPhotos: current.blankPhotos || undefined,
      groups: current.groups,
      error: params.pickMissing ?? false,
      picked: over?.ids ?? pickedOf(current.groups, params.picked) ?? lastPicks(current.groups),
      overCents: over?.cents,
      tried,
      ...(stopped && { waitMinutes: params.limitWait }),
    };
  }
  if (request?.status === "paid" && !current && !params.askAgain && !params.emptyFind) {
    return { kind: "paid", receipt: receiptOf(request), ...(stopped && { waitMinutes: params.limitWait }) };
  }
  const outcome =
    !current && (request?.status === "declined" || request?.status === "failed")
      ? { kind: request.status, item: request.item, lines: request.lines ?? undefined }
      : undefined;
  // What Sam left out goes back in Rose's box for the next ask.
  const leftOut = request?.status === "paid" && params.askAgain && request.leftOut;
  // A stopped Find another saves nothing, so its empty search and its Find another stay (D101).
  const problem = params.emptyFind
    ? "empty"
    : params.notPhoto
      ? "not a photo"
      : stopped && !emptyOf(current)
        ? "limit"
        : current?.outcome === "retry"
          ? undefined
          : current?.outcome;
  return {
    kind: "ask",
    linked: params.linked || undefined,
    limitCents,
    totalCents,
    words: current?.words ?? (leftOut ? listed(leftOut) : undefined),
    photos: current?.photos || undefined,
    outcome,
    problem,
    tried,
    ...(stopped && { waitMinutes: params.limitWait }),
    bought: search.bought?.length ? search.bought.map(boughtOf) : undefined,
  };
}

// Rose's page shows the saved search while it's newer than the latest ask.
function currentOf(saved: SavedSearch | null, request: PurchaseRequest | null): SavedSearch | null {
  return saved && (!request || saved.searchedAt > request.askedAt) ? saved : null;
}

// A search that found nothing, which Find another hasn't run yet.
function emptyOf(current: SavedSearch | null): boolean {
  return (current?.outcome === "nothing found" || current?.outcome === "over limit") && !current.tried;
}

// What Find another searches, from Neon only (D23), by the rule that picks the screen Rose sees. Null when
// that screen offers none: one for each empty Find, No or untick (D97), without what Sam refused (D98).
export function againOf(saved: SavedSearch | null, request: PurchaseRequest | null, group?: number): AgainOf | null {
  if (request?.status === "waiting" || request?.status === "paying") return null;
  const current = currentOf(saved, request);
  if (group !== undefined) {
    const empty = current?.outcome === "basket" ? current.groups[group] : undefined;
    if (!current || !empty?.problem || empty.tried) return null;
    return { words: current.words, things: [{ words: empty.thing, query: empty.query ?? empty.thing, refused: [] }], group };
  }
  if (current) {
    if (!emptyOf(current)) return null;
    // A basket whose every group found nothing searches each thing again, in a call of its own (D99).
    const things = current.groups.length
      ? current.groups.map(({ thing, query }) => ({ words: thing, query: query ?? thing, refused: [] }))
      : [{ words: current.words, query: current.query ?? current.words, refused: [] }];
    return { words: current.words, things };
  }
  const picks = request ? refusedOf(request) : [];
  if (!picks.length) return null;
  const refused = picks.flatMap(({ id }) => (id ? [id] : []));
  return {
    words: listed(picks.map(({ thing }) => thing)),
    things: picks.map(({ thing, query }) => ({ words: thing, query, refused })),
  };
}

// The picks Sam said no to, or left out. An ask from before queries were kept falls back to its lines'
// things, its item's name, or the things Sam left out, whose listings it no longer knows.
function refusedOf(request: PurchaseRequest): { id?: string; thing: string; query: string }[] {
  if (request.status === "declined") {
    if (request.queries) return request.queries;
    if (request.lines) return request.lines.map(({ id, thing }) => ({ id, thing, query: thing }));
    return [{ id: request.item.id, thing: request.item.name, query: request.item.name }];
  }
  if (request.status === "paid" && request.leftOut) {
    if (request.queries) return request.queries.filter(({ id }) => !request.lines?.some((line) => line.id === id));
    return request.leftOut.map((thing) => ({ thing, query: thing }));
  }
  return [];
}

// What Ask again searches for a paid ask, from Neon only (D23): only what Sam paid for (D102), each with its
// last query and the listing Sam paid for (D105). An ask from before queries were kept searches its lines'
// things, or its item's name. An ask from the fixed list has no listing to look for.
export function rebuyOf(request: PurchaseRequest): { words: string; things: Rebuy[] } | null {
  if (request.status !== "paid") return null;
  const picked = (id: string) => request.queries?.find((pick) => pick.id === id);
  if (request.lines) {
    const things = request.lines.map(({ id, name, cents, shop, thing }) => ({
      words: thing,
      query: picked(id)?.query ?? thing,
      last: { id, name, cents, shop },
    }));
    return { words: listed(things.map(({ words }) => words)), things };
  }
  if (!request.found) return null;
  const { id, name, cents } = request.item;
  const words = picked(id)?.thing ?? name;
  return { words, things: [{ words, query: picked(id)?.query ?? name, last: { id, name, cents, shop: request.found.shop } }] };
}

function boughtOf({ id, item, lines, answeredAt, askedAt }: PurchaseRequest): Bought {
  return { id, item, lines: lines ?? undefined, paidAt: answeredAt ?? askedAt };
}

// Last time's listing is picked for Rose when today's options have it (D104).
function lastPick(last: Last | null | undefined, options: Option[]): string | undefined {
  return options.find(({ id }) => id === last?.id)?.id;
}

function lastPicks(groups: Group[]) {
  return groups.some(({ last }) => last) ? groups.map(({ last, options }) => lastPick(last, options)) : undefined;
}

// Rose's picks back from a group's Find another, each while it's still in its own group (D36).
function pickedOf(groups: Group[], picked: string[] | undefined) {
  return picked && groups.map(({ options }, index) => options.find(({ id }) => id === picked[index])?.id);
}

// The picks Ask Sam sent back for going over Sam's total limit, one place per group, while their
// saved prices still do (D36). A listing picked in two groups counts once, as in askSam.
function overOf(picks: (Option | undefined)[], totalCents: number | undefined) {
  const prices = new Map(picks.flatMap((option) => (option ? [[option.id, option.cents] as const] : [])));
  const cents = [...prices.values()].reduce((sum, price) => sum + price, 0);
  if (totalCents === undefined || cents <= totalCents) return undefined;
  return { ids: picks.map((option) => option?.id ?? ""), cents };
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

// Sam's limit as Sam has it now, so Sam's page says how far over it the ask is (D109).
export function samState(request: PurchaseRequest | null, limitCents?: number): SamState {
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
        lines: request.lines ?? undefined,
        limitCents,
      };
    case "paid":
      return { kind: "paid", receipt: receiptOf(request) };
    case "failed":
      return { kind: "failed", item: request.item, lines: request.lines ?? undefined };
    case "declined":
      return { kind: "nothing", declined: request.item, lines: request.lines ?? undefined };
  }
}

function receiptOf(request: PurchaseRequest): Receipt {
  return {
    item: request.item,
    paidAt: request.answeredAt ?? request.askedAt,
    transactionId: request.captureId ?? "",
    lines: request.lines ?? undefined,
    leftOut: request.leftOut ?? undefined,
  };
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
