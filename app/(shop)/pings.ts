import { after } from "next/server";
import { things, type Item } from "../../lib/shop/items";
import type { PayResult } from "../../lib/shop/pay";
import type { Person } from "../../lib/shop/people";
import { notify } from "../../lib/shop/push";
import type { Line, PurchaseRequest } from "../../lib/shop/requests";
import { HELPER, listed, money, RELATIVE } from "./ui";

export type PingKind = "asked" | "paid" | "declined" | "failed" | "options again" | "nothing again";

// A request, or what Rose just asked for: a basket has lines.
type Subject = { item: Item; lines?: Line[] | null; leftOut?: string[] | null };

// The item goes in the text, not the title: Android shows one line of title.
export function ping(kind: PingKind, { item, lines, leftOut }: Subject): { to: Person; title: string; body: string } {
  const count = lines && things(lines.length);
  switch (kind) {
    case "asked":
      return count
        ? {
            to: "sam",
            title: `${RELATIVE} would like ${count}`,
            body: `${money(item.cents)} in total. Tap to see them and say OK or No.`,
          }
        : {
            to: "sam",
            title: `${RELATIVE} would like something`,
            body: `${item.name}, ${money(item.cents)}. Tap to see it and say OK or No.`,
          };
    case "paid":
      return {
        to: "rose",
        title: `${HELPER} said OK`,
        body: `${
          leftOut
            ? `${HELPER} paid ${money(item.cents)} for ${count} and left out ${listed(leftOut)}.`
            : count
              ? `Your ${count} are paid: ${money(item.cents)}.`
              : `${item.name} is paid: ${money(item.cents)}.`
        } Tap to see the receipt.`,
      };
    case "declined":
      return {
        to: "rose",
        title: `${HELPER} said no`,
        body: `${HELPER} said no to ${count ? `your ${count}` : item.name}. Nothing was taken.`,
      };
    case "failed":
      return {
        to: "rose",
        title: "Payment didn't go through",
        body: `${HELPER} said OK, but the payment didn't go through. Nothing was taken.`,
      };
    // How Sam's Find another ended, since Rose didn't tap it (D114).
    case "options again":
      return { to: "rose", title: `${HELPER} asked KinCart to look again`, body: "New options are ready. Tap to pick one." };
    case "nothing again":
      return {
        to: "rose",
        title: `${HELPER} asked KinCart to look again`,
        body: "KinCart found nothing this time. Tap to try different words.",
      };
  }
}

// Sent once the response is out, so a slow push service never holds Rose's or Sam's tap (D29).
export function sendPing(household: number, kind: PingKind, subject: Subject): void {
  const { to, title, body } = ping(kind, subject);
  after(() => notify(household, to, { title, body }));
}

// An unknown charge sends nothing; Rose hears once the stuck-payment check settles it.
export function sendPayment(result: PayResult, request: PurchaseRequest): void {
  if (result === "paid") sendPing(request.household, "paid", request);
  if (result === "refused") sendPing(request.household, "failed", request);
}
