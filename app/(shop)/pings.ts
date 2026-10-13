import { after } from "next/server";
import type { Item } from "../../lib/shop/items";
import type { PayResult } from "../../lib/shop/pay";
import type { Person } from "../../lib/shop/people";
import { notify } from "../../lib/shop/push";
import { HELPER, money, RELATIVE } from "./ui";

export type PingKind = "asked" | "paid" | "declined" | "failed";

// The item goes in the text, not the title: Android shows one line of title.
export function ping(kind: PingKind, item: Item): { to: Person; title: string; body: string } {
  switch (kind) {
    case "asked":
      return {
        to: "sam",
        title: `${RELATIVE} would like something`,
        body: `${item.name}, ${money(item.cents)}. Tap to see it and say OK or No.`,
      };
    case "paid":
      return {
        to: "rose",
        title: `${HELPER} said OK`,
        body: `${item.name} is paid: ${money(item.cents)}. Tap to see the receipt.`,
      };
    case "declined":
      return { to: "rose", title: `${HELPER} said no`, body: `${HELPER} said no to ${item.name}. Nothing was taken.` };
    case "failed":
      return {
        to: "rose",
        title: "Payment didn't go through",
        body: `${HELPER} said OK, but the payment didn't go through. Nothing was taken.`,
      };
  }
}

// Sent once the response is out, so a slow push service never holds Rose's or Sam's tap (D29).
export function sendPing(kind: PingKind, item: Item): void {
  const { to, title, body } = ping(kind, item);
  after(() => notify(to, { title, body }));
}

// An unknown charge sends nothing; Rose hears once the stuck-payment check settles it.
export function sendPayment(result: PayResult, item: Item): void {
  if (result === "paid") sendPing("paid", item);
  if (result === "refused") sendPing("failed", item);
}
